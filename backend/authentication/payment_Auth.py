import asyncio
import base64
import hashlib
import hmac
import json
import os
import re
import time
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any
from urllib.parse import urlsplit

import requests
from flask import Blueprint, current_app, jsonify, request, session
from prisma import Prisma


PAYMONGO_PAYMENT_INTENTS_URL = "https://api.paymongo.com/v1/payment_intents"
payment_webhook = Blueprint("payment_webhook", __name__)


def _payment_mode() -> str:
    default_mode = "live" if os.getenv("APP_ENV") == "production" else "test"
    mode = os.getenv("PAYMONGO_MODE", default_mode).strip().lower()
    if mode not in {"test", "live"}:
        raise RuntimeError("PAYMONGO_MODE must be either test or live")
    return mode


def _mode_setting(mode: str, suffix: str) -> str:
    if mode not in {"test", "live"}:
        raise ValueError("Payment environment must be test or live")
    return f"PAYMONGO_{mode.upper()}_{suffix}"


def _paymongo_headers(mode: str) -> dict[str, str]:
    secret_key = os.getenv(_mode_setting(mode, "SECRET_KEY"), "").strip()
    if not secret_key:
        raise RuntimeError(
            f"{_mode_setting(mode, 'SECRET_KEY')} must be configured"
        )
    if not secret_key.startswith(f"sk_{mode}_"):
        raise RuntimeError(
            f"{_mode_setting(mode, 'SECRET_KEY')} must be a {mode}-mode secret key"
        )

    credentials = base64.b64encode(f"{secret_key}:".encode("utf-8")).decode("ascii")
    return {
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
    }


def _payment_public_key(mode: str) -> str:
    public_key = os.getenv(_mode_setting(mode, "PUBLIC_KEY"), "").strip()
    if not public_key:
        raise RuntimeError(
            f"{_mode_setting(mode, 'PUBLIC_KEY')} must be configured"
        )
    if not public_key.startswith(f"pk_{mode}_"):
        raise RuntimeError(
            f"{_mode_setting(mode, 'PUBLIC_KEY')} must be a {mode}-mode public key"
        )
    return public_key


def _is_allowed_return_url(value: str) -> bool:
    parsed = urlsplit(value)
    if not parsed.scheme or not parsed.netloc or parsed.username or parsed.password:
        return False
    app_environment = os.getenv("APP_ENV", "").strip().lower()
    if parsed.scheme != "https" and not (
        app_environment == "development"
        and parsed.scheme == "http"
        and parsed.hostname in {"localhost", "127.0.0.1"}
    ):
        return False
    default_origins = (
        "http://localhost:5500,http://127.0.0.1:5500"
        if app_environment == "development"
        else ""
    )
    configured_origins = os.getenv("FRONTEND_ORIGINS", "").strip() or default_origins
    origins = {
        origin.strip()
        for origin in configured_origins.split(",")
        if origin.strip()
    }
    return f"{parsed.scheme}://{parsed.netloc}" in origins


def _verify_payment_intent(
    payment_intent: Any,
    expected_intent_id: str,
    order: Any,
    authenticated_customer_id: int,
    mode: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    if not isinstance(payment_intent, dict):
        raise ValueError("PayMongo returned an invalid payment intent")
    if payment_intent.get("id") != expected_intent_id:
        raise ValueError("PayMongo returned a different payment intent")

    attributes = payment_intent.get("attributes")
    if not isinstance(attributes, dict):
        raise ValueError("PayMongo returned an invalid payment intent")

    metadata = attributes.get("metadata")
    if not isinstance(metadata, dict) or (
        metadata.get("order_id") != str(order.id)
        or metadata.get("customer_id") != str(authenticated_customer_id)
        or metadata.get("payment_mode") != mode
    ):
        raise ValueError("Payment intent does not match this order and environment")

    try:
        expected_amount = int(
            (Decimal(str(order.totalAmount)) * 100).quantize(
                Decimal("1"),
                rounding=ROUND_HALF_UP,
            )
        )
    except (InvalidOperation, TypeError, ValueError) as error:
        raise ValueError("The order has an invalid total amount") from error

    if (
        attributes.get("amount") != expected_amount
        or str(attributes.get("currency", "")).upper() != "PHP"
    ):
        raise ValueError("Payment intent amount or currency does not match the order")

    return payment_intent, attributes


async def _get_verified_payment_intent(
    payment_intent_id: str,
    order: Any,
    authenticated_customer_id: int,
    mode: str,
    headers: dict[str, str],
) -> tuple[dict[str, Any], dict[str, Any]]:
    response = await asyncio.to_thread(
        requests.get,
        f"{PAYMONGO_PAYMENT_INTENTS_URL}/{payment_intent_id}",
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()
    return _verify_payment_intent(
        response.json().get("data"),
        payment_intent_id,
        order,
        authenticated_customer_id,
        mode,
    )


async def _mark_order_paid(
    db: Prisma,
    order: Any,
    authenticated_customer_id: int,
) -> None:
    if order.paymentStatus == "completed":
        return

    result = await db.order.update_many(
        where={
            "id": order.id,
            "customerId": authenticated_customer_id,
            "paymentStatus": {"in": ["pending", "failed"]},
            "status": {"not": "cancelled"},
        },
        data={"paymentStatus": "completed"},
    )
    if result == 0:
        current_order = await db.order.find_first(
            where={
                "id": order.id,
                "customerId": authenticated_customer_id,
            }
        )
        if current_order is None or current_order.paymentStatus != "completed":
            raise ValueError("Order is no longer eligible to be marked as paid")


def _intent_payment_details(
    attributes: dict[str, Any],
    fallback_method: str | None,
) -> tuple[str | None, str | None]:
    payments = attributes.get("payments")
    payment_id = None
    payment_method = attributes.get("payment_method_used")
    if isinstance(payments, list) and payments:
        payment = payments[0]
        if isinstance(payment, dict):
            payment_id = payment.get("id")
            payment_attributes = payment.get("attributes")
            if isinstance(payment_attributes, dict):
                payment_method = (
                    payment_attributes.get("payment_method_used")
                    or payment_method
                )
    if not isinstance(payment_id, str):
        payment_id = None
    if not isinstance(payment_method, str):
        payment_method = fallback_method
    return payment_id, payment_method


def _payment_status_for_intent(
    intent_status: str,
    attributes: dict[str, Any],
    event_type: str | None = None,
) -> str:
    if intent_status == "succeeded":
        return "completed"
    if (
        intent_status in {"failed", "canceled"}
        or event_type == "payment.failed"
        or attributes.get("last_payment_error")
    ):
        return "failed"
    return "pending"


async def _persist_payment_state(
    db: Prisma,
    order: Any,
    payment_intent: dict[str, Any],
    attributes: dict[str, Any],
    mode: str,
    event_type: str | None = None,
) -> str:
    intent_id = payment_intent["id"]
    intent_status = attributes.get("status")
    if not isinstance(intent_status, str):
        raise ValueError("PayMongo returned a payment intent without a status")

    payment_id, payment_method = _intent_payment_details(
        attributes,
        order.paymentMethod,
    )
    state = _payment_status_for_intent(intent_status, attributes, event_type)
    attempt_data = {
        "providerPaymentId": payment_id,
        "status": intent_status,
        "amount": Decimal(str(order.totalAmount)),
        "currency": str(attributes.get("currency", "PHP")).upper(),
        "paymentMethod": payment_method,
        "lastEventType": event_type,
    }
    async with db.tx() as transaction:
        current_attempt = await transaction.paymentattempt.find_unique(
            where={"paymentIntentId": intent_id}
        )
        if current_attempt is not None and current_attempt.status == "succeeded":
            state = "completed"
            attempt_data["status"] = "succeeded"
            attempt_data["providerPaymentId"] = (
                attempt_data["providerPaymentId"]
                or current_attempt.providerPaymentId
            )
        await transaction.paymentattempt.upsert(
            where={"paymentIntentId": intent_id},
            data={
                "create": {
                    "order": {"connect": {"id": order.id}},
                    "environment": mode,
                    "paymentIntentId": intent_id,
                    **attempt_data,
                },
                "update": {
                    "environment": mode,
                    **attempt_data,
                },
            },
        )

        if order.paymentStatus != "completed" or state == "completed":
            await transaction.order.update_many(
                where={
                    "id": order.id,
                    "paymentIntentId": intent_id,
                },
                data={
                    "paymentEnvironment": mode,
                    "paymentStatus": state,
                    "paymentMethod": payment_method or order.paymentMethod,
                },
            )
    return intent_status


def _payment_intent_id_from_event(event: Any) -> str | None:
    if not isinstance(event, dict):
        return None
    event_data = event.get("data")
    if not isinstance(event_data, dict):
        return None
    event_attributes = event_data.get("attributes")
    if not isinstance(event_attributes, dict):
        return None

    payment_intent_id = event_attributes.get("payment_intent_id")
    if not payment_intent_id:
        payment = event_attributes.get("data")
        if isinstance(payment, dict):
            payment_attributes = payment.get("attributes")
            if isinstance(payment_attributes, dict):
                payment_intent_id = payment_attributes.get("payment_intent_id")

    if not isinstance(payment_intent_id, str) or not re.fullmatch(
        r"[A-Za-z0-9_-]+",
        payment_intent_id,
    ):
        return None
    return payment_intent_id


async def _handle_payment_webhook(
    event: dict[str, Any],
    mode: str,
) -> dict[str, Any]:
    event_data = event.get("data")
    event_attributes = (
        event_data.get("attributes") if isinstance(event_data, dict) else None
    )
    event_type = (
        event_attributes.get("type")
        if isinstance(event_attributes, dict)
        else None
    )
    if event_type not in {"payment.paid", "payment.failed"}:
        return {"received": True, "processed": False}

    payment_intent_id = _payment_intent_id_from_event(event)
    if payment_intent_id is None:
        raise ValueError("Webhook event is missing a valid payment intent ID")

    db = Prisma()
    await db.connect()
    try:
        order = await db.order.find_first(
            where={"paymentIntentId": payment_intent_id}
        )
        if order is None:
            raise RuntimeError("No order is associated with this payment intent")
        if order.paymentEnvironment != mode:
            raise ValueError("Webhook environment does not match the stored payment")

        payment_intent, attributes = await _get_verified_payment_intent(
            payment_intent_id,
            order,
            order.customerId,
            mode,
            _paymongo_headers(mode),
        )
        intent_status = attributes.get("status")

        if event_type == "payment.paid":
            if intent_status != "succeeded":
                raise RuntimeError(
                    "PayMongo sent payment.paid for an intent not marked succeeded"
                )
            await _mark_order_paid(db, order, order.customerId)
        elif event_type == "payment.failed" and intent_status != "succeeded":
            await db.order.update_many(
                where={
                    "id": order.id,
                    "paymentIntentId": payment_intent_id,
                    "paymentStatus": "pending",
                    "status": {"not": "cancelled"},
                },
                data={"paymentStatus": "failed"},
            )
        await _persist_payment_state(
            db,
            order,
            payment_intent,
            attributes,
            mode,
            event_type,
        )

        return {
            "received": True,
            "processed": True,
            "payment_intent_id": payment_intent.get("id"),
            "payment_intent_status": intent_status,
        }
    finally:
        if db.is_connected():
            await db.disconnect()


def _verify_webhook_signature(raw_body: bytes, mode: str) -> bool:
    webhook_secret = os.getenv(_mode_setting(mode, "WEBHOOK_SECRET"))
    if not webhook_secret:
        raise RuntimeError(
            f"{_mode_setting(mode, 'WEBHOOK_SECRET')} must be configured"
        )
    signature_parts = {}
    for part in request.headers.get("X-Paymongo-Signature", "").split(","):
        key, separator, value = part.strip().partition("=")
        if separator:
            signature_parts[key] = value
    timestamp = signature_parts.get("t")
    signature = signature_parts.get("te" if mode == "test" else "li")
    if not timestamp or not signature or not timestamp.isdecimal():
        return False
    if abs(time.time() - int(timestamp)) > 300:
        return False
    expected_signature = hmac.new(
        webhook_secret.encode("utf-8"),
        timestamp.encode("ascii") + b"." + raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(signature, expected_signature)


@payment_webhook.route("/webhooks/paymongo", methods=["POST"])
def paymongo_webhook():
    try:
        mode = _payment_mode()
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 500
    return _receive_paymongo_webhook(mode)


@payment_webhook.route("/webhooks/paymongo/<mode>", methods=["POST"])
def paymongo_webhook_for_mode(mode: str):
    if mode not in {"test", "live"}:
        return jsonify({"error": "Payment environment must be test or live"}), 404
    return _receive_paymongo_webhook(mode)


def _receive_paymongo_webhook(mode: str):
    raw_body = request.get_data(cache=False)
    try:
        signature_valid = _verify_webhook_signature(raw_body, mode)
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 500
    if not signature_valid:
        return jsonify({"error": "Invalid webhook signature"}), 401

    try:
        event = json.loads(raw_body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return jsonify({"error": "Invalid JSON payload"}), 400
    if not isinstance(event, dict):
        return jsonify({"error": "Invalid webhook event"}), 400

    try:
        result = asyncio.run(_handle_payment_webhook(event, mode))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except requests.RequestException:
        current_app.logger.exception("Could not verify PayMongo webhook payment")
        return jsonify({"error": "Could not verify payment with PayMongo"}), 502
    except Exception:
        current_app.logger.exception("Could not persist PayMongo webhook payment")
        return jsonify({"error": "Could not record PayMongo payment"}), 500

    return jsonify(result), 200


async def create_payment_intent(
    order_id: int,
    authenticated_customer_id: int,
) -> dict[str, Any]:
    """Create a PayMongo payment intent for one of the customer's pending orders."""
    db = Prisma()
    await db.connect()
    try:
        order = await db.order.find_first(
            where={
                "id": order_id,
                "customerId": authenticated_customer_id,
            }
        )
        if order is None:
            raise ValueError("Order was not found for this customer")
        if order.status == "cancelled":
            raise ValueError("Only pending, non-cancelled orders can be paid")
        if order.paymentMethod not in {"gcash", "maya", "card"}:
            raise ValueError("This order does not use a PayMongo payment method")

        mode = order.paymentEnvironment or _payment_mode()
        headers = _paymongo_headers(mode)
        if order.paymentIntentId:
            payment_intent, attributes = await _get_verified_payment_intent(
                order.paymentIntentId,
                order,
                authenticated_customer_id,
                mode,
                headers,
            )
            await _persist_payment_state(
                db,
                order,
                payment_intent,
                attributes,
                mode,
            )
            return {"data": payment_intent}
        if order.paymentStatus not in {"pending", "failed"}:
            raise ValueError("Only unpaid orders can receive a payment intent")

        try:
            amount = Decimal(str(order.totalAmount))
        except (InvalidOperation, TypeError, ValueError) as error:
            raise ValueError("The order has an invalid total amount") from error
        if not amount.is_finite() or amount <= 0:
            raise ValueError("The order total must be greater than zero")

        amount_in_centavos = int(
            (amount * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        )
        if amount_in_centavos < 1:
            raise ValueError("The order total is below the minimum payable amount")

        payload = {
            "data": {
                "attributes": {
                    "amount": amount_in_centavos,
                    "currency": "PHP",
                    "payment_method_allowed": [
                        "card",
                        "paymaya",
                        "grab_pay",
                        "gcash",
                    ],
                    "description": f"Payment for order #{order.id}",
                    "metadata": {
                        "order_id": str(order.id),
                        "customer_id": str(authenticated_customer_id),
                        "payment_mode": mode,
                    },
                }
            }
        }

        claim = await db.order.update_many(
            where={
                "id": order.id,
                "customerId": authenticated_customer_id,
                "paymentStatus": {"in": ["pending", "failed"]},
                "paymentIntentId": None,
                "paymentIntentCreating": False,
                "status": {"not": "cancelled"},
            },
            data={
                "paymentIntentCreating": True,
                "paymentStatus": "pending",
                "paymentEnvironment": mode,
            },
        )
        if claim == 0:
            current_order = await db.order.find_first(
                where={
                    "id": order.id,
                    "customerId": authenticated_customer_id,
                }
            )
            if current_order is not None and current_order.paymentIntentId:
                existing_mode = current_order.paymentEnvironment or mode
                payment_intent, attributes = await _get_verified_payment_intent(
                    current_order.paymentIntentId,
                    current_order,
                    authenticated_customer_id,
                    existing_mode,
                    _paymongo_headers(existing_mode),
                )
                await _persist_payment_state(
                    db,
                    current_order,
                    payment_intent,
                    attributes,
                    existing_mode,
                )
                return {"data": payment_intent}
            raise RuntimeError("Payment intent creation is already in progress")

        response = await asyncio.to_thread(
            requests.post,
            PAYMONGO_PAYMENT_INTENTS_URL,
            headers=headers,
            json=payload,
            timeout=30,
        )
        if response.status_code >= 400:
            if response.status_code < 500:
                await db.order.update_many(
                    where={
                        "id": order.id,
                        "paymentIntentCreating": True,
                        "paymentIntentId": None,
                    },
                    data={"paymentIntentCreating": False},
                )
            response.raise_for_status()

        response_body = response.json()
        payment_intent = (
            response_body.get("data") if isinstance(response_body, dict) else None
        )
        if (
            not isinstance(payment_intent, dict)
            or not isinstance(payment_intent.get("id"), str)
            or not re.fullmatch(r"[A-Za-z0-9_-]+", payment_intent["id"])
        ):
            raise ValueError("PayMongo returned an invalid payment intent")
        _verify_payment_intent(
            payment_intent,
            payment_intent["id"],
            order,
            authenticated_customer_id,
            mode,
        )

        saved = await db.order.update_many(
            where={
                "id": order.id,
                "paymentIntentCreating": True,
                "paymentIntentId": None,
            },
            data={
                "paymentIntentId": payment_intent["id"],
                "paymentEnvironment": mode,
                "paymentIntentCreating": False,
            },
        )
        if saved != 1:
            raise RuntimeError("Could not save the payment intent for this order")
        _, attributes = _verify_payment_intent(
            payment_intent,
            payment_intent["id"],
            order,
            authenticated_customer_id,
            mode,
        )
        await _persist_payment_state(
            db,
            order,
            payment_intent,
            attributes,
            mode,
        )
        return response_body
    finally:
        if db.is_connected():
            await db.disconnect()


async def process_payment(
    order_id: int,
    authenticated_customer_id: int,
    payment_intent_id: str,
    payment_method_id: str,
    return_url: str | None = None,
) -> dict[str, Any]:
    """Attach and process a payment method, then report the verified intent status."""
    if (
        not re.fullmatch(r"[A-Za-z0-9_-]+", payment_intent_id)
        or not re.fullmatch(r"pm_[A-Za-z0-9]+", payment_method_id)
    ):
        raise ValueError("Payment intent and payment method are required")

    db = Prisma()
    await db.connect()
    try:
        order = await db.order.find_first(
            where={
                "id": order_id,
                "customerId": authenticated_customer_id,
            }
        )
        if order is None:
            raise ValueError("Order was not found for this customer")
        if (
            order.paymentStatus not in {"pending", "failed"}
            or order.status == "cancelled"
        ):
            raise ValueError("Only pending, non-cancelled orders can be paid")
        if order.paymentIntentId != payment_intent_id:
            raise ValueError("Payment intent is not the one stored for this order")
        mode = order.paymentEnvironment
        if mode not in {"test", "live"}:
            raise ValueError("Payment environment is not recorded for this order")

        headers = _paymongo_headers(mode)
        _, intent_attributes = await _get_verified_payment_intent(
            payment_intent_id,
            order,
            authenticated_customer_id,
            mode,
            headers,
        )
        client_key = intent_attributes.get("client_key")
        if not isinstance(client_key, str) or not client_key:
            raise ValueError("PayMongo payment intent is missing its client key")

        attach_attributes: dict[str, str] = {
            "payment_method": payment_method_id,
            "client_key": client_key,
        }
        if return_url:
            attach_attributes["return_url"] = return_url

        attach_response = await asyncio.to_thread(
            requests.post,
            f"{PAYMONGO_PAYMENT_INTENTS_URL}/{payment_intent_id}/attach",
            headers=headers,
            json={"data": {"attributes": attach_attributes}},
            timeout=30,
        )
        attach_response.raise_for_status()

        payment_intent, attributes = await _get_verified_payment_intent(
            payment_intent_id,
            order,
            authenticated_customer_id,
            mode,
            headers,
        )
        intent_status = await _persist_payment_state(
            db,
            order,
            payment_intent,
            attributes,
            mode,
        )

        return {
            "order_id": order.id,
            "payment_intent_id": payment_intent.get("id"),
            "payment_environment": mode,
            "payment_intent_status": intent_status,
            "payment_status": (
                "completed"
                if order.paymentStatus == "completed"
                else _payment_status_for_intent(intent_status, attributes)
            ),
            "next_action": attributes.get("next_action"),
        }
    finally:
        if db.is_connected():
            await db.disconnect()


def _customer_identity(write: bool = False):
    identity = session.get("identity")
    if not isinstance(identity, dict) or identity.get("role") != "customer":
        return None, (jsonify({"error": "Customer authentication required"}), 401)
    if write:
        expected = session.get("csrf_token")
        provided = request.headers.get("X-CSRF-Token")
        if (
            not isinstance(expected, str)
            or not isinstance(provided, str)
            or not hmac.compare_digest(expected, provided)
        ):
            return None, (jsonify({"error": "Invalid CSRF token"}), 403)
    return identity, None


def _public_payment_intent(payment_intent: dict[str, Any]) -> dict[str, Any]:
    attributes = payment_intent.get("attributes")
    if not isinstance(attributes, dict):
        raise ValueError("PayMongo returned an invalid payment intent")
    return {
        "id": payment_intent["id"],
        "client_key": attributes.get("client_key"),
        "status": attributes.get("status"),
        "amount": attributes.get("amount"),
        "currency": attributes.get("currency"),
        "next_action": attributes.get("next_action"),
        "payment_method_allowed": attributes.get("payment_method_allowed"),
    }


@payment_webhook.get("/api/v1/customer/payment-config")
def customer_payment_config():
    _, error = _customer_identity()
    if error:
        return error
    try:
        mode = _payment_mode()
        return jsonify({
            "environment": mode,
            "publicKey": _payment_public_key(mode),
        })
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 503


@payment_webhook.post("/api/v1/customer/orders/<int:order_id>/payment-intent")
def customer_create_payment_intent(order_id: int):
    identity, error = _customer_identity(write=True)
    if error:
        return error
    try:
        result = asyncio.run(create_payment_intent(order_id, identity["id"]))
        payment_intent = result.get("data")
        if not isinstance(payment_intent, dict):
            raise ValueError("PayMongo returned an invalid payment intent")
        attributes = payment_intent.get("attributes")
        mode = (
            attributes.get("metadata", {}).get("payment_mode")
            if isinstance(attributes, dict)
            and isinstance(attributes.get("metadata"), dict)
            else None
        )
        return jsonify({
            "paymentIntent": _public_payment_intent(payment_intent),
            "environment": mode or _payment_mode(),
        }), 201
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except requests.RequestException:
        current_app.logger.exception("PayMongo could not create the payment intent")
        return jsonify({"error": "PayMongo could not create the payment intent"}), 502
    except RuntimeError as error:
        current_app.logger.error("PayMongo configuration error: %s", error)
        return jsonify({"error": "PayMongo is not configured for this environment"}), 503
    except Exception:
        current_app.logger.exception("Could not save the PayMongo payment intent")
        return jsonify({"error": "Could not save payment information"}), 500


@payment_webhook.post("/api/v1/customer/orders/<int:order_id>/payments")
def customer_process_payment(order_id: int):
    identity, error = _customer_identity(write=True)
    if error:
        return error
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON object is required"}), 400
    payment_intent_id = data.get("paymentIntentId")
    payment_method_id = data.get("paymentMethodId")
    if not isinstance(payment_intent_id, str) or not isinstance(
        payment_method_id,
        str,
    ):
        return jsonify({
            "error": "paymentIntentId and paymentMethodId are required",
        }), 400
    return_url = data.get("returnUrl")
    if return_url is not None and not isinstance(return_url, str):
        return jsonify({"error": "returnUrl must be a URL"}), 400
    if return_url:
        if not _is_allowed_return_url(return_url):
            return jsonify({"error": "returnUrl must use this site's origin"}), 400
    try:
        result = asyncio.run(process_payment(
            order_id,
            identity["id"],
            payment_intent_id,
            payment_method_id,
            return_url,
        ))
        return jsonify(result)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except requests.RequestException:
        current_app.logger.exception("PayMongo could not process the payment")
        return jsonify({"error": "PayMongo could not process the payment"}), 502
    except RuntimeError as error:
        current_app.logger.error("PayMongo configuration error: %s", error)
        return jsonify({"error": "PayMongo is not configured for this environment"}), 503
    except Exception:
        current_app.logger.exception("Could not save PayMongo payment status")
        return jsonify({"error": "Could not save payment information"}), 500


@payment_webhook.get(
    "/api/v1/customer/orders/<int:order_id>/payments/<payment_intent_id>"
)
def customer_refresh_payment(order_id: int, payment_intent_id: str):
    identity, error = _customer_identity()
    if error:
        return error
    try:
        result = asyncio.run(validate_payment_and_update_order(
            order_id,
            identity["id"],
            payment_intent_id,
        ))
        return jsonify(result)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    except requests.RequestException:
        current_app.logger.exception("Could not refresh PayMongo payment status")
        return jsonify({"error": "Could not verify payment with PayMongo"}), 502
    except RuntimeError as error:
        current_app.logger.error("PayMongo configuration error: %s", error)
        return jsonify({"error": "PayMongo is not configured for this environment"}), 503
    except Exception:
        current_app.logger.exception("Could not refresh PayMongo payment status")
        return jsonify({"error": "Could not refresh payment information"}), 500


async def validate_payment_and_update_order(
    order_id: int,
    authenticated_customer_id: int,
    payment_intent_id: str,
) -> dict[str, Any]:
    """Verify the PayMongo intent and mark the order paid only after success."""
    if not re.fullmatch(r"[A-Za-z0-9_-]+", payment_intent_id):
        raise ValueError("Payment intent ID is required")

    db = Prisma()
    await db.connect()
    try:
        order = await db.order.find_first(
            where={
                "id": order_id,
                "customerId": authenticated_customer_id,
            }
        )
        if order is None:
            raise ValueError("Order was not found for this customer")
        if order.status == "cancelled":
            raise ValueError("Cancelled orders cannot be paid")
        if order.paymentIntentId != payment_intent_id:
            raise ValueError("Payment intent is not the one stored for this order")
        mode = order.paymentEnvironment
        if mode not in {"test", "live"}:
            raise ValueError("Payment environment is not recorded for this order")

        payment_intent, attributes = await _get_verified_payment_intent(
            payment_intent_id,
            order,
            authenticated_customer_id,
            mode,
            _paymongo_headers(mode),
        )
        intent_status = await _persist_payment_state(
            db,
            order,
            payment_intent,
            attributes,
            mode,
        )

        return {
            "order_id": order.id,
            "payment_intent_id": payment_intent.get("id"),
            "payment_environment": mode,
            "payment_intent_status": intent_status,
            "payment_status": (
                "completed"
                if order.paymentStatus == "completed"
                else _payment_status_for_intent(intent_status, attributes)
            ),
            "next_action": attributes.get("next_action"),
        }
    finally:
        if db.is_connected():
            await db.disconnect()
