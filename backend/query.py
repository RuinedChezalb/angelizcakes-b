import asyncio
import base64
import binascii
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from functools import wraps
from typing import Any, Callable

from flask import Blueprint, Response, current_app, jsonify, request, session
from prisma import Json, Prisma
from werkzeug.security import check_password_hash, generate_password_hash
from backend.authentication import (
    EmailConfigurationError,
    EmailDeliveryError,
    send_password_reset_code,
    send_email_message,
    send_verification_code,
)

api = Blueprint("database_api", __name__, url_prefix="/api/v1")
logger = logging.getLogger(__name__)

RESOURCES: dict[str, dict[str, Any]] = {
    "branches": {
        "model": "branch",
        "id_type": int,
        "fields": {"name", "location", "phone", "email", "isActive"},
        "permission": None,
    },
    "customers": {
        "model": "customer",
        "id_type": int,
        "fields": {
            "email", "phone", "name", "birthday", "address", "city",
            "postalCode", "preferredContactMethod", "isActive", "isBlocked",
            "blockedReason", "totalSpent", "orderCount", "customerSince",
            "lastOrderDate", "favoriteProducts", "specialRequests", "tags",
            "channel", "preferences",
        },
        "permission": "manage_customers",
    },
    "products": {
        "model": "product",
        "id_type": int,
        "fields": {
            "sku", "name", "description", "basePrice", "category",
            "subCategory", "imageUrl", "categoryId", "isActive", "cost",
            "classification", "tag", "ingredients", "allergens", "flavors",
            "showPOS", "showOnline", "allowCustomization",
        },
        "permission": "manage_inventory",
    },
    "portfolio-images": {
        "model": "portfolioimage",
        "id_type": int,
        "fields": {"title", "altText", "imageUrl", "sortOrder", "isActive"},
        "permission": None,
        "no_create": True,
    },
    "product-categories": {
        "model": "productcategory",
        "id_type": int,
        "fields": {
            "branchId", "name", "description", "color", "iconType",
            "sortOrder", "isActive",
        },
        "permission": "manage_inventory",
    },
    "branch-inventory": {
        "model": "branchinventory",
        "id_type": int,
        "fields": {"branchId", "productId", "quantity", "price", "lowStockThreshold"},
        "permission": "manage_inventory",
    },
    "inventory-lots": {
        "model": "inventorylot",
        "id_type": str,
        "fields": {
            "branchId", "productId", "itemName", "category", "batchCode",
            "quantity", "minStock", "unit", "receivedAt", "expiresAt", "unitPrice",
        },
        "permission": "manage_inventory",
    },
    "promotions": {
        "model": "promotion",
        "id_type": int,
        "fields": {
            "name", "description", "code", "discountType", "discountValue",
            "applicableProducts", "applicableBranches", "maxUses", "usedCount",
            "maxUsesPerCustomer", "startDate", "endDate", "isActive",
            "minOrderValue", "createdBy", "updatedBy",
        },
        "permission": "manage_promotions",
    },
    "orders": {
        "model": "order",
        "id_type": int,
        "fields": {
            "customerId", "branchId", "status", "orderDate", "deliveryDate",
            "deliveryTime", "deliveryAddress", "deliveryCity",
            "deliveryPostalCode", "isPickup", "isForSomeoneElse",
            "recipientName", "recipientPhone", "subtotal", "discountAmount",
            "promotionCode", "taxAmount", "totalAmount", "paymentMethod",
            "paymentStatus", "specialInstructions", "rating", "feedback",
            "channel", "createdBy", "updatedBy",
        },
        "permission": "manage_orders",
        "no_create": True,
        "delete_read_only": True,
    },
    "order-items": {
        "model": "orderitem",
        "id_type": int,
        "fields": {
            "orderId", "productId", "customCakeRequestId", "quantity",
            "pricePerUnit", "subtotal", "customizations",
        },
        "permission": "manage_orders",
        "read_only": True,
    },
    "customization-options": {
        "model": "customizationoption",
        "id_type": str,
        "fields": {
            "step", "field", "value", "displayName", "description", "price",
            "count", "color", "topper", "swatch", "fulfillmentType",
            "location", "fee", "sortOrder", "isActive",
        },
        "permission": None,
    },
    "custom-cake-requests": {
        "model": "customcakerequest",
        "id_type": int,
        "fields": {
            "requestNumber", "customerId", "branchId", "contactName",
            "contactPhone", "contactEmail", "occasion", "size", "sizePrice",
            "layers", "layersCount", "tiers", "tiersCount", "flavor", "frosting", "frostingColor",
            "theme", "themeTopper", "color", "colorSwatch", "dedication",
            "requestedDate", "fulfillmentMethod", "fulfillmentFee", "notes",
            "dueTime", "productionStage", "priority", "assignedStaffId",
            "internalNotes", "quotedTotal",
        },
        "permission": "manage_orders",
    },
    "inquiries": {
        "model": "inquiry",
        "id_type": str,
        "fields": {
            "customerId", "branchId", "customerName", "phone", "email",
            "eventDate", "summary", "type", "estimatedBudget", "status",
            "details", "notes",
        },
        "permission": "manage_orders",
    },
    "catering-bookings": {
        "model": "cateringbooking",
        "id_type": str,
        "fields": {
            "customerId", "branchId", "clientName", "phone", "email",
            "eventDate", "eventTime", "eventType", "venue", "guestCount",
            "total", "deposit", "status", "notes", "menu", "staff",
            "checklist", "setupTime",
        },
        "permission": "manage_orders",
    },
    "catering-packages": {
        "model": "cateringpackage",
        "id_type": str,
        "fields": {
            "category", "title", "description", "imageUrl", "includes",
            "priceOptions", "sortOrder", "isActive",
        },
        "permission": None,
    },
    "held-orders": {
        "model": "heldorder",
        "id_type": str,
        "fields": {
            "branchId", "customerName", "customerContact", "fulfillment", "total",
            "items", "status", "heldAt", "resumedAt",
        },
        "permission": "manage_orders",
    },
    "staff": {
        "model": "staffmember",
        "id_type": str,
        "fields": {
            "branchId", "name", "role", "email", "phone",
            "emergencyContactName", "emergencyContactPhone", "access", "duty",
            "status", "lastLogin",
        },
        "permission": "manage_users",
    },
    "staff-shifts": {
        "model": "staffshift",
        "id_type": str,
        "fields": {
            "staffId", "branchId", "date", "shiftType", "scheduledIn",
            "scheduledOut", "timeIn", "timeOut", "status", "isLate",
            "hours", "duty", "tasks", "notes", "overtimeApproved",
        },
        "permission": "manage_users",
    },
    "branch-settings": {
        "model": "branchsettings",
        "id_type": int,
        "fields": {
            "branchId", "branchOpen", "operatingHours", "cutoffTime",
            "sameDayOrders", "capacities", "utilization", "announcement",
            "currentSlotId",
        },
        "permission": "manage_inventory",
    },
    "time-slots": {
        "model": "branchtimeslot",
        "id_type": str,
        "fields": {
            "branchId", "settingsId", "label", "startTime", "endTime",
            "capacity", "utilization", "isActive",
        },
        "permission": "manage_inventory",
    },
    "conversations": {
        "model": "conversation",
        "id_type": str,
        "fields": {
            "customerId", "branchId", "contactName", "contact", "email",
            "channel", "topic", "status", "isOnline", "isVip", "unreadCount",
            "filterType", "tag", "customerSince", "recentOrders", "internalNote",
        },
        "permission": "manage_orders",
    },
    "conversation-messages": {
        "model": "conversationmessage",
        "id_type": int,
        "fields": {"conversationId", "direction", "content", "sentAt"},
        "permission": "manage_orders",
    },
    "feedback": {
        "model": "customerfeedback",
        "id_type": str,
        "fields": {
            "customerId", "orderId", "branchId", "customerName", "rating",
            "message", "source", "status", "submittedAt",
        },
        "permission": "manage_customers",
    },
    "support-tickets": {
        "model": "supportticket",
        "id_type": str,
        "fields": {
            "customerId", "branchId", "author", "category", "priority",
            "subject", "description", "status", "submittedAt",
        },
        "permission": "manage_orders",
    },
    "support-replies": {
        "model": "supportticketreply",
        "id_type": int,
        "fields": {"ticketId", "author", "message"},
        "permission": "manage_orders",
    },
    "notifications": {
        "model": "notification",
        "id_type": str,
        "fields": {
            "branchId", "category", "categoryKey", "priority", "iconType",
            "title", "message", "isRead", "details", "actions", "createdAt",
        },
        "permission": "manage_orders",
    },
    "security-incidents": {
        "model": "securityincident",
        "id_type": str,
        "fields": {
            "branchId", "targetName", "targetType", "issueType", "dateReported",
            "financialImpact", "status", "description", "notes", "evidence",
            "restrictions", "escalationReason",
        },
        "permission": "view_audit_logs",
        "read_only": True,
    },
    "sales-reports": {
        "model": "salesreport",
        "id_type": int,
        "fields": {
            "branchId", "date", "totalOrders", "totalRevenue",
            "totalCustomers", "averageOrderValue", "totalDiscount",
            "topProduct", "topProductQuantity",
        },
        "permission": "view_reports",
        "read_only": True,
    },
    "branch-reports": {
        "model": "branchdailyreport",
        "id_type": int,
        "fields": {"branchId", "reportDate", "managerName", "reportData"},
        "order_by": {"reportDate": "desc"},
        "permission": "view_reports",
    },
    "audit-logs": {
        "model": "auditlog",
        "id_type": int,
        "fields": {"action", "entity", "entityId", "changedBy", "branchId", "details"},
        "permission": "view_audit_logs",
        "read_only": True,
    },
    "custom-cake-reference-images": {
        "model": "customcakereferenceimage",
        "id_type": int,
        "fields": {"requestId", "storageKey", "fileName", "contentType"},
        "permission": "manage_orders",
    },
    "support-attachments": {
        "model": "supportticketattachment",
        "id_type": int,
        "fields": {"ticketId", "fileName", "storageKey", "contentType"},
        "permission": "manage_orders",
        "no_create": True,
        "delete_read_only": True,
    },
}

RELATION_FIELDS: dict[str, dict[str, tuple[str, str, bool]]] = {
    "branchinventory": {
        "branchId": ("branch", "id", False),
        "productId": ("product", "id", False),
    },
    "product": {"categoryId": ("catalogCategory", "id", True)},
    "productcategory": {"branchId": ("branch", "id", True)},
    "inventorylot": {
        "branchId": ("branch", "id", False),
        "productId": ("product", "id", True),
    },
    "order": {
        "customerId": ("customer", "id", False),
        "branchId": ("branch", "id", False),
    },
    "orderitem": {
        "orderId": ("order", "id", False),
        "productId": ("product", "id", True),
        "customCakeRequestId": ("customCakeRequest", "id", True),
    },
    "customcakerequest": {
        "customerId": ("customer", "id", True),
        "branchId": ("branch", "id", True),
        "assignedStaffId": ("assignedStaff", "id", True),
    },
    "customcakereferenceimage": {"requestId": ("request", "id", False)},
    "inquiry": {
        "customerId": ("customer", "id", True),
        "branchId": ("branch", "id", True),
    },
    "cateringbooking": {
        "customerId": ("customer", "id", True),
        "branchId": ("branch", "id", True),
    },
    "staffmember": {"branchId": ("branch", "id", True)},
    "staffshift": {
        "staffId": ("staff", "id", False),
        "branchId": ("branch", "id", True),
    },
    "branchsettings": {"branchId": ("branch", "id", False)},
    "heldorder": {"branchId": ("branch", "id", True)},
    "branchtimeslot": {
        "branchId": ("branch", "id", False),
        "settingsId": ("settings", "id", True),
    },
    "conversation": {
        "customerId": ("customer", "id", True),
        "branchId": ("branch", "id", True),
    },
    "conversationmessage": {"conversationId": ("conversation", "id", False)},
    "customerfeedback": {
        "customerId": ("customer", "id", True),
        "orderId": ("order", "id", True),
        "branchId": ("branch", "id", True),
    },
    "supportticket": {
        "customerId": ("customer", "id", True),
        "branchId": ("branch", "id", True),
    },
    "supportticketreply": {"ticketId": ("ticket", "id", False)},
    "supportticketattachment": {"ticketId": ("ticket", "id", False)},
    "notification": {"branchId": ("branch", "id", True)},
    "securityincident": {"branchId": ("branch", "id", True)},
    "branchdailyreport": {"branchId": ("branch", "id", False)},
}

JSON_FIELDS: dict[str, set[str]] = {
    "customer": {"preferences"},
    "branchsettings": {"operatingHours", "capacities", "utilization"},
    "cateringbooking": {"menu", "staff", "checklist"},
    "cateringpackage": {"includes", "priceOptions"},
    "heldorder": {"items"},
    "inquiry": {"details"},
    "staffmember": {"access"},
    "staffshift": {"tasks"},
    "conversation": {"recentOrders"},
    "notification": {"details", "actions"},
    "securityincident": {"evidence", "restrictions"},
    "branchdailyreport": {"reportData"},
    "product": {"classification", "ingredients", "flavors"},
}

BRANCH_WHERE: dict[str, Callable[[int], dict[str, Any]]] = {
    "branch": lambda branch_id: {"id": branch_id},
    "branchinventory": lambda branch_id: {"branchId": branch_id},
    "productcategory": lambda branch_id: {"OR": [
        {"branchId": branch_id},
        {"branchId": None},
    ]},
    "inventorylot": lambda branch_id: {"branchId": branch_id},
    "product": lambda branch_id: {
        "branchInventories": {"some": {"branchId": branch_id}},
    },
    "order": lambda branch_id: {"branchId": branch_id},
    "orderitem": lambda branch_id: {"order": {"is": {"branchId": branch_id}}},
    "customcakerequest": lambda branch_id: {"branchId": branch_id},
    "customcakereferenceimage": lambda branch_id: {
        "request": {"is": {"branchId": branch_id}},
    },
    "inquiry": lambda branch_id: {"branchId": branch_id},
    "cateringbooking": lambda branch_id: {"branchId": branch_id},
    "heldorder": lambda branch_id: {"branchId": branch_id},
    "staffmember": lambda branch_id: {"branchId": branch_id},
    "staffshift": lambda branch_id: {"branchId": branch_id},
    "branchsettings": lambda branch_id: {"branchId": branch_id},
    "branchtimeslot": lambda branch_id: {"branchId": branch_id},
    "conversation": lambda branch_id: {"branchId": branch_id},
    "conversationmessage": lambda branch_id: {
        "conversation": {"is": {"branchId": branch_id}},
    },
    "customerfeedback": lambda branch_id: {"branchId": branch_id},
    "supportticket": lambda branch_id: {"branchId": branch_id},
    "supportticketreply": lambda branch_id: {
        "ticket": {"is": {"branchId": branch_id}},
    },
    "supportticketattachment": lambda branch_id: {
        "ticket": {"is": {"branchId": branch_id}},
    },
    "notification": lambda branch_id: {"branchId": branch_id},
    "securityincident": lambda branch_id: {"branchId": branch_id},
    "salesreport": lambda branch_id: {"branchId": branch_id},
    "branchdailyreport": lambda branch_id: {"branchId": branch_id},
    "auditlog": lambda branch_id: {"branchId": branch_id},
    "customer": lambda branch_id: {
        "orders": {"some": {"branchId": branch_id}},
    },
    "promotion": lambda branch_id: {
        "applicableBranches": {"has": branch_id},
    },
}


def _prepare_model_data(
    model_name: str,
    data: dict[str, Any],
    *,
    creating: bool,
) -> dict[str, Any]:
    prepared = dict(data)
    date_fields = {
        "birthday", "receivedAt", "expiresAt", "date", "reportDate",
        "requestedDate", "eventDate",
    }
    datetime_fields = {
        "deliveryDate", "submittedAt", "heldAt", "resumedAt", "lastOrderDate",
        "sentAt", "startDate", "endDate",
    }
    if model_name == "customer":
        datetime_fields.add("customerSince")
    if model_name == "cateringbooking":
        for field in ("eventTime", "setupTime"):
            if field in prepared:
                prepared[field] = _normalize_catering_time(prepared[field], field)
    for field in (date_fields | datetime_fields) & prepared.keys():
        value = prepared[field]
        if value is None or isinstance(value, (datetime, date)):
            continue
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"{field} must be a valid date")
        try:
            if field in date_fields:
                prepared[field] = date.fromisoformat(value)
            else:
                try:
                    prepared[field] = datetime.fromisoformat(value.replace("Z", "+00:00"))
                except ValueError:
                    prepared[field] = datetime.combine(
                        date.fromisoformat(value),
                        datetime.min.time(),
                    )
        except ValueError as error:
            raise ValueError(f"{field} must be a valid ISO date") from error
    for foreign_key, (relation, id_field, optional) in RELATION_FIELDS.get(model_name, {}).items():
        if foreign_key not in prepared:
            continue
        related_id = prepared.pop(foreign_key)
        if related_id is None:
            if creating:
                continue
            if not optional:
                raise ValueError(f"{foreign_key} cannot be cleared")
            prepared[relation] = {"disconnect": True}
        else:
            prepared[relation] = {"connect": {id_field: related_id}}

    for field in JSON_FIELDS.get(model_name, set()):
        if field in prepared and prepared[field] is not None:
            prepared[field] = Json(prepared[field])
        elif field in prepared and creating:
            prepared.pop(field)
    return prepared


def _normalize_catering_time(value: Any, field: str) -> str | None:
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a valid time")

    text = value.strip()
    twelve_hour = re.fullmatch(
        r"(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)",
        text,
        flags=re.IGNORECASE,
    )
    if twelve_hour:
        hour = int(twelve_hour.group(1)) % 12
        if twelve_hour.group(3).upper() == "PM":
            hour += 12
        minute = twelve_hour.group(2)
    else:
        twenty_four_hour = re.fullmatch(r"([01]\d|2[0-3]):([0-5]\d)", text)
        if not twenty_four_hour:
            raise ValueError(f"{field} must use h:mm AM/PM format")
        hour = int(twenty_four_hour.group(1))
        minute = twenty_four_hour.group(2)

    meridiem = "PM" if hour >= 12 else "AM"
    display_hour = hour % 12 or 12
    return f"{display_hour}:{minute} {meridiem}"


def _branch_id_for_identity(identity: dict[str, Any]) -> int | None:
    if identity["role"] == "admin":
        branch_id = identity.get("branchId")
        if not isinstance(branch_id, int):
            raise ValueError("This admin account has no assigned branch")
        return branch_id
    selected_branch = session.get("selected_branch_id")
    return selected_branch if isinstance(selected_branch, int) else None


def _refresh_admin_identity(identity: dict[str, Any]) -> bool:
    if identity.get("role") != "admin":
        return True

    async def load_admin(client: Prisma):
        return await client.admin.find_unique(where={"id": identity["id"]})

    account = _db(load_admin)
    if account is None or not account.isActive or account.assignedBranchId is None:
        session.clear()
        return False
    identity["email"] = account.email
    identity["branchId"] = account.assignedBranchId
    identity["permissions"] = account.permissions
    identity["mustChangePassword"] = account.mustChangePassword
    session["identity"] = identity
    return True


def _branch_filter_for_model(
    model_name: str,
    branch_id: int | None,
) -> dict[str, Any]:
    if branch_id is None:
        return {}
    filter_factory = BRANCH_WHERE.get(model_name)
    if filter_factory is None:
        return {}
    return filter_factory(branch_id)


def _order_products_available_at_branch(
    product_ids: set[int],
    inventory_rows: list[Any],
    branch_id: int,
) -> set[int]:
    branches_by_product: dict[int, set[int]] = {}
    for row in inventory_rows:
        branches_by_product.setdefault(row.productId, set()).add(row.branchId)
    return {
        product_id
        for product_id in product_ids
        if product_id not in branches_by_product
        or branch_id in branches_by_product[product_id]
    }


BRANCH_RELATION_FIELDS: dict[str, dict[str, str]] = {
    "staffshift": {"staffId": "staffmember"},
    "branchtimeslot": {"settingsId": "branchsettings"},
    "conversationmessage": {"conversationId": "conversation"},
    "supportticketreply": {"ticketId": "supportticket"},
    "supportticketattachment": {"ticketId": "supportticket"},
    "customcakereferenceimage": {"requestId": "customcakerequest"},
    "customcakerequest": {"assignedStaffId": "staffmember"},
    "customerfeedback": {"orderId": "order"},
}


async def _validate_branch_relations(
    client: Prisma,
    model_name: str,
    data: dict[str, Any],
    branch_id: int | None,
) -> None:
    if branch_id is None:
        return
    for field, related_model_name in BRANCH_RELATION_FIELDS.get(model_name, {}).items():
        related_id = data.get(field)
        if related_id is None:
            continue
        related = await getattr(client, related_model_name).find_first(
            where={"id": related_id, "branchId": branch_id}
        )
        if related is None:
            raise ValueError(f"{field} must reference a record in the selected branch")


async def _write_audit_log(
    client: Prisma,
    identity: dict[str, Any],
    action: str,
    entity: str,
    entity_id: int,
    branch_id: int | None,
    details: dict[str, Any],
) -> None:
    audit_details = {
        **details,
        "actorRole": identity["role"],
        "ipAddress": request.remote_addr,
        "userAgent": request.user_agent.string[:512],
        "recordedAt": datetime.now().astimezone().isoformat(),
    }
    await client.auditlog.create(data={
        "action": action,
        "entity": entity,
        "entityId": entity_id,
        "changedBy": identity.get("email", "unknown"),
        "branchId": branch_id,
        "details": json.dumps(audit_details, separators=(",", ":"), default=str),
    })


async def _run_db(operation: Callable[[Prisma], Any]) -> Any:
    client = Prisma()
    await client.connect()
    try:
        return await operation(client)
    finally:
        if client.is_connected():
            await client.disconnect()


def _db(operation: Callable[[Prisma], Any]) -> Any:
    return asyncio.run(_run_db(operation))


def _serialize(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, list):
        return [_serialize(item) for item in value]
    if isinstance(value, dict):
        return {key: _serialize(item) for key, item in value.items()}
    if hasattr(value, "dict"):
        return _serialize(value.dict())
    return value


def _add_product_image_urls(
    products: list[dict[str, Any]],
    product_images: list[dict[str, Any]] | None = None,
) -> None:
    images_by_product_id: dict[int, list[dict[str, Any]]] = {}
    if product_images is not None:
        for image in product_images:
            images_by_product_id.setdefault(image["productId"], []).append(image)

    for product in products:
        image_urls = []
        if product.get("imageUrl"):
            image_urls.append(product["imageUrl"])
        images = sorted(
            (
                images_by_product_id.get(product["id"], [])
                if product_images is not None
                else product.pop("productImages", []) or []
            ),
            key=lambda image: (image.get("sortOrder", 0), image.get("id", 0)),
        )
        for image in images:
            image_url = f"/product-images/{image['id']}/image"
            if not any(
                existing == image_url or existing.endswith(image_url)
                for existing in image_urls
            ):
                image_urls.append(image_url)
        product["imageUrls"] = image_urls


async def _load_product_images(
    client: Prisma,
    product_ids: list[int],
) -> list[dict[str, Any]]:
    if not product_ids:
        return []
    placeholders = ", ".join(
        f"${index}" for index in range(1, len(product_ids) + 1)
    )
    return await client.query_raw(
        'SELECT "id", "productId", "sortOrder" FROM "ProductImage" '
        f'WHERE "productId" IN ({placeholders})',
        *product_ids,
    )


def _strip_customer_secrets(customer: dict[str, Any]) -> None:
    for field in (
        "passwordHash",
        "emailVerificationCodeHash",
        "emailVerificationExpiresAt",
        "emailVerificationSentAt",
        "emailVerificationAttempts",
        "passwordResetCodeHash",
        "passwordResetExpiresAt",
        "passwordResetSentAt",
        "passwordResetAttempts",
    ):
        customer.pop(field, None)


def _json_error(message: str, status: int):
    return jsonify({"error": message}), status


def _password_reset_code_hash(customer_id: int, code: str) -> str:
    secret_key = current_app.secret_key
    if not secret_key:
        raise RuntimeError("Password reset requires a configured session key")
    if isinstance(secret_key, str):
        secret_key = secret_key.encode("utf-8")
    return hmac.new(
        secret_key,
        f"password-reset:{customer_id}:{code}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _require_csrf():
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return None
    expected = session.get("csrf_token")
    provided = request.headers.get("X-CSRF-Token")
    if not expected or not provided or not secrets.compare_digest(expected, provided):
        return _json_error("Invalid CSRF token", 403)
    return None


def _current_identity() -> dict[str, Any] | None:
    identity = session.get("identity")
    return identity if isinstance(identity, dict) else None


def _authenticated(roles: set[str] | None = None):
    def decorate(handler):
        @wraps(handler)
        def wrapped(*args, **kwargs):
            identity = _current_identity()
            if identity is None:
                return _json_error("Authentication required", 401)
            if roles is not None and identity.get("role") not in roles:
                return _json_error("Insufficient permissions", 403)
            csrf_error = _require_csrf()
            if csrf_error:
                return csrf_error
            return handler(*args, **kwargs)
        return wrapped
    return decorate


def _login_result(identity: dict[str, Any]):
    session.clear()
    session["identity"] = identity
    session["csrf_token"] = secrets.token_urlsafe(32)
    return jsonify({"user": identity, "csrfToken": session["csrf_token"]})


@api.get("/healthz")
def healthcheck():
    try:
        _db(lambda client: client.query_raw("SELECT 1"))
    except Exception:
        logger.exception("Database health check failed")
        return _json_error("Database is unavailable", 503)
    return jsonify({"status": "ok", "database": "ok"})


def _public_review_data(reviews: list[Any]) -> list[dict[str, Any]]:
    return [
        {
            "name": (review.customerName or "").strip().split()[0]
            if (review.customerName or "").strip()
            else "Customer",
            "rating": review.rating,
            "message": review.message,
            "submittedAt": review.submittedAt,
        }
        for review in reviews
        if review.rating is not None and review.message.strip()
    ]


@api.get("/public/feedback")
def public_feedback():
    async def load_feedback(client: Prisma):
        return await client.customerfeedback.find_many(
            where={"rating": {"not": None}},
            order=[{"rating": "desc"}, {"submittedAt": "desc"}],
        )

    try:
        reviews = _db(load_feedback)
        return jsonify({"reviews": _serialize(_public_review_data(reviews))})
    except Exception:
        logger.exception("Could not load customer reviews")
        return _json_error("Could not load customer reviews", 500)


@api.get("/catalog")
def public_catalog():
    requested_branch_id = request.args.get("branchId")
    branch_id = None
    if requested_branch_id is not None:
        try:
            branch_id = int(requested_branch_id)
        except ValueError:
            return _json_error("branchId must be an integer", 400)
        if branch_id <= 0:
            return _json_error("branchId must be a positive integer", 400)

    async def load_catalog(client: Prisma):
        product_where: dict[str, Any] = {"isActive": True, "showOnline": True}
        (
            products,
            categories,
            portfolio_images,
            options,
            branches,
            catering_packages,
            completed_order_items,
            customer_feedback,
        ) = await asyncio.gather(
            client.product.find_many(where=product_where),
            client.productcategory.find_many(where={"isActive": True}),
            client.portfolioimage.find_many(
                where={"isActive": True},
                order={"sortOrder": "asc"},
            ),
            client.customizationoption.find_many(
                where={"isActive": True},
            ),
            client.branch.find_many(where={"isActive": True}),
            client.cateringpackage.find_many(
                where={"isActive": True},
            ),
            client.orderitem.find_many(
                where={"order": {"is": {"status": "completed"}}},
            ),
            client.customerfeedback.find_many(
                where={"rating": {"not": None}},
                order=[{"rating": "desc"}, {"submittedAt": "desc"}],
            ),
        )
        inventory_rows = []
        if products:
            product_ids = [product.id for product in products]
            placeholders = ", ".join(
                f"${index}" for index in range(1, len(product_ids) + 1)
            )
            inventory_rows = await client.query_raw(
                'SELECT "productId", "branchId", "quantity" '
                'FROM "BranchInventory" '
                f'WHERE "productId" IN ({placeholders})',
                *product_ids,
            )
        inventory_by_product: dict[int, dict[int, int]] = {}
        for inventory in inventory_rows:
            inventory_by_product.setdefault(inventory["productId"], {})[
                inventory["branchId"]
            ] = inventory["quantity"]

        product_images = []
        if products:
            product_ids = [product.id for product in products]
            placeholders = ", ".join(
                f"${index}" for index in range(1, len(product_ids) + 1)
            )
            product_images = await client.query_raw(
                'SELECT "id", "productId", "sortOrder" FROM "ProductImage" '
                f'WHERE "productId" IN ({placeholders})',
                *product_ids,
            )
        options.sort(key=lambda option: (option.step, option.sortOrder))
        catering_packages.sort(key=lambda package: package.sortOrder)
        sold_counts: dict[int, int] = {}
        for item in completed_order_items:
            if item.productId is not None:
                sold_counts[item.productId] = sold_counts.get(item.productId, 0) + item.quantity
        product_data = _serialize(products)
        active_branches = [
            {"id": branch.id, "name": branch.name}
            for branch in branches
        ]
        if branch_id is not None:
            product_data = [
                product
                for product in product_data
                if product["id"] not in inventory_by_product
                or inventory_by_product[product["id"]].get(branch_id, 0) > 0
            ]
        for product in product_data:
            inventory_by_branch = inventory_by_product.get(product["id"], {})
            product["branchAvailability"] = (
                [
                    {
                        "branchId": branch["id"],
                        "branchName": branch["name"],
                        "quantity": inventory_by_branch.get(branch["id"], 0),
                        "available": inventory_by_branch.get(branch["id"], 0) > 0,
                    }
                    for branch in active_branches
                ]
                if product["id"] in inventory_by_product
                else None
            )
        _add_product_image_urls(product_data, _serialize(product_images))
        portfolio_data = _serialize(portfolio_images)
        if branch_id is not None and not any(
            branch.id == branch_id for branch in branches
        ):
            return None
        for product in product_data:
            product["soldCount"] = sold_counts.get(product["id"], 0)
            product["tags"] = [product["tag"]] if product.get("tag") else []
        for image in portfolio_data:
            if image.get("imageData"):
                image["imageUrl"] = f"/portfolio-images/{image['id']}/image"
            image.pop("imageData", None)
            image.pop("contentType", None)
        return {
            "products": product_data,
            "categories": categories,
            "portfolioImages": portfolio_data,
            "customizationOptions": options,
            "branches": branches,
            "cateringPackages": catering_packages,
            "reviews": _public_review_data(customer_feedback),
        }

    try:
        catalog = _db(load_catalog)
        if catalog is None:
            return _json_error("Selected branch is unavailable", 404)
        return jsonify(_serialize(catalog))
    except Exception:
        logger.exception("Could not load the customer catalog")
        return _json_error("Could not load catalog data", 500)


@api.get("/portfolio-images/<int:image_id>/image")
def public_portfolio_image(image_id: int):
    async def load_image(client: Prisma):
        image = await client.portfolioimage.find_first(
            where={"id": image_id, "isActive": True}
        )
        return image

    try:
        image = _db(load_image)
    except Exception:
        logger.exception("Could not load portfolio image %s", image_id)
        return _json_error("Could not load portfolio image", 500)
    if image is None or not image.imageData or not image.contentType:
        return _json_error("Portfolio image not found", 404)
    try:
        image_bytes = base64.b64decode(image.imageData, validate=True)
    except (binascii.Error, ValueError):
        logger.error("Stored portfolio image %s has invalid image data", image_id)
        return _json_error("Portfolio image is unavailable", 500)
    response = Response(image_bytes, mimetype=image.contentType)
    response.headers["Cache-Control"] = "public, max-age=3600"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@api.get("/product-images/<int:image_id>/image")
def public_product_image(image_id: int):
    async def load_image(client: Prisma):
        return await client.productimage.find_unique(where={"id": image_id})

    try:
        image = _db(load_image)
    except Exception:
        logger.exception("Could not load product image %s", image_id)
        return _json_error("Could not load product image", 500)
    if image is None:
        return _json_error("Product image not found", 404)
    try:
        image_bytes = base64.b64decode(image.imageData, validate=True)
    except (binascii.Error, ValueError):
        logger.error("Stored product image %s has invalid image data", image_id)
        return _json_error("Product image is unavailable", 500)
    response = Response(image_bytes, mimetype=image.contentType)
    response.headers["Cache-Control"] = "public, max-age=3600"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@api.post("/admin/products/<string:sku>/images")
def upload_product_image(sku: str):
    permission_error = _authorize_resource(RESOURCES["inventory-lots"], write=True)
    if permission_error:
        return permission_error
    identity = _current_identity()
    branch_id = None
    if identity["role"] == "admin":
        try:
            branch_id = _branch_id_for_identity(identity)
        except ValueError as error:
            return _json_error(str(error), 403)
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error
    if request.content_length is not None and request.content_length > 3 * 1024 * 1024:
        return _json_error("Product images must be no larger than 2 MB", 413)

    upload = request.files.get("image")
    if upload is None:
        return _json_error("Choose an image to upload", 400)
    content_type = upload.mimetype.lower()
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if content_type not in allowed_types:
        return _json_error("Upload a JPEG, PNG, GIF, or WebP image", 400)
    image_bytes = upload.stream.read(2 * 1024 * 1024 + 1)
    if not image_bytes or len(image_bytes) > 2 * 1024 * 1024:
        return _json_error("Product images must be no larger than 2 MB", 400)
    signature_matches = {
        "image/jpeg": image_bytes.startswith(b"\xff\xd8\xff"),
        "image/png": image_bytes.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/gif": image_bytes.startswith((b"GIF87a", b"GIF89a")),
        "image/webp": image_bytes.startswith(b"RIFF") and image_bytes[8:12] == b"WEBP",
    }
    if not signature_matches[content_type]:
        return _json_error("The uploaded file does not match its image type", 400)

    async def create_product_image(client: Prisma):
        product = await client.product.find_unique(
            where={"sku": sku},
            include={
                "branchInventories": {"select": {"branchId": True}},
            },
        )
        if product is None:
            return "missing", None
        if identity["role"] == "admin" and (
            not product.branchInventories
            or any(item.branchId != branch_id for item in product.branchInventories)
        ):
            return "forbidden", None
        product_images = await _load_product_images(client, [product.id])
        image_count = len(product_images)
        primary_is_uploaded_image = any(
            str(product.imageUrl or "").endswith(
                f"/product-images/{image['id']}/image"
            )
            for image in product_images
        )
        image_count += int(bool(product.imageUrl) and not primary_is_uploaded_image)
        if image_count >= 5:
            return "limit", None
        image = await client.productimage.create(data={
            "productId": product.id,
            "imageData": base64.b64encode(image_bytes).decode("ascii"),
            "contentType": content_type,
            "sortOrder": image_count,
        })
        return "created", image

    try:
        status, image = _db(create_product_image)
    except Exception:
        logger.exception("Could not save product image for SKU %s", sku)
        return _json_error("Could not save product image", 500)
    if status == "missing":
        return _json_error("Product not found", 404)
    if status == "forbidden":
        return _json_error("This product is not exclusive to your assigned branch", 403)
    if status == "limit":
        return _json_error("A product may have no more than 5 images", 400)
    return jsonify({
        "imageUrl": f"/product-images/{image.id}/image",
        "sortOrder": image.sortOrder,
    }), 201


@api.post("/admin/branch-inventory/receive")
def receive_branch_inventory():
    permission_error = _authorize_resource(RESOURCES["inventory-lots"], write=True)
    if permission_error:
        return permission_error
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error

    data = request.get_json(silent=True)
    supported_fields = {
        "productId", "newProduct", "batchCode", "quantity", "minStock",
        "unit", "receivedAt", "expiresAt", "unitPrice",
    }
    if not isinstance(data, dict) or set(data) - supported_fields:
        return _json_error("A valid product delivery is required", 400)
    product_id = data.get("productId")
    new_product = data.get("newProduct")
    if (product_id is None) == (new_product is None):
        return _json_error("Select an existing product or provide a new product", 400)
    if product_id is not None and (
        type(product_id) is not int or product_id <= 0
    ):
        return _json_error("productId must be a positive integer", 400)
    if new_product is not None:
        product_fields = {"sku", "name", "category", "basePrice", "description"}
        if (
            not isinstance(new_product, dict)
            or set(new_product) - product_fields
            or not {"sku", "name", "category", "basePrice"} <= set(new_product)
        ):
            return _json_error("New product details are invalid", 400)
        sku = new_product["sku"]
        name = new_product["name"]
        category = new_product["category"]
        description = new_product.get("description", "")
        if (
            not isinstance(sku, str)
            or not re.fullmatch(r"[A-Za-z0-9._-]{1,40}", sku.strip())
            or not isinstance(name, str)
            or not name.strip()
            or len(name.strip()) > 120
            or not isinstance(category, str)
            or not category.strip()
            or len(category.strip()) > 60
            or not isinstance(description, str)
            or len(description) > 1000
        ):
            return _json_error("Enter a valid product SKU, name, category, and description", 400)
        try:
            base_price = Decimal(str(new_product["basePrice"]))
        except (InvalidOperation, TypeError, ValueError):
            return _json_error("Product price must be a valid amount", 400)
        if not base_price.is_finite() or not Decimal("0") < base_price <= Decimal("1000000"):
            return _json_error("Product price must be between 0 and 1,000,000", 400)
        new_product_data = {
            "sku": sku.strip(),
            "name": name.strip(),
            "category": category.strip(),
            "description": description.strip() or None,
            "basePrice": base_price.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            "isActive": True,
            "showOnline": True,
            "showPOS": True,
        }
    else:
        new_product_data = None

    quantity = data.get("quantity")
    min_stock = data.get("minStock")
    if type(quantity) is not int or not 1 <= quantity <= 100000:
        return _json_error("Quantity must be an integer between 1 and 100,000", 400)
    if type(min_stock) is not int or not 0 <= min_stock <= 100000:
        return _json_error("Minimum stock must be an integer between 0 and 100,000", 400)
    batch_code = data.get("batchCode")
    unit = data.get("unit")
    received_at = data.get("receivedAt")
    expires_at = data.get("expiresAt")
    if not isinstance(batch_code, str) or not batch_code.strip() or len(batch_code.strip()) > 80:
        return _json_error("Batch code must be between 1 and 80 characters", 400)
    if not isinstance(unit, str) or not unit.strip() or len(unit.strip()) > 20:
        return _json_error("A valid inventory unit is required", 400)
    if not isinstance(received_at, str):
        return _json_error("Received date must be a valid ISO date", 400)
    try:
        date.fromisoformat(received_at)
        if expires_at:
            date.fromisoformat(expires_at)
    except (TypeError, ValueError):
        return _json_error("Received and expiry dates must be valid ISO dates", 400)
    if expires_at and expires_at < received_at:
        return _json_error("Expiry date cannot be before the received date", 400)
    try:
        unit_price = Decimal(str(data.get("unitPrice")))
    except (InvalidOperation, TypeError, ValueError):
        return _json_error("Unit cost must be a valid amount", 400)
    if not unit_price.is_finite() or not Decimal("0") <= unit_price <= Decimal("1000000"):
        return _json_error("Unit cost must be between 0 and 1,000,000", 400)

    identity = _current_identity()
    try:
        branch_id = _branch_id_for_identity(identity)
    except ValueError as error:
        return _json_error(str(error), 403)
    if branch_id is None:
        return _json_error("Select a branch before receiving inventory", 400)

    async def receive(client: Prisma):
        async with client.tx(max_wait=10_000, timeout=30_000) as transaction:
            branch = await transaction.branch.find_unique(where={"id": branch_id})
            if branch is None or not branch.isActive:
                raise ValueError("Selected branch is unavailable")
            if new_product_data is not None:
                if await transaction.product.find_unique(
                    where={"sku": new_product_data["sku"]}
                ):
                    raise ValueError("That product SKU is already in use")
                product = await transaction.product.create(data=_prepare_model_data(
                    "product",
                    new_product_data,
                    creating=True,
                ))
            else:
                product = await transaction.product.find_unique(where={"id": product_id})
                if product is None or not product.isActive:
                    raise ValueError("Select an active product")

            branch_inventory = await transaction.branchinventory.find_first(
                where={"branchId": branch_id, "productId": product.id}
            )
            if branch_inventory is None:
                await transaction.branchinventory.create(data=_prepare_model_data(
                    "branchinventory",
                    {
                        "branchId": branch_id,
                        "productId": product.id,
                        "quantity": quantity,
                        "price": product.basePrice,
                        "lowStockThreshold": min_stock,
                    },
                    creating=True,
                ))
            else:
                await transaction.branchinventory.update(
                    where={"id": branch_inventory.id},
                    data={
                        "quantity": {"increment": quantity},
                        "lowStockThreshold": min_stock,
                    },
                )
            lot = await transaction.inventorylot.create(data=_prepare_model_data(
                "inventorylot",
                {
                    "branchId": branch_id,
                    "productId": product.id,
                    "itemName": product.name,
                    "category": product.category or (new_product_data or {}).get("category") or "Uncategorized",
                    "batchCode": batch_code.strip(),
                    "quantity": quantity,
                    "minStock": min_stock,
                    "unit": unit.strip(),
                    "receivedAt": received_at,
                    "expiresAt": expires_at or None,
                    "unitPrice": unit_price.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
                },
                creating=True,
            ))
            await _write_audit_log(
                transaction,
                identity,
                "inventory_delivery_received",
                "Product",
                product.id,
                branch_id,
                {"sku": product.sku, "lotId": lot.id, "quantity": quantity},
            )
            return lot, product

    try:
        lot, product = _db(receive)
    except ValueError as error:
        return _json_error(str(error), 400)
    except Exception:
        logger.exception("Could not receive product inventory at branch %s", branch_id)
        return _json_error("Could not save product delivery", 500)
    return jsonify({"item": _serialize(lot), "product": _serialize(product)}), 201


@api.get("/admin/branch-inventory/products")
def receivable_branch_products():
    permission_error = _authorize_resource(RESOURCES["inventory-lots"])
    if permission_error:
        return permission_error
    identity = _current_identity()
    try:
        branch_id = _branch_id_for_identity(identity)
    except ValueError as error:
        return _json_error(str(error), 403)
    if branch_id is None:
        return _json_error("Select a branch before viewing receivable products", 400)

    async def load_products(client: Prisma):
        products = await client.product.find_many(
            where={"isActive": True},
            order={"name": "asc"},
            include={
                "branchInventories": {"select": {"branchId": True}},
            },
        )
        product_images = await _load_product_images(
            client,
            [product.id for product in products],
        )
        images_by_product_id: dict[int, list[dict[str, Any]]] = {}
        for image in product_images:
            images_by_product_id.setdefault(image["productId"], []).append(image)

        return [
            {
                "id": product.id,
                "sku": product.sku,
                "name": product.name,
                "category": product.category,
                "basePrice": str(product.basePrice),
                "unitCost": str(product.cost or product.basePrice),
                "imageCount": len(images_by_product_id.get(product.id, [])) + int(
                    bool(product.imageUrl)
                    and not any(
                        str(product.imageUrl).endswith(
                            f"/product-images/{image['id']}/image"
                        )
                        for image in images_by_product_id.get(product.id, [])
                    )
                ),
                "canUploadImages": all(
                    item.branchId == branch_id for item in product.branchInventories or []
                ),
            }
            for product in products
        ]

    try:
        return jsonify({"products": _db(load_products)})
    except Exception:
        logger.exception("Could not load products available for branch receiving")
        return _json_error("Could not load receivable products", 500)


@api.get("/admin/custom-cake-reference-images/<int:image_id>/image")
def admin_custom_cake_reference_image(image_id: int):
    resource = RESOURCES["custom-cake-reference-images"]
    permission_error = _authorize_resource(resource)
    if permission_error:
        return permission_error
    identity = _current_identity()
    try:
        branch_id = _branch_id_for_identity(identity)
    except ValueError as error:
        return _json_error(str(error), 403)
    where: dict[str, Any] = {"id": image_id}
    if branch_id is not None:
        where["request"] = {"is": {"branchId": branch_id}}

    async def find_image(client: Prisma):
        return await client.customcakereferenceimage.find_first(where=where)

    try:
        image = _db(find_image)
    except Exception:
        logger.exception("Could not load custom cake reference image %s", image_id)
        return _json_error("Could not load reference image", 500)
    if image is None or not image.imageData or not image.contentType:
        return _json_error("Reference image not found", 404)
    try:
        image_bytes = base64.b64decode(image.imageData, validate=True)
    except (binascii.Error, ValueError):
        logger.error("Stored custom cake reference image %s is invalid", image_id)
        return _json_error("Reference image is unavailable", 500)
    response = Response(image_bytes, mimetype=image.contentType)
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@api.post("/admin/support-tickets/<string:ticket_id>/attachments")
def upload_support_ticket_attachment(ticket_id: str):
    resource = RESOURCES["support-attachments"]
    permission_error = _authorize_resource(resource, write=True)
    if permission_error:
        return permission_error
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error
    if request.content_length is not None and request.content_length > 5 * 1024 * 1024 + 128 * 1024:
        return _json_error("Support attachments must be no larger than 5 MB", 413)

    upload = request.files.get("file")
    if upload is None:
        return _json_error("Choose a file to upload", 400)
    content_type = (upload.mimetype or "").lower()
    allowed_types = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
    }
    if content_type not in allowed_types:
        return _json_error("Upload a PDF, JPEG, PNG, GIF, or WebP file", 400)
    file_bytes = upload.stream.read(5 * 1024 * 1024 + 1)
    if not file_bytes or len(file_bytes) > 5 * 1024 * 1024:
        return _json_error("Support attachments must be no larger than 5 MB", 400)
    signature_matches = {
        "application/pdf": file_bytes.startswith(b"%PDF-"),
        "image/jpeg": file_bytes.startswith(b"\xff\xd8\xff"),
        "image/png": file_bytes.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/gif": file_bytes.startswith((b"GIF87a", b"GIF89a")),
        "image/webp": file_bytes.startswith(b"RIFF") and file_bytes[8:12] == b"WEBP",
    }
    if not signature_matches[content_type]:
        return _json_error("The uploaded file does not match its file type", 400)

    file_name = os.path.basename((upload.filename or "").replace("\\", "/"))
    file_name = re.sub(r"[^A-Za-z0-9._ -]", "_", file_name).strip()[:180]
    if not file_name:
        return _json_error("The uploaded file must have a valid file name", 400)
    storage_key = f"support-ticket/{ticket_id}/{secrets.token_urlsafe(24)}"

    async def create_attachment(client: Prisma):
        identity = _current_identity()
        branch_id = _branch_id_for_identity(identity) if identity else None
        ticket_where: dict[str, Any] = {"id": ticket_id}
        if identity and identity.get("role") == "admin":
            ticket_where["branchId"] = branch_id
        ticket = await client.supportticket.find_first(where=ticket_where)
        if ticket is None:
            return None
        return await client.supportticketattachment.create(data={
            "ticketId": ticket_id,
            "fileName": file_name,
            "storageKey": storage_key,
            "contentType": content_type,
            "fileData": base64.b64encode(file_bytes).decode("ascii"),
        })

    try:
        attachment = _db(create_attachment)
    except Exception:
        logger.exception("Could not save an attachment for support ticket %s", ticket_id)
        return _json_error("Could not save the support attachment", 500)
    if attachment is None:
        return _json_error("Support ticket not found", 404)
    item = _serialize(attachment)
    item["fileUrl"] = f"/api/v1/admin/support-attachments/{item['id']}/file"
    item.pop("fileData", None)
    return jsonify({"item": item}), 201


@api.get("/admin/support-attachments/<int:attachment_id>/file")
def admin_support_ticket_attachment_file(attachment_id: int):
    resource = RESOURCES["support-attachments"]
    permission_error = _authorize_resource(resource)
    if permission_error:
        return permission_error

    async def find_attachment(client: Prisma):
        return await client.supportticketattachment.find_unique(
            where={"id": attachment_id},
            include={"ticket": True},
        )

    try:
        attachment = _db(find_attachment)
    except Exception:
        logger.exception("Could not load support attachment %s", attachment_id)
        return _json_error("Could not load the support attachment", 500)
    identity = _current_identity()
    if (
        attachment is None
        or (
            identity
            and identity.get("role") == "admin"
            and (
                attachment.ticket is None
                or attachment.ticket.branchId != _branch_id_for_identity(identity)
            )
        )
        or not attachment.fileData
    ):
        return _json_error("Support attachment not found", 404)
    try:
        file_bytes = base64.b64decode(attachment.fileData, validate=True)
    except (binascii.Error, ValueError):
        logger.error("Stored support attachment %s has invalid file data", attachment_id)
        return _json_error("Support attachment is unavailable", 500)

    allowed_types = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
    }
    content_type = attachment.contentType
    if content_type not in allowed_types:
        content_type = "application/octet-stream"
    file_name = re.sub(
        r"[^A-Za-z0-9._ -]",
        "_",
        os.path.basename(attachment.fileName.replace("\\", "/")),
    ).strip()[:180] or "support-attachment"
    response = Response(file_bytes, mimetype=content_type)
    response.headers["Content-Disposition"] = f'attachment; filename="{file_name}"'
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@api.get("/auth/csrf")
def csrf_token():
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_urlsafe(32)
    return jsonify({"csrfToken": session["csrf_token"]})


@api.post("/auth/register")
def register_customer():
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _json_error("A JSON object is required", 400)
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    if not all(isinstance(value, str) and value.strip() for value in (name, email, password)):
        return _json_error("name, email, and password are required", 400)
    if len(password) < 12:
        return _json_error("Password must contain at least 12 characters", 400)

    async def create_customer(client: Prisma):
        return await client.customer.create(data={
            "name": name.strip(),
            "email": email.strip().lower(),
            "phone": data.get("phone"),
            "passwordHash": generate_password_hash(password),
        })

    try:
        customer = _db(create_customer)
    except Exception:
        logger.exception("Customer registration failed")
        return _json_error("Could not register customer; the email may already be in use", 409)

    return _login_result({
        "id": customer.id,
        "role": "customer",
        "name": customer.name,
        "email": customer.email,
    }), 201


@api.post("/auth/email-verification/send")
@_authenticated({"customer"})
def send_customer_email_verification():
    identity = _current_identity()

    async def find_customer(client: Prisma):
        return await client.customer.find_unique(where={"id": identity["id"]})

    try:
        customer = _db(find_customer)
    except Exception:
        logger.exception("Could not load customer for email verification")
        return _json_error("Could not start email verification", 503)
    if customer is None:
        return _json_error("Customer account not found", 404)
    if customer.emailVerified:
        return jsonify({"emailVerified": True})

    now = datetime.now(timezone.utc)
    if customer.emailVerificationSentAt:
        sent_at = customer.emailVerificationSentAt
        if sent_at.tzinfo is None:
            sent_at = sent_at.replace(tzinfo=timezone.utc)
        wait_seconds = 60 - int((now - sent_at).total_seconds())
        if wait_seconds > 0:
            return _json_error(
                f"Please wait {wait_seconds} seconds before requesting another code",
                429,
            )

    code = f"{secrets.randbelow(1_000_000):06d}"
    secret_key = current_app.secret_key
    if not secret_key:
        logger.error("Email verification requires a configured session key")
        return _json_error("Email verification is not configured", 503)
    if isinstance(secret_key, str):
        secret_key = secret_key.encode("utf-8")
    code_hash = hmac.new(
        secret_key,
        f"{customer.id}:{code}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    async def save_code(client: Prisma):
        return await client.customer.update(
            where={"id": customer.id},
            data={
                "emailVerificationCodeHash": code_hash,
                "emailVerificationExpiresAt": now + timedelta(minutes=10),
                "emailVerificationSentAt": now,
                "emailVerificationAttempts": 0,
            },
        )

    try:
        _db(save_code)
    except Exception:
        logger.exception("Could not save customer email verification code")
        return _json_error("Could not start email verification", 503)

    try:
        send_verification_code(customer.email, code)
    except (EmailConfigurationError, OSError, TimeoutError):
        logger.exception("Could not send customer email verification code")

        async def clear_code(client: Prisma):
            return await client.customer.update(
                where={"id": customer.id},
                data={
                    "emailVerificationCodeHash": None,
                    "emailVerificationExpiresAt": None,
                    "emailVerificationAttempts": 0,
                },
            )

        try:
            _db(clear_code)
        except Exception:
            logger.exception("Could not clear unsent email verification code")
        return _json_error("Could not send a verification email", 503)

    return jsonify({"message": "A verification code was sent to your email"})


@api.post("/auth/email-verification/verify")
@_authenticated({"customer"})
def verify_customer_email():
    data = request.get_json(silent=True)
    code = data.get("code") if isinstance(data, dict) else None
    if not isinstance(code, str) or len(code) != 6 or not code.isdigit():
        return _json_error("Enter the six-digit verification code", 400)

    identity = _current_identity()

    async def find_customer(client: Prisma):
        return await client.customer.find_unique(where={"id": identity["id"]})

    try:
        customer = _db(find_customer)
    except Exception:
        logger.exception("Could not load customer for email verification")
        return _json_error("Could not verify email", 503)
    if customer is None:
        return _json_error("Customer account not found", 404)
    if customer.emailVerified:
        return jsonify({"emailVerified": True})
    if not customer.emailVerificationCodeHash or not customer.emailVerificationExpiresAt:
        return _json_error("Request a new verification code first", 400)

    now = datetime.now(timezone.utc)
    expires_at = customer.emailVerificationExpiresAt
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        async def clear_expired_code(client: Prisma):
            return await client.customer.update(
                where={"id": customer.id},
                data={
                    "emailVerificationCodeHash": None,
                    "emailVerificationExpiresAt": None,
                    "emailVerificationAttempts": 0,
                },
            )

        try:
            _db(clear_expired_code)
        except Exception:
            logger.exception("Could not clear expired email verification code")
            return _json_error("Could not verify email", 503)
        return _json_error("The verification code expired; request a new one", 400)

    attempts = customer.emailVerificationAttempts or 0
    if attempts >= 5:
        return _json_error("Too many incorrect codes; request a new one", 429)

    secret_key = current_app.secret_key
    if isinstance(secret_key, str):
        secret_key = secret_key.encode("utf-8")
    expected_hash = hmac.new(
        secret_key,
        f"{customer.id}:{code}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(customer.emailVerificationCodeHash, expected_hash):
        new_attempts = attempts + 1

        async def record_failed_attempt(client: Prisma):
            return await client.customer.update(
                where={"id": customer.id},
                data={
                    "emailVerificationAttempts": new_attempts,
                    **(
                        {
                            "emailVerificationCodeHash": None,
                            "emailVerificationExpiresAt": None,
                            "emailVerificationSentAt": None,
                            "emailVerificationAttempts": 0,
                        }
                        if new_attempts >= 5
                        else {}
                    ),
                },
            )

        try:
            _db(record_failed_attempt)
        except Exception:
            logger.exception("Could not record email verification attempt")
            return _json_error("Could not verify email", 503)
        if new_attempts >= 5:
            return _json_error("Too many incorrect codes; request a new one", 429)
        return _json_error("The verification code is incorrect", 400)

    async def mark_verified(client: Prisma):
        return await client.customer.update(
            where={"id": customer.id},
            data={
                "emailVerified": True,
                "emailVerificationCodeHash": None,
                "emailVerificationExpiresAt": None,
                "emailVerificationSentAt": None,
                "emailVerificationAttempts": 0,
            },
        )

    try:
        _db(mark_verified)
    except Exception:
        logger.exception("Could not mark customer email as verified")
        return _json_error("Could not verify email", 503)
    return jsonify({"emailVerified": True})


@api.post("/auth/password-reset/send")
def send_password_reset():
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error
    data = request.get_json(silent=True)
    email = data.get("email") if isinstance(data, dict) else None
    if not isinstance(email, str):
        return _json_error("Enter a valid email address", 400)
    email = email.strip().lower()
    if len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        return _json_error("Enter a valid email address", 400)

    generic_response = jsonify({
        "message": "If an account exists for that email, a reset code will be sent."
    })

    async def find_customer(client: Prisma):
        return await client.customer.find_unique(where={"email": email})

    try:
        customer = _db(find_customer)
    except Exception:
        logger.exception("Could not look up account for password reset")
        return _json_error("Password reset is temporarily unavailable", 503)
    if customer is None or not customer.passwordHash:
        return generic_response, 202

    now = datetime.now(timezone.utc)
    if customer.passwordResetSentAt:
        sent_at = customer.passwordResetSentAt
        if sent_at.tzinfo is None:
            sent_at = sent_at.replace(tzinfo=timezone.utc)
        if (now - sent_at).total_seconds() < 60:
            return generic_response, 202

    code = f"{secrets.randbelow(1_000_000):06d}"
    try:
        code_hash = _password_reset_code_hash(customer.id, code)
    except RuntimeError:
        logger.exception("Password reset is missing its signing secret")
        return _json_error("Password reset is temporarily unavailable", 503)

    async def save_code(client: Prisma):
        return await client.customer.update(
            where={"id": customer.id},
            data={
                "passwordResetCodeHash": code_hash,
                "passwordResetExpiresAt": now + timedelta(minutes=10),
                "passwordResetSentAt": now,
                "passwordResetAttempts": 0,
            },
        )

    try:
        _db(save_code)
    except Exception:
        logger.exception("Could not save customer password reset code")
        return _json_error("Password reset is temporarily unavailable", 503)

    try:
        send_password_reset_code(customer.email, code)
    except Exception as error:
        logger.exception("Could not send customer password reset email")

        async def clear_unsent_code(client: Prisma):
            return await client.customer.update(
                where={"id": customer.id},
                data={
                    "passwordResetCodeHash": None,
                    "passwordResetExpiresAt": None,
                    "passwordResetSentAt": None,
                    "passwordResetAttempts": 0,
                },
            )

        try:
            _db(clear_unsent_code)
        except Exception:
            logger.exception("Could not clear unsent password reset code")
        debug_email_errors = (
            os.getenv("APP_ENV", "").strip().lower() == "development"
            and os.getenv("EMAIL_DEBUG_ERRORS", "").strip().lower()
            in {"1", "true", "yes"}
        )
        if debug_email_errors:
            diagnostic = getattr(error, "diagnostic", type(error).__name__)
            return _json_error(f"Password reset email failed: {diagnostic}", 503)
    return generic_response, 202


@api.post("/auth/password-reset/confirm")
def confirm_password_reset():
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _json_error("A JSON object is required", 400)
    email = data.get("email")
    code = data.get("code")
    new_password = data.get("newPassword")
    if not isinstance(email, str):
        return _json_error("Enter a valid email address", 400)
    email = email.strip().lower()
    if len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        return _json_error("Enter a valid email address", 400)
    if not isinstance(code, str) or len(code) != 6 or not code.isdigit():
        return _json_error("Enter the six-digit reset code", 400)
    if not isinstance(new_password, str) or len(new_password) < 12:
        return _json_error("Password must contain at least 12 characters", 400)

    async def find_customer(client: Prisma):
        return await client.customer.find_unique(where={"email": email})

    try:
        customer = _db(find_customer)
    except Exception:
        logger.exception("Could not look up account for password reset")
        return _json_error("Password reset is temporarily unavailable", 503)
    if customer is None or not customer.passwordHash:
        return _json_error("The reset code is invalid or expired", 400)
    if not customer.passwordResetCodeHash or not customer.passwordResetExpiresAt:
        return _json_error("Request a new password reset code", 400)

    expires_at = customer.passwordResetExpiresAt
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        async def clear_expired_code(client: Prisma):
            return await client.customer.update(
                where={"id": customer.id},
                data={
                    "passwordResetCodeHash": None,
                    "passwordResetExpiresAt": None,
                    "passwordResetAttempts": 0,
                },
            )

        try:
            _db(clear_expired_code)
        except Exception:
            logger.exception("Could not clear expired password reset code")
            return _json_error("Password reset is temporarily unavailable", 503)
        return _json_error("The reset code expired; request a new one", 400)

    attempts = customer.passwordResetAttempts or 0
    if attempts >= 5:
        return _json_error("Too many incorrect codes; request a new one", 429)

    expected_hash = _password_reset_code_hash(customer.id, code)
    if not hmac.compare_digest(customer.passwordResetCodeHash, expected_hash):
        new_attempts = attempts + 1
        async def record_failed_attempt(client: Prisma):
            return await client.customer.update(
                where={"id": customer.id},
                data={
                    "passwordResetAttempts": (
                        0 if new_attempts >= 5 else new_attempts
                    ),
                    **(
                        {
                            "passwordResetCodeHash": None,
                            "passwordResetExpiresAt": None,
                        }
                        if new_attempts >= 5
                        else {}
                    ),
                },
            )

        try:
            _db(record_failed_attempt)
        except Exception:
            logger.exception("Could not record password reset attempt")
            return _json_error("Password reset is temporarily unavailable", 503)
        if new_attempts >= 5:
            return _json_error("Too many incorrect codes; request a new one", 429)
        return _json_error("The reset code is incorrect", 400)

    async def reset_customer_password(client: Prisma):
        return await client.customer.update(
            where={"id": customer.id},
            data={
                "passwordHash": generate_password_hash(new_password),
                "passwordResetCodeHash": None,
                "passwordResetExpiresAt": None,
                "passwordResetSentAt": None,
                "passwordResetAttempts": 0,
            },
        )

    try:
        _db(reset_customer_password)
    except Exception:
        logger.exception("Could not reset customer password")
        return _json_error("Password reset is temporarily unavailable", 503)
    return jsonify({"message": "Password reset successfully. You can now sign in."})


@api.post("/auth/login")
def login():
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _json_error("A JSON object is required", 400)
    email = data.get("email", data.get("username"))
    password = data.get("password")
    requested_role = data.get("role")
    if not isinstance(email, str) or not isinstance(password, str):
        return _json_error("email and password are required", 400)
    if requested_role is not None and (
        not isinstance(requested_role, str)
        or requested_role not in {"customer", "admin", "super_admin"}
    ):
        return _json_error("Unsupported account role", 400)

    async def find_account(client: Prisma):
        normalized_email = email.strip().lower()
        roles = (
            [requested_role]
            if requested_role is not None
            else ["customer", "admin", "super_admin"]
        )
        finders = {
            "customer": client.customer.find_unique,
            "admin": client.admin.find_unique,
            "super_admin": client.superadmin.find_unique,
        }
        accounts = await asyncio.gather(*(
            finders[account_role](where={"email": normalized_email})
            for account_role in roles
        ))
        matching_accounts = []
        for account_role, account in zip(roles, accounts):
            if account is None or (account_role == "admin" and not account.isActive):
                continue
            password_field = "passwordHash" if account_role == "customer" else "password"
            password_hash = getattr(account, password_field, None)
            try:
                valid_password = bool(password_hash) and check_password_hash(
                    password_hash,
                    password,
                )
            except (ValueError, TypeError):
                valid_password = False
            if valid_password:
                matching_accounts.append((account_role, account))

        if len(matching_accounts) != 1:
            return None, None

        account_role, account = matching_accounts[0]
        if account_role == "admin":
            account = await client.admin.update(
                where={"id": account.id},
                data={"lastLogin": datetime.now().astimezone()},
            )
        return account_role, account

    try:
        role, account = _db(find_account)
    except Exception:
        logger.exception("Authentication lookup failed")
        return _json_error("Authentication service unavailable", 503)

    if account is None:
        return _json_error("Invalid email or password", 401)

    identity = {"id": account.id, "role": role, "email": account.email}
    if role == "customer":
        identity["name"] = account.name
    elif role == "admin":
        identity["branchId"] = account.assignedBranchId
        identity["permissions"] = account.permissions
        identity["mustChangePassword"] = account.mustChangePassword
    else:
        identity["permissions"] = account.permissions
        identity["mustChangePassword"] = account.mustChangePassword
    return _login_result(identity)


@api.post("/auth/logout")
@_authenticated()
def logout():
    session.clear()
    return jsonify({"status": "signed_out"})


@api.get("/auth/me")
@_authenticated()
def current_user():
    return jsonify({"user": _current_identity()})


@api.get("/admin/profile")
def admin_profile():
    identity = _current_identity()
    if identity is None or identity.get("role") not in {"admin", "super_admin"}:
        return _json_error("Administrator authentication required", 401)
    try:
        if not _refresh_admin_identity(identity):
            return _json_error("Administrator account is unavailable", 401)
    except Exception:
        logger.exception("Could not verify administrator profile access")
        return _json_error("Could not verify administrator access", 503)
    if identity.get("mustChangePassword"):
        return _json_error("Change the temporary password before continuing", 403)

    async def load_profile(client: Prisma):
        if identity["role"] == "admin":
            account = await client.admin.find_unique(where={"id": identity["id"]})
            if account is None:
                return None
            branch_id = account.assignedBranchId
            branch = await client.branch.find_unique(where={"id": branch_id})
            staff = await client.staffmember.find_first(
                where={"email": account.email, "branchId": branch_id}
            )
            return {
                "id": account.id,
                "email": account.email,
                "role": account.role,
                "permissions": account.permissions,
                "branchId": branch_id,
                "branchName": branch.name if branch else None,
                "accountStatus": "Active" if account.isActive else "Disabled",
                "lastLogin": account.lastLogin,
                "staffId": staff.id if staff else None,
                "name": staff.name if staff else None,
                "phone": staff.phone if staff else None,
                "staffRole": staff.role if staff else None,
            }

        account = await client.superadmin.find_unique(where={"id": identity["id"]})
        if account is None:
            return None
        branch_id = session.get("selected_branch_id")
        branch = (
            await client.branch.find_unique(where={"id": branch_id})
            if isinstance(branch_id, int)
            else None
        )
        return {
            "id": account.id,
            "email": account.email,
            "role": account.role,
            "permissions": account.permissions,
            "branchId": branch_id,
            "branchName": branch.name if branch else "All branches",
            "accountStatus": "Active",
            "lastLogin": None,
            "staffId": None,
            "name": None,
            "phone": None,
            "staffRole": None,
        }

    try:
        profile = _db(load_profile)
    except Exception:
        logger.exception("Could not load administrator profile")
        return _json_error("Could not load administrator profile", 500)
    if profile is None:
        return _json_error("Administrator account is unavailable", 404)
    return jsonify({"profile": _serialize(profile)})


@api.post("/auth/change-password")
@_authenticated({"admin", "super_admin", "customer"})
def change_password():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _json_error("A JSON object is required", 400)
    current_password = data.get("currentPassword")
    new_password = data.get("newPassword")
    if not isinstance(current_password, str) or not isinstance(new_password, str):
        return _json_error("Current and new passwords are required", 400)
    if len(new_password) < 14:
        return _json_error("New password must contain at least 14 characters", 400)
    identity = _current_identity()
    model_name = {
        "customer": "customer",
        "admin": "admin",
        "super_admin": "superadmin",
    }[identity["role"]]
    password_field = "passwordHash" if identity["role"] == "customer" else "password"

    async def update_password(client: Prisma):
        model = getattr(client, model_name)
        account = await model.find_unique(where={"id": identity["id"]})
        if account is None or not check_password_hash(
            getattr(account, password_field),
            current_password,
        ):
            raise ValueError("Current password is incorrect")
        await model.update(
            where={"id": identity["id"]},
            data={
                password_field: generate_password_hash(new_password),
                **(
                    {"mustChangePassword": False}
                    if identity["role"] in {"admin", "super_admin"}
                    else {}
                ),
            },
        )
        return account

    try:
        _db(update_password)
    except ValueError as error:
        return _json_error(str(error), 400)
    except Exception:
        logger.exception("Could not update account password")
        return _json_error("Could not update password", 500)
    identity["mustChangePassword"] = False
    session["identity"] = identity
    return jsonify({"status": "password_updated"})


@api.route("/admin/branch-context", methods=["GET", "POST"])
def admin_branch_context():
    identity = _current_identity()
    if identity is None or identity.get("role") not in {"admin", "super_admin"}:
        return _json_error("Administrator authentication required", 401)
    try:
        if not _refresh_admin_identity(identity):
            return _json_error("Administrator account is unavailable", 401)
    except Exception:
        logger.exception("Could not verify administrator branch access")
        return _json_error("Could not verify administrator access", 503)
    if identity.get("mustChangePassword"):
        return _json_error("Change the temporary password before continuing", 403)
    if request.method == "POST":
        csrf_error = _require_csrf()
        if csrf_error:
            return csrf_error
    if identity["role"] == "admin":
        if request.method == "POST":
            return _json_error("Branch administrators cannot change their assigned branch", 403)
        branch_id = identity.get("branchId")
        if not isinstance(branch_id, int):
            return _json_error("This admin account has no assigned branch", 403)
        async def load_assigned_branch(client: Prisma):
            branch = await client.branch.find_unique(where={"id": branch_id})
            return [branch] if branch and branch.isActive else []

        try:
            branches = _db(load_assigned_branch)
        except Exception:
            logger.exception("Could not load assigned admin branch")
            return _json_error("Could not load branch access", 500)
        if not branches:
            return _json_error("Assigned branch is unavailable", 403)
        return jsonify({
            "branches": _serialize(branches),
            "activeBranchId": branch_id,
            "canSelectBranch": False,
        })

    if request.method == "POST":
        data = request.get_json(silent=True)
        if not isinstance(data, dict) or set(data) != {"branchId"}:
            return _json_error("branchId is required (null selects all branches)", 400)
        branch_id = data["branchId"]
        if branch_id is not None and (
            not isinstance(branch_id, int) or isinstance(branch_id, bool)
        ):
            return _json_error("branchId must be an integer or null", 400)

        async def select_branch(client: Prisma):
            if branch_id is not None:
                branch = await client.branch.find_unique(where={"id": branch_id})
                if branch is None or not branch.isActive:
                    raise ValueError("Selected branch is unavailable")
            await _write_audit_log(
                client,
                identity,
                "branch_context_changed",
                "Branch",
                branch_id or 0,
                branch_id,
                {"selectedBranchId": branch_id},
            )

        try:
            _db(select_branch)
        except ValueError as error:
            return _json_error(str(error), 400)
        except Exception:
            logger.exception("Could not update selected branch")
            return _json_error("Could not update branch context", 500)
        if branch_id is None:
            session.pop("selected_branch_id", None)
        else:
            session["selected_branch_id"] = branch_id

    async def load_branches(client: Prisma):
        return await client.branch.find_many(where={"isActive": True})

    try:
        branches = _db(load_branches)
    except Exception:
        logger.exception("Could not load branch choices")
        return _json_error("Could not load branches", 500)
    return jsonify({
        "branches": _serialize(branches),
        "activeBranchId": session.get("selected_branch_id"),
        "canSelectBranch": True,
    })


ADMIN_PERMISSIONS = {
    "manage_orders",
    "manage_inventory",
    "manage_customers",
    "view_customers",
    "manage_users",
    "view_reports",
    "manage_promotions",
    "view_audit_logs",
}


class AdminAccountConflict(Exception):
    pass


def _admin_account_response(account: Any) -> dict[str, Any]:
    return {
        "id": account.id,
        "username": account.email,
        "assignedBranchId": account.assignedBranchId,
        "permissions": account.permissions,
        "isActive": account.isActive,
        "mustChangePassword": account.mustChangePassword,
        "lastLogin": account.lastLogin,
        "createdAt": account.createdAt,
        "updatedAt": account.updatedAt,
    }


def _admin_user_payload(*, creating: bool) -> tuple[dict[str, Any] | None, Any]:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, _json_error("A JSON object is required", 400)
    allowed = {"username", "assignedBranchId", "permissions", "isActive"}
    if creating:
        allowed.add("password")
    else:
        allowed.add("password")
    if set(data) - allowed:
        return None, _json_error("Unsupported administrator account fields", 400)
    username = data.get("username")
    if creating and (
        not isinstance(username, str)
        or not username.strip()
    ):
        return None, _json_error("An administrator email is required", 400)
    if username is not None and (
        not isinstance(username, str)
        or not username.strip()
        or "@" not in username
        or any(character.isspace() for character in username)
    ):
        return None, _json_error("A valid administrator email is required", 400)
    password = data.get("password")
    if creating and (not isinstance(password, str) or len(password) < 14):
        return None, _json_error("Password must contain at least 14 characters", 400)
    if password is not None and (
        not isinstance(password, str) or len(password) < 14
    ):
        return None, _json_error("Password must contain at least 14 characters", 400)
    branch_id = data.get("assignedBranchId")
    if branch_id is not None and (
        not isinstance(branch_id, int) or isinstance(branch_id, bool)
    ):
        return None, _json_error("assignedBranchId must be an integer", 400)
    if not creating and "assignedBranchId" in data and branch_id is None:
        return None, _json_error("An assigned branch is required", 400)
    if creating and branch_id is None:
        return None, _json_error("An assigned branch is required", 400)
    permissions = data.get("permissions")
    if permissions is not None and (
        not isinstance(permissions, list)
        or any(
            not isinstance(permission, str) or permission not in ADMIN_PERMISSIONS
            for permission in permissions
        )
        or len(permissions) != len(set(permissions))
    ):
        return None, _json_error("One or more administrator permissions are invalid", 400)
    is_active = data.get("isActive")
    if is_active is not None and not isinstance(is_active, bool):
        return None, _json_error("isActive must be a boolean", 400)
    cleaned = dict(data)
    if username is not None:
        cleaned["username"] = username.strip().lower()
    return cleaned, None


def _require_super_admin():
    identity = _current_identity()
    if identity is None:
        return None, _json_error("Administrator authentication required", 401)
    if identity.get("role") != "super_admin":
        return None, _json_error("This operation is restricted to super administrators", 403)
    if identity.get("mustChangePassword"):
        return None, _json_error("Change the temporary password before continuing", 403)
    return identity, None


@api.route("/admin/accounts", methods=["GET", "POST"])
def admin_accounts():
    identity, permission_error = _require_super_admin()
    if permission_error:
        return permission_error
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error

    if request.method == "GET":
        async def list_accounts(client: Prisma):
            return await client.admin.find_many()

        try:
            accounts = _db(list_accounts)
        except Exception:
            logger.exception("Could not list administrator accounts")
            return _json_error("Could not load administrator accounts", 500)
        return jsonify({"items": _serialize([
            _admin_account_response(account) for account in accounts
        ])})

    data, error = _admin_user_payload(creating=True)
    if error:
        return error

    async def create_account(client: Prisma):
        async with client.tx(max_wait=10_000, timeout=30_000) as transaction:
            existing_account = await transaction.admin.find_unique(
                where={"email": data["username"]}
            )
            if existing_account is not None:
                raise AdminAccountConflict(
                    "An administrator account with this email already exists"
                )
            branch = await transaction.branch.find_unique(
                where={"id": data["assignedBranchId"]}
            )
            if branch is None or not branch.isActive:
                raise ValueError("Selected branch is unavailable")
            account = await transaction.admin.create(data={
                "email": data["username"],
                "password": generate_password_hash(data["password"]),
                "permissions": data.get("permissions", []),
                "assignedBranchId": data["assignedBranchId"],
                "isActive": data.get("isActive", True),
                "mustChangePassword": True,
            })
            await _write_audit_log(
                transaction,
                identity,
                "admin_account_created",
                "Admin",
                account.id,
                account.assignedBranchId,
                {"after": _admin_account_response(account)},
            )
            return account

    try:
        account = _db(create_account)
    except AdminAccountConflict as exception:
        return _json_error(str(exception), 409)
    except ValueError as exception:
        return _json_error(str(exception), 400)
    except Exception:
        logger.exception("Could not create administrator account")
        return _json_error("Could not create administrator account", 500)
    return jsonify({"item": _admin_account_response(account)}), 201


@api.route("/admin/accounts/<int:account_id>", methods=["PATCH", "DELETE"])
def admin_account(account_id: int):
    identity, permission_error = _require_super_admin()
    if permission_error:
        return permission_error
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error

    data: dict[str, Any] = {}
    if request.method == "PATCH":
        data, error = _admin_user_payload(creating=False)
        if error:
            return error

    async def update_account(client: Prisma):
        async with client.tx() as transaction:
            account = await transaction.admin.find_unique(where={"id": account_id})
            if account is None:
                return None
            before = _admin_account_response(account)
            if request.method == "DELETE":
                await transaction.admin.delete(where={"id": account_id})
                await _write_audit_log(
                    transaction,
                    identity,
                    "admin_account_deleted",
                    "Admin",
                    account.id,
                    account.assignedBranchId,
                    {"before": before},
                )
                return {"deleted": True}

            update_data: dict[str, Any] = {}
            if data.get("username") and data["username"] != account.email:
                existing_account = await transaction.admin.find_unique(
                    where={"email": data["username"]}
                )
                if existing_account is not None:
                    raise AdminAccountConflict(
                        "An administrator account with this email already exists"
                    )
            for key, model_field in (
                ("username", "email"),
                ("permissions", "permissions"),
                ("assignedBranchId", "assignedBranchId"),
                ("isActive", "isActive"),
            ):
                if key in data:
                    update_data[model_field] = data[key]
            if "password" in data:
                update_data["password"] = generate_password_hash(data["password"])
                update_data["mustChangePassword"] = True
            if "assignedBranchId" in update_data:
                branch = await transaction.branch.find_unique(
                    where={"id": update_data["assignedBranchId"]}
                )
                if branch is None or not branch.isActive:
                    raise ValueError("Selected branch is unavailable")
            updated = await transaction.admin.update(
                where={"id": account_id},
                data=update_data,
            )
            await _write_audit_log(
                transaction,
                identity,
                "admin_account_updated",
                "Admin",
                updated.id,
                updated.assignedBranchId,
                {
                    "before": before,
                    "after": _admin_account_response(updated),
                    "passwordReset": "password" in data,
                },
            )
            return {"item": _admin_account_response(updated)}

    try:
        result = _db(update_account)
    except AdminAccountConflict as exception:
        return _json_error(str(exception), 409)
    except ValueError as exception:
        return _json_error(str(exception), 400)
    except Exception:
        logger.exception("Could not update administrator account %s", account_id)
        return _json_error("Could not update administrator account", 500)
    if result is None:
        return _json_error("Administrator account not found", 404)
    return jsonify(result)


@api.post("/admin/branches/<int:branch_id>/manager-access")
def assign_branch_manager_access(branch_id: int):
    identity, permission_error = _require_super_admin()
    if permission_error:
        return permission_error
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error

    data = request.get_json(silent=True)
    if not isinstance(data, dict) or set(data) != {"staffId", "password"}:
        return _json_error("staffId and password are required", 400)
    staff_id = data["staffId"]
    password = data["password"]
    if not isinstance(staff_id, str) or not staff_id.strip():
        return _json_error("A staff member is required", 400)
    if not isinstance(password, str) or not 14 <= len(password) <= 128:
        return _json_error("Temporary password must be between 14 and 128 characters", 400)

    async def assign_manager(client: Prisma):
        async with client.tx(max_wait=10_000, timeout=30_000) as transaction:
            branch = await transaction.branch.find_unique(where={"id": branch_id})
            if branch is None or not branch.isActive:
                raise ValueError("Selected branch is unavailable")
            staff = await transaction.staffmember.find_unique(where={"id": staff_id})
            if staff is None:
                return None, None
            if str(staff.status or "").lower() != "active":
                raise ValueError("Only active staff can be assigned as branch managers")
            email = (staff.email or "").strip().lower()
            if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
                raise ValueError("The selected staff member must have a valid email address")

            customer = await transaction.customer.find_unique(where={"email": email})
            super_admin = await transaction.superadmin.find_unique(where={"email": email})
            if customer is not None or super_admin is not None:
                raise AdminAccountConflict(
                    "This email is already used by another account role; use a different staff email"
                )

            account = await transaction.admin.find_unique(where={"email": email})
            staff_before = {
                "id": staff.id,
                "branchId": staff.branchId,
                "role": staff.role,
                "email": staff.email,
            }
            updated_staff = await transaction.staffmember.update(
                where={"id": staff_id},
                data=_prepare_model_data("staffmember", {
                    "branchId": branch_id,
                    "role": "Branch Manager",
                    "email": email,
                }, creating=False),
            )
            account_data = {
                "password": generate_password_hash(password),
                "permissions": [
                    "manage_orders",
                    "manage_inventory",
                    "view_customers",
                    "view_reports",
                ],
                "assignedBranchId": branch_id,
                "isActive": True,
                "mustChangePassword": True,
            }
            if account is None:
                account = await transaction.admin.create(data={
                    "email": email,
                    **account_data,
                })
                action = "branch_manager_account_created"
                before = None
            else:
                before = _admin_account_response(account)
                account = await transaction.admin.update(
                    where={"id": account.id},
                    data=account_data,
                )
                action = "branch_manager_account_reassigned"
            await _write_audit_log(
                transaction,
                identity,
                action,
                "Admin",
                account.id,
                branch_id,
                {
                    "before": before,
                    "after": _admin_account_response(account),
                    "staffBefore": staff_before,
                    "staffAfter": {
                        "id": updated_staff.id,
                        "branchId": updated_staff.branchId,
                        "role": updated_staff.role,
                        "email": updated_staff.email,
                    },
                    "passwordReset": True,
                },
            )
            return updated_staff, account

    try:
        staff, account = _db(assign_manager)
    except AdminAccountConflict as error:
        return _json_error(str(error), 409)
    except ValueError as error:
        return _json_error(str(error), 400)
    except Exception:
        logger.exception("Could not assign a branch manager for branch %s", branch_id)
        return _json_error("Could not assign the branch manager or create credentials", 500)
    if staff is None or account is None:
        return _json_error("Staff member not found", 404)
    return jsonify({
        "staff": _serialize(staff),
        "account": _admin_account_response(account),
    }), 201


def _authorize_resource(resource: dict[str, Any], write: bool = False):
    identity = _current_identity()
    if identity is None:
        return _json_error("Administrator authentication required", 401)
    if identity.get("role") not in {"admin", "super_admin"}:
        return _json_error("Administrator permissions required", 403)
    try:
        if not _refresh_admin_identity(identity):
            return _json_error("Administrator account is unavailable", 401)
    except Exception:
        logger.exception("Could not verify administrator access")
        return _json_error("Could not verify administrator access", 503)
    if identity.get("mustChangePassword"):
        return _json_error("Change the temporary password before continuing", 403)
    if identity["role"] == "super_admin":
        if write and resource.get("read_only"):
            return _json_error("This resource is read-only", 405)
        return None
    if write and resource.get("read_only"):
        return _json_error("This resource is read-only", 405)
    permission = resource.get("permission")
    if identity["role"] == "admin" and not isinstance(identity.get("branchId"), int):
        return _json_error("This admin account has no assigned branch", 403)
    if write and resource["model"] == "customcakerequest":
        return _json_error("Only super administrators can update custom cake requests", 403)
    if permission is None:
        return _json_error("This operation is restricted to super administrators", 403)
    permissions = set(identity.get("permissions") or [])
    can_read_customer_data = (
        identity["role"] == "admin"
        and resource["model"] in {"customer", "customerfeedback"}
        and request.method == "GET"
        and bool(permissions.intersection({"view_customers", "manage_orders", "manage_customers"}))
    )
    if permission not in permissions and not can_read_customer_data:
        return _json_error("Insufficient permissions", 403)
    if write and resource["model"] in {
        "customer", "product", "promotion", "cateringpackage",
    }:
        if resource["model"] == "customer" and request.method == "PATCH":
            return None
        if resource["model"] != "product" or request.method != "PATCH":
            return _json_error("This operation is restricted to super administrators", 403)
    return None


def _validated_data(resource: dict[str, Any], *, include_id: bool = False):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, _json_error("A JSON object is required", 400)
    if resource["model"] == "order":
        protected_order_fields = {"paymentStatus"}
        if request.method == "PATCH":
            protected_order_fields.update({
                "customerId",
                "subtotal",
                "discountAmount",
                "taxAmount",
                "totalAmount",
                "paymentMethod",
            })
        protected = set(data) & protected_order_fields
        if protected:
            return None, _json_error(
                "Payment status cannot be set through this endpoint"
                if protected == {"paymentStatus"}
                else "Payment status, order ownership, and totals cannot be changed through this endpoint",
                400,
            )
    allowed = resource["fields"] | ({"id"} if include_id else set())
    unknown = set(data) - allowed
    if unknown:
        return None, _json_error(
            "Unsupported fields: " + ", ".join(sorted(unknown)), 400
        )
    if resource["model"] == "portfolioimage" and "imageUrl" in data:
        image_url = data["imageUrl"]
        if not isinstance(image_url, str) or len(image_url) > 2_800_000:
            return None, _json_error("Portfolio images must be no larger than 2 MB", 400)
        if not image_url.startswith(("https://", "http://", "/", "./", "../", "assets/")):
            return None, _json_error("Portfolio image URLs must use a supported image path", 400)
    if resource["model"] == "customizationoption" and data.get("price") is not None:
        try:
            price = Decimal(str(data["price"]))
        except (InvalidOperation, TypeError, ValueError):
            return None, _json_error("Base price must be a valid amount", 400)
        if not price.is_finite() or not Decimal("0") <= price <= Decimal("1000000"):
            return None, _json_error("Base price must be between 0 and 1,000,000", 400)
        data["price"] = price.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return data, None


@api.post("/admin/pos-sales")
def create_pos_sale():
    order_permission_error = _authorize_resource(RESOURCES["orders"], write=True)
    if order_permission_error:
        return order_permission_error
    inventory_permission_error = _authorize_resource(
        RESOURCES["branch-inventory"], write=True
    )
    if inventory_permission_error:
        return inventory_permission_error
    customer_permission_error = _authorize_resource(RESOURCES["customers"])
    if customer_permission_error:
        return customer_permission_error
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error

    data = request.get_json(silent=True)
    supported_fields = {
        "branchId", "customerId", "paymentMethod", "cashierConfirmed",
        "discountType", "discountValue", "items",
    }
    if not isinstance(data, dict) or set(data) - supported_fields:
        return _json_error("A valid POS sale is required", 400)
    branch_id = data.get("branchId")
    if not isinstance(branch_id, int) or isinstance(branch_id, bool):
        return _json_error("Select a branch before checkout", 400)
    identity = _current_identity()
    try:
        session_branch_id = _branch_id_for_identity(identity)
    except ValueError as error:
        return _json_error(str(error), 403)
    if identity["role"] == "admin" and branch_id != session_branch_id:
        return _json_error("You can only sell from your assigned branch", 403)
    if identity["role"] == "super_admin" and session_branch_id != branch_id:
        return _json_error("Select this branch before completing a sale", 403)
    if data.get("cashierConfirmed") is not True:
        return _json_error("Confirm that payment was received before checkout", 400)

    payment_method = str(data.get("paymentMethod") or "").strip().lower()
    if payment_method not in {"cash", "card", "gcash"}:
        return _json_error("Choose a supported payment method", 400)
    discount_type = str(data.get("discountType") or "none").strip().lower()
    if discount_type not in {"none", "senior", "pwd", "custom"}:
        return _json_error("Choose a supported discount type", 400)
    try:
        discount_value = Decimal(str(data.get("discountValue", 0)))
    except (TypeError, ValueError):
        return _json_error("Discount must be a percentage from 0 to 100", 400)
    if not discount_value.is_finite() or not Decimal("0") <= discount_value <= Decimal("100"):
        return _json_error("Discount must be a percentage from 0 to 100", 400)

    customer_id = data.get("customerId")
    if customer_id is not None and (
        not isinstance(customer_id, int) or isinstance(customer_id, bool)
    ):
        return _json_error("Customer id must be an integer", 400)
    items = data.get("items")
    if not isinstance(items, list) or not items or len(items) > 100:
        return _json_error("A sale must contain between 1 and 100 items", 400)

    normalized_items: list[dict[str, Any]] = []
    product_quantities: dict[int, int] = {}
    for item in items:
        if not isinstance(item, dict):
            return _json_error("Each sale item must be an object", 400)
        quantity = item.get("quantity")
        if (
            not isinstance(quantity, int)
            or isinstance(quantity, bool)
            or quantity < 1
            or quantity > 100
        ):
            return _json_error("Item quantities must be between 1 and 100", 400)
        product_id = item.get("productId")
        custom = item.get("custom")
        if product_id is not None:
            if (
                not isinstance(product_id, int)
                or isinstance(product_id, bool)
                or set(item) != {"productId", "quantity"}
            ):
                return _json_error("Product sale items are invalid", 400)
            product_quantities[product_id] = product_quantities.get(product_id, 0) + quantity
            normalized_items.append({"productId": product_id, "quantity": quantity})
            continue
        if set(item) != {"custom", "quantity"} or not isinstance(custom, dict):
            return _json_error("Custom sale items are invalid", 400)
        if set(custom) != {"name", "price", "details"}:
            return _json_error("Custom sale item details are invalid", 400)
        name = custom.get("name")
        details = custom.get("details")
        if (
            not isinstance(name, str)
            or not name.strip()
            or len(name.strip()) > 200
            or not isinstance(details, dict)
            or set(details) - {
                "cakeType", "size", "flavor", "theme", "instructions", "pickupDate",
            }
            or any(not isinstance(value, str) or len(value) > 500 for value in details.values())
        ):
            return _json_error("Custom sale item details are invalid", 400)
        if details.get("pickupDate"):
            try:
                date.fromisoformat(details["pickupDate"])
            except ValueError:
                return _json_error("Custom cake pickup date must be a valid ISO date", 400)
        try:
            price = Decimal(str(custom.get("price"))).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        except (InvalidOperation, TypeError, ValueError):
            return _json_error("Custom item price must be a valid amount", 400)
        if not price.is_finite() or not Decimal("0") < price <= Decimal("1000000"):
            return _json_error("Custom item price must be greater than zero", 400)
        normalized_items.append({
            "custom": {
                "name": name.strip(),
                "price": price,
                "details": details,
            },
            "quantity": quantity,
        })

    now = datetime.now().astimezone()
    walk_in_email = "walk-in@angelizcakes.invalid"

    async def create_sale(client: Prisma):
        async with client.tx(max_wait=10_000, timeout=30_000) as transaction:
            branch = await transaction.branch.find_unique(where={"id": branch_id})
            if branch is None or not branch.isActive:
                raise ValueError("Selected branch is unavailable")

            if customer_id is None:
                customer = await transaction.customer.find_unique(
                    where={"email": walk_in_email}
                )
                if customer is None:
                    customer = await transaction.customer.create(data={
                        "email": walk_in_email,
                        "name": "Walk-in Customer",
                        "channel": "Walk-in",
                    })
                elif customer.name != "Walk-in Customer" or customer.channel != "Walk-in":
                    raise ValueError("The reserved walk-in customer profile is unavailable")
            else:
                customer = await transaction.customer.find_unique(
                    where={"id": customer_id}
                )
                if customer is not None and customer.email != walk_in_email:
                    customer_branch = await transaction.customer.find_first(
                        where={
                            "id": customer.id,
                            **_branch_filter_for_model("customer", branch_id),
                        }
                    )
                    if customer_branch is None:
                        raise ValueError("Selected customer is unavailable at this branch")
            if customer is None or not customer.isActive or customer.isBlocked:
                raise ValueError("Selected customer is unavailable")

            line_items = []
            receipt_items = []
            subtotal = Decimal("0.00")
            for item in normalized_items:
                quantity = item["quantity"]
                product_id = item.get("productId")
                if product_id is not None:
                    inventory = await transaction.branchinventory.find_first(
                        where={"branchId": branch_id, "productId": product_id}
                    )
                    product = await transaction.product.find_unique(
                        where={"id": product_id}
                    )
                    if (
                        inventory is None
                        or product is None
                        or not product.isActive
                    ):
                        raise ValueError("A selected product is unavailable at this branch")
                    if inventory.quantity < product_quantities[product_id]:
                        raise ValueError(
                            f"Not enough stock for {product.name}; refresh inventory and try again"
                        )
                    price = Decimal(str(inventory.price)).quantize(
                        Decimal("0.01"), rounding=ROUND_HALF_UP
                    )
                    line_total = (price * quantity).quantize(
                        Decimal("0.01"), rounding=ROUND_HALF_UP
                    )
                    line_items.append({
                        "productId": product_id,
                        "quantity": quantity,
                        "pricePerUnit": price,
                        "subtotal": line_total,
                        "customizations": None,
                    })
                    receipt_items.append({
                        "name": product.name,
                        "quantity": quantity,
                        "pricePerUnit": str(price),
                        "subtotal": str(line_total),
                    })
                else:
                    custom = item["custom"]
                    price = custom["price"]
                    line_total = (price * quantity).quantize(
                        Decimal("0.01"), rounding=ROUND_HALF_UP
                    )
                    line_items.append({
                        "productId": None,
                        "quantity": quantity,
                        "pricePerUnit": price,
                        "subtotal": line_total,
                        "customizations": " · ".join([
                            custom["name"],
                            *(
                                f"{key}: {value}"
                                for key, value in custom["details"].items()
                                if value
                            ),
                        ]),
                    })
                    receipt_items.append({
                        "name": custom["name"],
                        "quantity": quantity,
                        "pricePerUnit": str(price),
                        "subtotal": str(line_total),
                    })
                subtotal += line_total

            subtotal = subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            discount_percent = (
                Decimal("20")
                if discount_type in {"senior", "pwd"}
                else discount_value
                if discount_type == "custom"
                else Decimal("0")
            )
            discount_amount = (subtotal * discount_percent / Decimal("100")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            total = subtotal - discount_amount
            order = await transaction.order.create(data=_prepare_model_data(
                "order",
                {
                    "customerId": customer.id,
                    "branchId": branch_id,
                    "status": "completed",
                    "orderDate": now,
                    "isPickup": True,
                    "subtotal": subtotal,
                    "discountAmount": discount_amount,
                    "taxAmount": Decimal("0.00"),
                    "totalAmount": total,
                    "paymentMethod": payment_method,
                    "paymentStatus": "completed",
                    "specialInstructions": (
                        f"POS discount: {discount_type}"
                        if discount_type != "none"
                        else None
                    ),
                    "channel": "pos",
                    "createdBy": identity.get("email"),
                },
                creating=True,
            ))
            for line_item in line_items:
                await transaction.orderitem.create(data=_prepare_model_data(
                    "orderitem",
                    {"orderId": order.id, **line_item},
                    creating=True,
                ))

            for product_id, quantity in product_quantities.items():
                inventory = await transaction.branchinventory.find_first(
                    where={"branchId": branch_id, "productId": product_id}
                )
                if inventory is None:
                    raise ValueError("A selected product is unavailable at this branch")
                result = await transaction.branchinventory.update_many(
                    where={"id": inventory.id, "quantity": {"gte": quantity}},
                    data={"quantity": {"decrement": quantity}},
                )
                if result.count != 1:
                    raise ValueError(
                        "Stock changed during checkout; refresh inventory and try again"
                    )

            await transaction.customer.update(
                where={"id": customer.id},
                data={
                    "totalSpent": {"increment": total},
                    "orderCount": {"increment": 1},
                    "lastOrderDate": now,
                },
            )
            await _write_audit_log(
                transaction,
                identity,
                "pos_sale_completed",
                "Order",
                order.id,
                branch_id,
                {
                    "paymentMethod": payment_method,
                    "itemCount": sum(item["quantity"] for item in normalized_items),
                    "total": str(total),
                },
            )
            return {
                "id": order.id,
                "branchId": branch_id,
                "customerId": customer.id,
                "customerName": customer.name,
                "subtotal": str(subtotal),
                "discountAmount": str(discount_amount),
                "totalAmount": str(total),
                "paymentMethod": payment_method,
                "paymentStatus": "completed",
                "items": receipt_items,
            }

    try:
        result = _db(create_sale)
    except ValueError as error:
        return _json_error(str(error), 400)
    except Exception:
        logger.exception("Could not complete POS sale for branch %s", branch_id)
        return _json_error("Could not complete the sale; no changes were saved", 500)
    return jsonify({"item": result}), 201


@api.get("/admin/pos-summary")
def get_pos_summary():
    permission_error = _authorize_resource(RESOURCES["orders"])
    if permission_error:
        return permission_error
    try:
        branch_id = int(request.args.get("branchId", ""))
    except ValueError:
        return _json_error("Select a branch to view POS totals", 400)
    identity = _current_identity()
    try:
        session_branch_id = _branch_id_for_identity(identity)
    except ValueError as error:
        return _json_error(str(error), 403)
    if session_branch_id != branch_id:
        return _json_error("Select this branch before viewing POS totals", 403)

    manila_timezone = timezone(timedelta(hours=8))
    today = datetime.now(manila_timezone).date()
    start = datetime.combine(today, datetime.min.time()).replace(tzinfo=manila_timezone)
    end = start + timedelta(days=1)

    async def load_summary(client: Prisma):
        orders = await client.order.find_many(where={
            "branchId": branch_id,
            "channel": "pos",
            "paymentStatus": "completed",
            "orderDate": {"gte": start, "lt": end},
        })
        revenue = sum(
            (Decimal(str(order.totalAmount)) for order in orders),
            Decimal("0.00"),
        )
        cash_sales = sum(
            (
                Decimal(str(order.totalAmount))
                for order in orders
                if str(order.paymentMethod or "").lower() == "cash"
            ),
            Decimal("0.00"),
        )
        return {
            "sales": str(revenue),
            "transactions": len(orders),
            "cashSales": str(cash_sales),
        }

    try:
        summary = _db(load_summary)
    except Exception:
        logger.exception("Could not load POS totals for branch %s", branch_id)
        return _json_error("Could not load POS totals", 500)
    return jsonify({"summary": summary})


@api.get("/admin/branch-reports/summary")
def branch_daily_report_summary():
    permission_error = _authorize_resource(RESOURCES["branch-reports"])
    if permission_error:
        return permission_error

    report_date_value = request.args.get("reportDate")
    if not report_date_value:
        return _json_error("reportDate is required", 400)
    try:
        report_date = date.fromisoformat(report_date_value)
    except ValueError:
        return _json_error("reportDate must be an ISO date", 400)

    identity = _current_identity()
    try:
        branch_id = _branch_id_for_identity(identity)
    except ValueError as error:
        return _json_error(str(error), 403)
    if branch_id is None:
        return _json_error("Select a branch before viewing its daily summary", 400)

    manila_timezone = timezone(timedelta(hours=8))
    start = datetime.combine(report_date, datetime.min.time()).replace(tzinfo=manila_timezone)
    end = start + timedelta(days=1)

    async def load_daily_orders(client: Prisma):
        branch = await client.branch.find_unique(where={"id": branch_id})
        if branch is None or not branch.isActive:
            raise ValueError("Selected branch is unavailable")
        return await client.order.find_many(where={
            "branchId": branch_id,
            "orderDate": {"gte": start, "lt": end},
        })

    try:
        orders = _db(load_daily_orders)
    except ValueError as error:
        return _json_error(str(error), 400)
    except Exception:
        logger.exception("Could not load daily order summary for branch %s", branch_id)
        return _json_error("Could not load the daily order summary", 500)

    completed_orders = [order for order in orders if order.status == "completed"]
    pending_orders = [
        order for order in orders
        if order.status in {"pending", "confirmed", "processing", "ready"}
    ]
    cancelled_orders = [
        order for order in orders if order.status in {"cancelled", "canceled"}
    ]
    paid_orders = [order for order in orders if order.paymentStatus == "completed"]
    sales = sum(
        (Decimal(str(order.totalAmount)) for order in paid_orders),
        Decimal("0.00"),
    )
    payment_totals = {
        "cash": Decimal("0.00"),
        "ewallet": Decimal("0.00"),
        "card": Decimal("0.00"),
    }
    for order in paid_orders:
        payment_method = (
            str(order.paymentMethod or "")
            .strip()
            .lower()
            .replace("-", "")
            .replace("_", "")
            .replace(" ", "")
        )
        if payment_method == "cash":
            payment_totals["cash"] += Decimal(str(order.totalAmount))
        elif payment_method in {"card", "creditcard", "debitcard"}:
            payment_totals["card"] += Decimal(str(order.totalAmount))
        elif payment_method in {"ewallet", "gcash", "maya", "paymaya", "paypal"}:
            payment_totals["ewallet"] += Decimal(str(order.totalAmount))

    return jsonify({"summary": {
        "totalOrders": len(orders),
        "completedOrders": len(completed_orders),
        "pendingOrders": len(pending_orders),
        "cancelledOrders": len(cancelled_orders),
        "totalSales": float(sales),
        "cashPayments": float(payment_totals["cash"]),
        "ewalletPayments": float(payment_totals["ewallet"]),
        "cardPayments": float(payment_totals["card"]),
        "totalTransactions": len(paid_orders),
    }})


@api.post("/admin/branch-reports")
def create_branch_daily_report():
    resource = RESOURCES["branch-reports"]
    permission_error = _authorize_resource(resource, write=True)
    if permission_error:
        return permission_error
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error

    data = request.get_json(silent=True)
    allowed_fields = {"branchId", "reportDate", "reportData"}
    if not isinstance(data, dict) or set(data) - allowed_fields:
        return _json_error("A valid daily branch report is required", 400)
    if not isinstance(data.get("reportDate"), str):
        return _json_error("reportDate must be an ISO date", 400)
    try:
        report_date = date.fromisoformat(data["reportDate"])
    except ValueError:
        return _json_error("reportDate must be an ISO date", 400)

    report_data = data.get("reportData")
    required_sections = {"orders", "sales", "cashChecking", "notes"}
    if not isinstance(report_data, dict) or set(report_data) != required_sections:
        return _json_error("Daily report data is incomplete", 400)
    order_fields = {"total", "completed", "pending", "cancelled"}
    sales_fields = {
        "totalSales", "cash", "ewallet", "card", "refunds", "totalTransactions",
    }
    cash_fields = {
        "startingCash", "cashSales", "cashRefunds", "expectedCash",
        "actualCash", "cashDifference",
    }
    for section_name, expected_fields in (
        ("orders", order_fields),
        ("sales", sales_fields),
        ("cashChecking", cash_fields),
    ):
        section = report_data.get(section_name)
        if not isinstance(section, dict) or set(section) != expected_fields:
            return _json_error(f"{section_name} report data is incomplete", 400)

    for field in order_fields | {"totalTransactions"}:
        value = (
            report_data["orders"][field]
            if field in order_fields
            else report_data["sales"][field]
        )
        if type(value) is not int or value < 0:
            return _json_error(f"{field} must be a non-negative integer", 400)

    def report_amount(section: dict[str, Any], field: str, *, signed: bool = False) -> Decimal:
        value = section[field]
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError(f"{field} must be a valid amount")
        try:
            amount = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError) as error:
            raise ValueError(f"{field} must be a valid amount") from error
        if not amount.is_finite() or (not signed and amount < 0):
            raise ValueError(f"{field} must be a valid amount")
        return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    try:
        sales = report_data["sales"]
        cash = report_data["cashChecking"]
        for field in sales_fields - {"totalTransactions"}:
            sales[field] = float(report_amount(sales, field))
        for field in cash_fields - {"expectedCash", "cashDifference"}:
            cash[field] = float(report_amount(cash, field))
        expected_cash = (
            Decimal(str(cash["startingCash"]))
            + Decimal(str(cash["cashSales"]))
            - Decimal(str(cash["cashRefunds"]))
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        cash["expectedCash"] = float(expected_cash)
        cash["cashDifference"] = float(
            (Decimal(str(cash["actualCash"])) - expected_cash).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP,
            )
        )
    except ValueError as error:
        return _json_error(str(error), 400)

    notes = report_data["notes"]
    if (
        not isinstance(notes, dict)
        or set(notes) != {"followUp", "closing"}
        or any(
            not isinstance(value, str) or len(value) > 4000
            for value in notes.values()
        )
    ):
        return _json_error("Report notes must be text no longer than 4,000 characters", 400)

    identity = _current_identity()
    try:
        branch_id = _branch_id_for_identity(identity)
    except ValueError as error:
        return _json_error(str(error), 403)
    requested_branch_id = data.get("branchId")
    if identity["role"] == "admin":
        if requested_branch_id is not None and requested_branch_id != branch_id:
            return _json_error("You can only submit a report for your assigned branch", 403)
    elif branch_id is None:
        if type(requested_branch_id) is not int or requested_branch_id <= 0:
            return _json_error("Select a branch before submitting the report", 400)
        branch_id = requested_branch_id
    elif requested_branch_id is not None and requested_branch_id != branch_id:
        return _json_error("Select a different branch using the branch selector", 403)

    report_record = {
        "branchId": branch_id,
        "reportDate": report_date.isoformat(),
        "managerName": str(identity.get("email") or "Administrator"),
        "reportData": report_data,
    }

    async def create_report(client: Prisma):
        async with client.tx(max_wait=10_000, timeout=30_000) as transaction:
            branch = await transaction.branch.find_unique(where={"id": branch_id})
            if branch is None or not branch.isActive:
                raise ValueError("Selected branch is unavailable")
            prepared = _prepare_model_data(
                "branchdailyreport",
                report_record,
                creating=True,
            )
            existing = await transaction.branchdailyreport.find_first(where={
                "branchId": branch_id,
                "reportDate": prepared["reportDate"],
            })
            if existing is not None:
                return None
            return await transaction.branchdailyreport.create(data=prepared)

    try:
        record = _db(create_report)
    except ValueError as error:
        return _json_error(str(error), 400)
    except Exception:
        logger.exception("Could not submit daily report for branch %s", branch_id)
        return _json_error("Could not save the daily branch report", 500)
    if record is None:
        return _json_error("A report already exists for this branch and date", 409)
    return jsonify({"item": _serialize(record)}), 201


@api.get("/admin/branch-management")
def branch_management():
    permission_error = _authorize_resource(RESOURCES["branches"])
    if permission_error:
        return permission_error
    try:
        limit = min(max(int(request.args.get("limit", 100)), 1), 500)
        offset = int(request.args.get("offset", 0))
    except ValueError:
        return _json_error("limit and offset must be integers", 400)
    if offset < 0:
        return _json_error("offset cannot be negative", 400)

    async def find_branches(client: Prisma):
        branches = await client.branch.find_many(
            take=limit,
            skip=offset,
            order={"name": "asc"},
        )
        total = await client.branch.count()
        return branches, total

    try:
        branches, total = _db(find_branches)
    except Exception:
        logger.exception("Could not load branches for management")
        return _json_error("Could not load branches", 500)
    return jsonify({
        "items": _serialize(branches),
        "total": total,
        "offset": offset,
        "limit": limit,
    })


@api.patch("/admin/branch-management/<int:branch_id>")
def update_managed_branch(branch_id: int):
    permission_error = _authorize_resource(RESOURCES["branches"], write=True)
    if permission_error:
        return permission_error
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error

    data, validation_error = _validated_data(RESOURCES["branches"])
    if validation_error:
        return validation_error
    if not data:
        return _json_error("At least one branch field is required", 400)
    if "name" in data:
        if (
            not isinstance(data["name"], str)
            or not data["name"].strip()
            or len(data["name"].strip()) > 120
        ):
            return _json_error("Branch name must be between 1 and 120 characters", 400)
        data["name"] = data["name"].strip()
    for field, maximum_length in (("location", 255), ("phone", 40), ("email", 255)):
        if field in data and data[field] is not None:
            if not isinstance(data[field], str) or len(data[field].strip()) > maximum_length:
                return _json_error(f"Branch {field} is invalid", 400)
            data[field] = data[field].strip() or None
    if (
        "email" in data
        and data["email"]
        and not re.fullmatch(
            r"[^@\s]+@[^@\s]+\.[^@\s]+",
            data["email"],
        )
    ):
        return _json_error("Branch email must be valid", 400)
    if "isActive" in data and type(data["isActive"]) is not bool:
        return _json_error("isActive must be a boolean", 400)

    async def update_branch(client: Prisma):
        existing = await client.branch.find_unique(where={"id": branch_id})
        if existing is None:
            return None
        if "name" in data:
            duplicate = await client.branch.find_first(where={
                "name": data["name"],
                "id": {"not": branch_id},
            })
            if duplicate is not None:
                raise ValueError("A branch with this name already exists")
        prepared = _prepare_model_data("branch", data, creating=False)
        return await client.branch.update(
            where={"id": branch_id},
            data=prepared,
        )

    try:
        branch = _db(update_branch)
    except ValueError as error:
        return _json_error(str(error), 400)
    except Exception:
        logger.exception("Could not update branch %s", branch_id)
        return _json_error("Could not update branch", 500)
    if branch is None:
        return _json_error("Branch not found", 404)
    return jsonify({"item": _serialize(branch)})


@api.route("/admin/<resource_name>", methods=["GET", "POST"])
def collection(resource_name: str):
    resource = RESOURCES.get(resource_name)
    if resource is None:
        return _json_error("Unknown resource", 404)
    permission_error = _authorize_resource(resource, write=request.method == "POST")
    if permission_error:
        return permission_error
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error
    if (
        request.method == "POST"
        and resource.get("no_create")
        and resource["model"] != "portfolioimage"
    ):
        return _json_error("Records in this collection cannot be created directly", 405)
    identity = _current_identity()

    if request.method == "GET":
        try:
            limit = min(max(int(request.args.get("limit", 100)), 1), 500)
            offset = int(request.args.get("offset", 0))
        except ValueError:
            return _json_error("limit and offset must be integers", 400)
        if offset < 0:
            return _json_error("offset cannot be negative", 400)
        where: dict[str, Any] = {}
        branch_id = _branch_id_for_identity(identity)
        requested_branch = request.args.get("branchId")
        if requested_branch:
            try:
                requested_branch_id = int(requested_branch)
            except ValueError:
                return _json_error("branchId must be an integer", 400)
            if identity["role"] == "admin" and requested_branch_id != identity["branchId"]:
                return _json_error("You can only access your assigned branch", 403)
            if branch_id is not None and requested_branch_id != branch_id:
                return _json_error("Select a different branch using the branch selector", 403)
            branch_id = requested_branch_id
        branch_filter = _branch_filter_for_model(resource["model"], branch_id)
        if branch_id is not None and not branch_filter and identity["role"] == "admin":
            return _json_error("This resource is not available in a branch context", 403)
        where.update(branch_filter)
        registered_only_customers = (
            resource["model"] == "customer"
            and request.args.get("registeredOnly") == "true"
        )
        if registered_only_customers:
            where["passwordHash"] = {"not": None}

        async def find_many(client: Prisma):
            include = None
            if resource["model"] == "order":
                include = {
                    "paymentAttempts": True,
                    "customer": True,
                    "items": {"include": {"product": True, "customCakeRequest": True}},
                }
            elif resource["model"] == "branchdailyreport":
                include = {"branch": True}
            elif resource["model"] == "customcakerequest":
                include = {
                    "customer": True,
                    "branch": True,
                    "assignedStaff": True,
                    "referenceImages": True,
                }
            elif resource["model"] in {"branchinventory", "inventorylot"}:
                include = {"product": True}
            elif resource["model"] == "customer":
                order_filter = {"branchId": branch_id} if identity["role"] == "admin" else None
                include = {
                    "orders": {
                        **({"where": order_filter} if order_filter else {}),
                        "take": 5,
                        "order_by": {"createdAt": "desc"},
                        "include": {
                            "items": {
                                "include": {"product": True, "customCakeRequest": True},
                            },
                        },
                    },
                }
            elif resource["model"] == "conversation":
                include = {"customer": True}
            model = getattr(client, resource["model"])
            query_options = (
                {"select": {
                    "id": True,
                    "name": True,
                    "email": True,
                    "phone": True,
                    "customerSince": True,
                    "birthday": True,
                    "totalSpent": True,
                    "orderCount": True,
                    "lastOrderDate": True,
                    "favoriteProducts": True,
                    "tags": True,
                    "specialRequests": True,
                    "isActive": True,
                    "isBlocked": True,
                    "preferences": True,
                }}
                if registered_only_customers
                else {"include": include}
            )
            items = await model.find_many(
                where=where or None,
                take=limit,
                skip=offset,
                order=resource.get("order_by", {"createdAt": "desc"}),
                **query_options,
            )
            total = await model.count(where=where or None)
            product_images = (
                await _load_product_images(client, [item.id for item in items])
                if resource["model"] == "product"
                else []
            )
            return items, total, product_images

        try:
            items, total, product_images = _db(find_many)
            serialized_items = _serialize(items)
            if resource["model"] == "product":
                _add_product_image_urls(
                    serialized_items,
                    _serialize(product_images),
                )
            elif resource["model"] == "customer":
                for item in serialized_items:
                    _strip_customer_secrets(item)
            elif resource["model"] in {"order", "customcakerequest"}:
                for item in serialized_items:
                    customer = item.get("customer")
                    if isinstance(customer, dict):
                        _strip_customer_secrets(customer)
            elif resource["model"] == "conversation":
                for item in serialized_items:
                    customer = item.pop("customer", None)
                    if isinstance(customer, dict):
                        if not item.get("contact"):
                            item["contact"] = customer.get("phone") or ""
                        if not item.get("email"):
                            item["email"] = customer.get("email") or ""
            if resource["model"] == "portfolioimage":
                for item in serialized_items:
                    item["imageUrl"] = (
                        f"/portfolio-images/{item['id']}/image"
                        if item.get("imageData")
                        else item.get("imageUrl")
                    )
                    item.pop("imageData", None)
                    item.pop("contentType", None)
            if resource["model"] == "customcakerequest":
                for item in serialized_items:
                    for image in item.get("referenceImages", []):
                        image["imageUrl"] = (
                            f"/api/v1/admin/custom-cake-reference-images/{image['id']}/image"
                        )
                        image.pop("imageData", None)
            if resource["model"] == "supportticketattachment":
                for item in serialized_items:
                    has_file_data = bool(item.pop("fileData", None))
                    if has_file_data:
                        item["fileUrl"] = (
                            f"/api/v1/admin/support-attachments/{item['id']}/file"
                        )
            return jsonify({
                "items": serialized_items,
                "total": total,
                "offset": offset,
                "limit": limit,
            })
        except Exception:
            logger.exception("Could not list resource %s", resource_name)
            return _json_error("Could not load records", 500)

    if resource["model"] == "portfolioimage" and request.method == "POST":
        if request.content_length is not None and request.content_length > 3 * 1024 * 1024:
            return _json_error("Portfolio images must be no larger than 2 MB", 413)
        title = request.form.get("title", "").strip()
        alt_text = request.form.get("altText", "").strip()
        upload = request.files.get("image")
        if not title or len(title) > 100:
            return _json_error("Image title must be between 1 and 100 characters", 400)
        if len(alt_text) > 160:
            return _json_error("Image description must be no more than 160 characters", 400)
        if upload is None:
            return _json_error("Choose an image to upload", 400)
        content_type = upload.mimetype.lower()
        allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
        if content_type not in allowed_types:
            return _json_error("Upload a JPEG, PNG, GIF, or WebP image", 400)
        image_bytes = upload.stream.read(2 * 1024 * 1024 + 1)
        if not image_bytes or len(image_bytes) > 2 * 1024 * 1024:
            return _json_error("Portfolio images must be no larger than 2 MB", 400)
        signature_matches = {
            "image/jpeg": image_bytes.startswith(b"\xff\xd8\xff"),
            "image/png": image_bytes.startswith(b"\x89PNG\r\n\x1a\n"),
            "image/gif": image_bytes.startswith((b"GIF87a", b"GIF89a")),
            "image/webp": image_bytes.startswith(b"RIFF") and image_bytes[8:12] == b"WEBP",
        }
        if not signature_matches[content_type]:
            return _json_error("The uploaded file does not match its image type", 400)

        async def create_portfolio_image(client: Prisma):
            latest = await client.portfolioimage.find_first(
                order={"sortOrder": "desc"}
            )
            next_sort_order = (latest.sortOrder + 1) if latest is not None else 0
            return await client.portfolioimage.create(data={
                "title": title,
                "altText": alt_text or title,
                "imageData": base64.b64encode(image_bytes).decode("ascii"),
                "contentType": content_type,
                "sortOrder": next_sort_order,
                "isActive": True,
            })

        try:
            record = _db(create_portfolio_image)
        except Exception:
            logger.exception("Could not save uploaded portfolio image")
            return _json_error("Could not save portfolio image", 500)
        item = _serialize(record)
        item["imageUrl"] = f"/portfolio-images/{item['id']}/image"
        item.pop("imageData", None)
        item.pop("contentType", None)
        return jsonify({"item": item}), 201

    data, error = _validated_data(resource, include_id=resource["id_type"] is str)
    if error:
        return error
    if resource["id_type"] is str and not data.get("id"):
        return _json_error("id is required for this resource", 400)
    if identity["role"] == "admin" and "branchId" in resource["fields"]:
        data["branchId"] = identity.get("branchId")
    elif identity["role"] == "super_admin":
        selected_branch_id = _branch_id_for_identity(identity)
        if selected_branch_id is not None and "branchId" in resource["fields"]:
            data["branchId"] = selected_branch_id
    if request.method == "POST" and resource["model"] == "cateringbooking":
        branch_id = data.get("branchId")
        if not isinstance(branch_id, int) or isinstance(branch_id, bool):
            return _json_error("A branch is required for a catering booking", 400)

    async def create(client: Prisma):
        branch_id = _branch_id_for_identity(identity)
        await _validate_branch_relations(client, resource["model"], data, branch_id)
        if resource["model"] == "orderitem" and branch_id is not None:
            order_id = data.get("orderId")
            order = await client.order.find_first(
                where={"id": order_id, "branchId": branch_id}
            )
            if order is None:
                raise ValueError("Selected order is outside the accessible branch")
        prepared_data = _prepare_model_data(
            resource["model"],
            data,
            creating=True,
        )
        return await getattr(client, resource["model"]).create(data=prepared_data)

    try:
        record = _db(create)
    except Exception:
        logger.exception("Could not create resource %s", resource_name)
        return _json_error("Could not create record; verify its fields and references", 400)
    return jsonify({"item": _serialize(record)}), 201


@api.route("/admin/<resource_name>/<record_id>", methods=["GET", "PATCH", "DELETE"])
def record(resource_name: str, record_id: str):
    resource = RESOURCES.get(resource_name)
    if resource is None:
        return _json_error("Unknown resource", 404)
    if request.method == "DELETE" and resource.get("delete_read_only"):
        return _json_error("Records in this collection cannot be deleted", 405)
    permission_error = _authorize_resource(
        resource, write=request.method in {"PATCH", "DELETE"}
    )
    if permission_error:
        return permission_error
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error
    try:
        parsed_id = resource["id_type"](record_id)
    except (TypeError, ValueError):
        return _json_error("Invalid record id", 400)

    async def operation(client: Prisma):
        model = getattr(client, resource["model"])
        where: dict[str, Any] = {"id": parsed_id}
        identity = _current_identity()
        branch_id = _branch_id_for_identity(identity)
        where.update(_branch_filter_for_model(resource["model"], branch_id))
        if branch_id is not None and not _branch_filter_for_model(
            resource["model"], branch_id
        ) and identity["role"] == "admin":
            return None
        if request.method == "GET":
            item = await model.find_first(
                where=where,
                include=(
                    {
                        "paymentAttempts": True,
                        "customer": True,
                        "items": {"include": {"product": True, "customCakeRequest": True}},
                    }
                    if resource["model"] == "order"
                    else {"product": True}
                    if resource["model"] in {"branchinventory", "inventorylot"}
                    else None
                ),
            )
            if item is None:
                return None
            serialized = _serialize(item)
            if resource["model"] == "product":
                product_images = await _load_product_images(client, [item.id])
                _add_product_image_urls(
                    [serialized],
                    _serialize(product_images),
                )
            elif resource["model"] == "customer":
                _strip_customer_secrets(serialized)
            elif resource["model"] in {"order", "customcakerequest"}:
                customer = serialized.get("customer")
                if isinstance(customer, dict):
                    _strip_customer_secrets(customer)
            if resource["model"] == "portfolioimage":
                serialized["imageUrl"] = (
                    f"/portfolio-images/{serialized['id']}/image"
                    if serialized.get("imageData")
                    else serialized.get("imageUrl")
                )
                serialized.pop("imageData", None)
                serialized.pop("contentType", None)
            elif resource["model"] == "supportticketattachment":
                has_file_data = bool(serialized.pop("fileData", None))
                if has_file_data:
                    serialized["fileUrl"] = (
                        f"/api/v1/admin/support-attachments/{serialized['id']}/file"
                    )
            return {"item": serialized}
        if request.method == "DELETE":
            item = await model.find_first(where=where)
            if item is None:
                return None
            if resource["model"] == "inventorylot":
                async with client.tx() as transaction:
                    lot = await transaction.inventorylot.find_first(where=where)
                    if lot is None:
                        return None
                    if lot.productId is None:
                        return _json_error(
                            "This inventory lot has no linked product and cannot change branch totals",
                            409,
                        )
                    stock = await transaction.branchinventory.find_first(
                        where={"branchId": lot.branchId, "productId": lot.productId}
                    )
                    if stock is None or stock.quantity < lot.quantity:
                        return _json_error(
                            "Inventory totals are inconsistent; the lot cannot be deleted",
                            409,
                        )
                    await transaction.branchinventory.update(
                        where={"id": stock.id},
                        data={"quantity": stock.quantity - lot.quantity},
                    )
                    await transaction.inventorylot.delete(where={"id": parsed_id})
                    await _write_audit_log(
                        transaction,
                        identity,
                        "inventory_lot_deleted",
                        "InventoryLot",
                        str(lot.id),
                        lot.branchId,
                        {"productId": lot.productId, "quantity": lot.quantity},
                    )
                return {"deleted": True}
            await model.delete(where={"id": parsed_id})
            return {"deleted": True}
        product = None
        if identity["role"] == "admin" and resource["model"] == "product":
            product = await model.find_first(where=where)
            if product is None:
                return None
        data, validation_error = _validated_data(resource)
        if validation_error:
            return validation_error
        if (
            identity["role"] == "admin"
            and resource["model"] == "order"
            and "status" in data
        ):
            order = await model.find_first(
                where=where,
                include={"items": True},
            )
            if order is None:
                return None
            product_ids = [
                item.productId
                for item in order.items
                if item.productId is not None
                and item.customCakeRequestId is None
            ]
            if not product_ids or len(product_ids) != len(order.items):
                return _json_error(
                    "Branch administrators may only update product order statuses",
                    403,
                )
            product_inventories = await client.branchinventory.find_many(
                where={
                    "productId": {"in": product_ids},
                },
                select={"productId": True, "branchId": True},
            )
            if _order_products_available_at_branch(
                set(product_ids),
                product_inventories,
                identity["branchId"],
            ) != set(product_ids):
                return _json_error(
                    "Order products must be available in your assigned branch",
                    403,
                )
        if identity["role"] == "admin" and resource["model"] == "customer":
            editable_fields = {
                "name", "phone", "birthday", "address", "city", "postalCode",
                "preferredContactMethod", "specialRequests", "preferences",
            }
            if not data or set(data) - editable_fields:
                return _json_error(
                    "Branch administrators may only update customer contact details and preferences",
                    403,
                )
        if identity["role"] == "admin" and resource["model"] == "product":
            if set(data) != {"subCategory"}:
                return _json_error("Branch administrators may only update product subcategories", 403)
            subcategory = data["subCategory"]
        if identity["role"] == "admin" and "branchId" in resource["fields"]:
            data["branchId"] = identity["branchId"]
        elif identity["role"] == "super_admin" and branch_id is not None and "branchId" in resource["fields"]:
            data["branchId"] = branch_id
        if resource["model"] == "inventorylot":
            allowed_fields = {
                "branchId", "batchCode", "quantity", "minStock", "unit",
                "receivedAt", "expiresAt", "unitPrice",
            }
            if set(data) - allowed_fields:
                return _json_error(
                    "Inventory lot product and branch assignments cannot be changed here",
                    400,
                )
            for field in ("quantity", "minStock"):
                if field in data and (
                    not isinstance(data[field], int)
                    or isinstance(data[field], bool)
                    or data[field] < 0
                    or data[field] > 100000
                ):
                    return _json_error(
                        f"{field} must be a non-negative whole number no greater than 100000",
                        400,
                    )
            for field in ("batchCode", "unit"):
                if field in data and (
                    not isinstance(data[field], str)
                    or not data[field].strip()
                    or len(data[field].strip()) > (80 if field == "batchCode" else 40)
                ):
                    return _json_error(f"{field} is invalid", 400)
            if "unitPrice" in data:
                try:
                    unit_price = Decimal(str(data["unitPrice"]))
                except (InvalidOperation, TypeError, ValueError):
                    return _json_error("unitPrice must be a valid amount", 400)
                if not unit_price.is_finite() or not Decimal("0") <= unit_price <= Decimal("1000000"):
                    return _json_error("unitPrice must be between 0 and 1000000", 400)
            prepared_data = _prepare_model_data(
                resource["model"],
                data,
                creating=False,
            )
            prepared_data.pop("branchId", None)
            async with client.tx() as transaction:
                lot = await transaction.inventorylot.find_first(where=where)
                if lot is None:
                    return None
                if lot.productId is None:
                    return _json_error(
                        "This inventory lot has no linked product and cannot change branch totals",
                        409,
                    )
                stock = await transaction.branchinventory.find_first(
                    where={"branchId": lot.branchId, "productId": lot.productId}
                )
                if stock is None:
                    return _json_error(
                        "Branch inventory totals are missing for this lot",
                        409,
                    )
                next_quantity = int(data.get("quantity", lot.quantity))
                quantity_delta = next_quantity - lot.quantity
                if stock.quantity + quantity_delta < 0:
                    return _json_error(
                        "The lot quantity exceeds the available branch inventory total",
                        409,
                    )
                updated_lot = await transaction.inventorylot.update(
                    where=where,
                    data=prepared_data,
                )
                stock_changes: dict[str, Any] = {}
                if quantity_delta:
                    stock_changes["quantity"] = stock.quantity + quantity_delta
                if "minStock" in data:
                    stock_changes["lowStockThreshold"] = data["minStock"]
                if stock_changes:
                    await transaction.branchinventory.update(
                        where={"id": stock.id},
                        data=stock_changes,
                    )
                await _write_audit_log(
                    transaction,
                    identity,
                    "inventory_lot_updated",
                    "InventoryLot",
                    str(lot.id),
                    lot.branchId,
                    {
                        "quantityChange": quantity_delta,
                        "updatedFields": sorted(data.keys() - {"branchId"}),
                    },
                )
            return {"item": _serialize(updated_lot)}
        await _validate_branch_relations(client, resource["model"], data, branch_id)
        if resource["model"] == "orderitem" and branch_id is not None and "orderId" in data:
            order = await client.order.find_first(
                where={"id": data["orderId"], "branchId": branch_id}
            )
            if order is None:
                raise ValueError("Selected order is outside the accessible branch")
        prepared_data = _prepare_model_data(
            resource["model"],
            data,
            creating=False,
        )
        if resource["model"] == "customcakerequest" and "productionStage" in data:
            async with client.tx() as transaction:
                cake_request = await transaction.customcakerequest.update(
                    where=where,
                    data=prepared_data,
                )
                if data["productionStage"] == "ready":
                    linked_items = await transaction.orderitem.find_many(
                        where={"customCakeRequestId": cake_request.id},
                        include={"order": True},
                    )
                    for linked_item in linked_items:
                        if linked_item.order and linked_item.order.status not in {"completed", "cancelled"}:
                            await transaction.order.update(
                                where={"id": linked_item.orderId},
                                data={"status": "ready"},
                            )
            return {"item": _serialize(cake_request)}
        item = await model.update(where=where, data=prepared_data)
        return {"item": _serialize(item)}

    try:
        result = _db(operation)
    except Exception:
        logger.exception("Could not access resource %s record %s", resource_name, record_id)
        return _json_error("Could not access record; verify its fields and references", 400)
    if result is None:
        return _json_error("Record not found", 404)
    if isinstance(result, tuple):
        return result
    return jsonify(result)


@api.post("/admin/conversations/<conversation_id>/email-reply")
def send_conversation_email_reply(conversation_id: str):
    resource = RESOURCES["conversations"]
    permission_error = _authorize_resource(resource, write=True)
    if permission_error:
        return permission_error
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error

    data = request.get_json(silent=True)
    if not isinstance(data, dict) or set(data) != {"message"}:
        return _json_error("A message is required", 400)
    message = data["message"]
    if not isinstance(message, str) or not message.strip() or len(message) > 10000:
        return _json_error("Message must be between 1 and 10000 characters", 400)
    message = message.strip()

    identity = _current_identity()
    branch_id = _branch_id_for_identity(identity)
    branch_filter = _branch_filter_for_model("conversation", branch_id)
    if branch_id is not None and not branch_filter and identity["role"] == "admin":
        return _json_error("This resource is not available in a branch context", 403)
    where = {"id": conversation_id, **branch_filter}

    async def find_conversation(client: Prisma):
        return await client.conversation.find_first(
            where=where,
            include={"customer": True},
        )

    try:
        conversation = _db(find_conversation)
    except Exception:
        logger.exception("Could not load conversation %s for email reply", conversation_id)
        return _json_error("Could not load the conversation", 500)
    if conversation is None:
        return _json_error("Conversation not found", 404)

    recipient = (conversation.email or "").strip()
    if not recipient and conversation.customer:
        recipient = (conversation.customer.email or "").strip()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", recipient):
        return _json_error("This conversation has no valid customer email address", 400)

    try:
        send_email_message(recipient, "Reply from Angeliz Cakes", message)
    except EmailConfigurationError as error:
        logger.exception("Email reply is not configured for conversation %s", conversation_id)
        return _json_error(str(error), 503)
    except EmailDeliveryError:
        logger.exception("Could not send email reply for conversation %s", conversation_id)
        return _json_error("Could not send the reply email", 502)

    async def save_reply(client: Prisma):
        return await client.conversationmessage.create(
            data=_prepare_model_data("conversationmessage", {
                "conversationId": conversation_id,
                "direction": "out",
                "content": message,
            }, creating=True)
        )

    try:
        saved_message = _db(save_reply)
    except Exception:
        logger.exception(
            "Email reply was sent but could not be saved for conversation %s",
            conversation_id,
        )
        return _json_error(
            "The email was sent, but the reply could not be saved to conversation history",
            500,
        )
    return jsonify({"item": _serialize(saved_message)}), 201


@api.post("/admin/customers/<int:customer_id>/email")
def send_customer_email(customer_id: int):
    permission_error = _authorize_resource(RESOURCES["customers"])
    if permission_error:
        return permission_error
    permission_error = _authorize_resource(RESOURCES["conversations"], write=True)
    if permission_error:
        return permission_error
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error

    data = request.get_json(silent=True)
    if not isinstance(data, dict) or set(data) != {"message"}:
        return _json_error("A message is required", 400)
    message = data["message"]
    if not isinstance(message, str) or not message.strip() or len(message) > 10000:
        return _json_error("Message must be between 1 and 10000 characters", 400)
    message = message.strip()

    identity = _current_identity()
    branch_id = _branch_id_for_identity(identity)
    customer_where = {
        "id": customer_id,
        "passwordHash": {"not": None},
        **_branch_filter_for_model("customer", branch_id),
    }

    async def find_customer(client: Prisma):
        return await client.customer.find_first(
            where=customer_where,
            select={"id": True, "name": True, "email": True},
        )

    try:
        customer = _db(find_customer)
    except Exception:
        logger.exception("Could not load customer %s for email", customer_id)
        return _json_error("Could not load the customer", 500)
    if customer is None:
        return _json_error("Customer not found", 404)

    recipient = (customer.email or "").strip()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", recipient):
        return _json_error("This customer has no valid email address", 400)

    try:
        send_email_message(recipient, "Message from Angeliz Cakes", message)
    except EmailConfigurationError as error:
        logger.exception("Email is not configured for customer %s", customer_id)
        return _json_error(str(error), 503)
    except EmailDeliveryError:
        logger.exception("Could not send email to customer %s", customer_id)
        return _json_error("Could not send the customer email", 502)

    conversation_where = {
        "customerId": customer_id,
        **_branch_filter_for_model("conversation", branch_id),
    }
    new_conversation_id = f"customer-{customer_id}-{secrets.token_urlsafe(10)}"

    async def persist_message(client: Prisma):
        async with client.tx(max_wait=10_000, timeout=30_000) as transaction:
            conversation = await transaction.conversation.find_first(
                where=conversation_where
            )
            if conversation is None:
                conversation = await transaction.conversation.create(
                    data=_prepare_model_data("conversation", {
                        "id": new_conversation_id,
                        "customerId": customer_id,
                        "branchId": branch_id,
                        "contactName": customer.name or recipient,
                        "email": recipient,
                        "channel": "Email",
                        "topic": "Admin message",
                        "status": "open",
                        "unreadCount": 0,
                    }, creating=True)
                )
            else:
                conversation = await transaction.conversation.update(
                    where={"id": conversation.id},
                    data=_prepare_model_data("conversation", {
                        "contactName": customer.name or recipient,
                        "email": recipient,
                        "status": "open",
                    }, creating=False)
                )
            saved_message = await transaction.conversationmessage.create(
                data=_prepare_model_data("conversationmessage", {
                    "conversationId": conversation.id,
                    "direction": "out",
                    "content": message,
                }, creating=True)
            )
            return conversation, saved_message

    try:
        conversation, saved_message = _db(persist_message)
    except Exception:
        logger.exception(
            "Email was sent but could not be saved for customer %s",
            customer_id,
        )
        return _json_error(
            "The email was sent, but it could not be saved to conversation history",
            500,
        )
    return jsonify({
        "item": _serialize(saved_message),
        "conversation": _serialize(conversation),
    }), 201


@api.get("/customer/profile")
@_authenticated({"customer"})
def customer_profile():
    identity = _current_identity()

    async def find_profile(client: Prisma):
        return await client.customer.find_unique(where={"id": identity["id"]})

    try:
        customer = _db(find_profile)
    except Exception:
        logger.exception("Could not load customer profile")
        return _json_error("Could not load customer profile", 500)
    if customer is None:
        return _json_error("Customer account not found", 404)
    result = _serialize(customer)
    for private_field in (
        "passwordHash",
        "emailVerificationCodeHash",
        "emailVerificationExpiresAt",
        "emailVerificationSentAt",
        "emailVerificationAttempts",
        "passwordResetCodeHash",
        "passwordResetExpiresAt",
        "passwordResetSentAt",
        "passwordResetAttempts",
    ):
        result.pop(private_field, None)
    return jsonify({"profile": result})


@api.get("/customer/favorites")
@_authenticated({"customer"})
def customer_favorites():
    identity = _current_identity()

    async def find_favorites(client: Prisma):
        customer = await client.customer.find_unique(where={"id": identity["id"]})
        if customer is None:
            return None
        product_ids = list(dict.fromkeys(customer.favoriteProducts or []))
        if not product_ids:
            return []
        return await client.product.find_many(
            where={"id": {"in": product_ids}, "isActive": True}
        )

    try:
        products = _db(find_favorites)
    except Exception:
        logger.exception("Could not load customer favorites")
        return _json_error("Could not load customer favorites", 500)
    if products is None:
        return _json_error("Customer account not found", 404)
    return jsonify({"items": _serialize(products)})


@api.put("/customer/favorites")
@_authenticated({"customer"})
def update_customer_favorites():
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or set(data) != {"productIds"}:
        return _json_error("productIds must be provided as an array", 400)
    product_ids = data["productIds"]
    if (
        not isinstance(product_ids, list)
        or any(type(product_id) is not int or product_id <= 0 for product_id in product_ids)
    ):
        return _json_error("productIds must be an array of positive integers", 400)
    product_ids = list(dict.fromkeys(product_ids))
    identity = _current_identity()

    async def save_favorites(client: Prisma):
        if product_ids:
            products = await client.product.find_many(
                where={"id": {"in": product_ids}, "isActive": True}
            )
            if {product.id for product in products} != set(product_ids):
                raise ValueError("Favorites must reference active products")
        customer = await client.customer.update(
            where={"id": identity["id"]},
            data={"favoriteProducts": product_ids},
        )
        return customer.favoriteProducts

    try:
        saved_ids = _db(save_favorites)
    except ValueError as error:
        return _json_error(str(error), 400)
    except Exception:
        logger.exception("Could not save customer favorites")
        return _json_error("Could not save customer favorites", 500)
    return jsonify({"productIds": saved_ids})


@api.get("/customer/orders")
@_authenticated({"customer"})
def customer_orders():
    identity = _current_identity()

    async def find_orders(client: Prisma):
        return await client.order.find_many(
            where={"customerId": identity["id"]},
            include={
                "customer": True,
                "items": {"include": {"product": True, "customCakeRequest": True}},
                "customerFeedback": True,
                "paymentAttempts": True,
            },
            order={"createdAt": "desc"},
        )

    try:
        items = _serialize(_db(find_orders))
        for order in items:
            customer = order.get("customer")
            if isinstance(customer, dict):
                _strip_customer_secrets(customer)
        return jsonify({"items": items})
    except Exception:
        logger.exception("Could not load customer orders")
        return _json_error("Could not load customer orders", 500)


@api.post("/customer/orders/<int:order_id>/received")
@_authenticated({"customer"})
def mark_customer_order_received(order_id: int):
    identity = _current_identity()

    async def mark_received(client: Prisma):
        order = await client.order.find_first(
            where={"id": order_id, "customerId": identity["id"]}
        )
        if order is None:
            return None
        order_status = str(order.status or "").strip().lower()
        if order_status == "completed":
            return order
        if order_status != "ready":
            raise ValueError("Only ready orders can be marked as received")
        return await client.order.update(
            where={"id": order_id},
            data={"status": "completed"},
        )

    try:
        order = _db(mark_received)
    except ValueError as error:
        return _json_error(str(error), 409)
    except Exception:
        logger.exception("Could not update received status for order %s", order_id)
        return _json_error("Could not update order status", 500)
    if order is None:
        return _json_error("Order not found", 404)
    return jsonify({"item": _serialize(order)})


@api.post("/customer/orders/<int:order_id>/feedback")
@_authenticated({"customer"})
def create_order_feedback(order_id: int):
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or set(data) != {"rating", "message"}:
        return _json_error("rating and message are required", 400)
    try:
        rating = int(data["rating"])
    except (TypeError, ValueError):
        return _json_error("rating must be an integer from 1 to 5", 400)
    message = data.get("message")
    if rating < 1 or rating > 5 or not isinstance(message, str) or not message.strip():
        return _json_error("rating must be 1 to 5 and message cannot be empty", 400)
    identity = _current_identity()

    async def save_feedback(client: Prisma):
        order = await client.order.find_first(
            where={"id": order_id, "customerId": identity["id"]},
            include={"customer": True},
        )
        if order is None:
            return None
        if order.status != "completed":
            raise ValueError("Feedback is available after order completion")
        existing = await client.customerfeedback.find_first(
            where={"orderId": order_id, "customerId": identity["id"]}
        )
        if existing is not None:
            raise ValueError("Feedback has already been submitted for this order")
        return await client.customerfeedback.create(data=_prepare_model_data("customerfeedback", {
            "customerId": identity["id"],
            "orderId": order_id,
            "branchId": order.branchId,
            "customerName": order.customer.name if order.customer else None,
            "rating": rating,
            "message": message.strip(),
            "source": "web",
        }, creating=True))

    try:
        feedback = _db(save_feedback)
    except ValueError as error:
        return _json_error(str(error), 409)
    except Exception:
        logger.exception("Could not save feedback for order %s", order_id)
        return _json_error("Could not save feedback", 500)
    if feedback is None:
        return _json_error("Order not found", 404)
    return jsonify({"item": _serialize(feedback)}), 201


@api.post("/customer/orders")
@_authenticated({"customer"})
def create_customer_order():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _json_error("A JSON object is required", 400)
    delivery_date_value = data.get("deliveryDate")
    delivery_date = None
    if delivery_date_value not in (None, ""):
        if not isinstance(delivery_date_value, str):
            return _json_error("deliveryDate must be a date in YYYY-MM-DD format", 400)
        try:
            delivery_date = datetime.combine(
                date.fromisoformat(delivery_date_value),
                datetime.min.time(),
            )
        except ValueError:
            return _json_error("deliveryDate must be a valid date in YYYY-MM-DD format", 400)

    items = data.get("items")
    if not isinstance(items, list) or not items:
        return _json_error("At least one product is required", 400)
    try:
        branch_id = int(data.get("branchId"))
        normalized_items = [
            {
                "sku": str(item["sku"]).strip(),
                "quantity": int(item["quantity"]),
                "flavor": str(item.get("flavor", "")).strip(),
            }
            for item in items
        ]
    except (KeyError, TypeError, ValueError):
        return _json_error("branchId and valid product SKUs and quantities are required", 400)
    if any(
        not item["sku"] or item["quantity"] < 1 or item["quantity"] > 100
        for item in normalized_items
    ):
        return _json_error("Each item needs a SKU and a quantity between 1 and 100", 400)
    if len({item["sku"] for item in normalized_items}) != len(normalized_items):
        return _json_error("Each product may only appear once", 400)
    supported_fields = {
        "branchId", "items", "deliveryDate", "deliveryTime", "deliveryAddress",
        "deliveryCity", "deliveryPostalCode", "isPickup", "paymentMethod",
        "specialInstructions", "isForSomeoneElse", "recipientName",
        "recipientPhone",
    }
    if set(data) - supported_fields:
        return _json_error("Unsupported order fields", 400)
    identity = _current_identity()
    is_for_someone_else = data.get("isForSomeoneElse", False)
    if type(is_for_someone_else) is not bool:
        return _json_error("isForSomeoneElse must be a boolean", 400)
    recipient_name = data.get("recipientName")
    recipient_phone = data.get("recipientPhone")
    if is_for_someone_else:
        if (
            not isinstance(recipient_name, str)
            or not recipient_name.strip()
            or len(recipient_name.strip()) > 120
            or not isinstance(recipient_phone, str)
            or not recipient_phone.strip()
            or len(recipient_phone.strip()) > 40
        ):
            return _json_error(
                "A recipient name and contact number are required when ordering for someone else",
                400,
            )
    elif recipient_name not in (None, "") or recipient_phone not in (None, ""):
        return _json_error(
            "Recipient details are only accepted when ordering for someone else",
            400,
        )
    delivery_address = data.get("deliveryAddress")
    is_pickup = data.get("isPickup", False)
    if type(is_pickup) is not bool:
        return _json_error("isPickup must be a boolean", 400)
    if not is_pickup and (
        not isinstance(delivery_address, str) or not delivery_address.strip()
    ):
        return _json_error("A delivery address is required for delivery orders", 400)

    async def create_order(client: Prisma):
        branch = await client.branch.find_unique(where={"id": branch_id})
        if branch is None or not branch.isActive:
            raise ValueError("Selected branch is unavailable")
        products = await client.product.find_many(
            where={
                "sku": {"in": [item["sku"] for item in normalized_items]},
                "isActive": True,
                "showOnline": True,
                "OR": [
                    {"branchInventories": {"none": {}}},
                    {
                        "branchInventories": {
                            "some": {
                                "branchId": branch_id,
                                "quantity": {"gt": 0},
                            },
                        },
                    },
                ],
            }
        )
        products_by_sku = {product.sku: product for product in products}
        if len(products_by_sku) != len(normalized_items):
            raise ValueError("One or more selected products are unavailable")
        line_items = []
        subtotal = Decimal("0.00")
        for item in normalized_items:
            product = products_by_sku[item["sku"]]
            line_total = Decimal(str(product.basePrice)) * item["quantity"]
            subtotal += line_total
            line_items.append({
                "productId": product.id,
                "quantity": item["quantity"],
                "pricePerUnit": product.basePrice,
                "subtotal": line_total,
                "customizations": item["flavor"] or None,
            })
        order_data = {
            "customerId": identity["id"],
            "branchId": branch_id,
            "status": "pending",
            "deliveryDate": delivery_date,
            "deliveryTime": data.get("deliveryTime"),
            "deliveryAddress": (
                delivery_address.strip()
                if isinstance(delivery_address, str) and delivery_address.strip()
                else None
            ),
            "deliveryCity": data.get("deliveryCity"),
            "deliveryPostalCode": data.get("deliveryPostalCode"),
            "isPickup": is_pickup,
            "isForSomeoneElse": is_for_someone_else,
            "recipientName": recipient_name.strip() if is_for_someone_else else None,
            "recipientPhone": recipient_phone.strip() if is_for_someone_else else None,
            "subtotal": subtotal,
            "totalAmount": subtotal,
            "paymentMethod": data.get("paymentMethod"),
            "specialInstructions": data.get("specialInstructions"),
            "channel": "web",
        }
        order = await client.order.create(data=_prepare_model_data(
            "order",
            order_data,
            creating=True,
        ))
        try:
            for line_item in line_items:
                await client.orderitem.create(data=_prepare_model_data(
                    "orderitem",
                    {"orderId": order.id, **line_item},
                    creating=True,
                ))
        except Exception:
            logger.exception("Could not create all items for order %s; removing incomplete order", order.id)
            try:
                await client.order.delete(where={"id": order.id})
            except Exception:
                logger.exception("Could not remove incomplete order %s", order.id)
            raise
        return await client.order.find_unique(
            where={"id": order.id},
            include={
                "customer": True,
                "items": {"include": {"product": True, "customCakeRequest": True}},
            },
        )

    try:
        order = _db(create_order)
    except ValueError as error:
        return _json_error(str(error), 400)
    except Exception:
        logger.exception("Could not create customer order")
        return _json_error("Could not place order", 500)
    serialized_order = _serialize(order)
    customer = serialized_order.get("customer")
    if isinstance(customer, dict):
        _strip_customer_secrets(customer)
    return jsonify({"item": serialized_order}), 201


@api.post("/public/inquiries")
def create_public_inquiry():
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _json_error("A JSON object is required", 400)
    required = ("customerName", "summary", "type")
    if any(not isinstance(data.get(field), str) or not data[field].strip() for field in required):
        return _json_error("customerName, summary, and type are required", 400)
    fields = {
        "branchId", "customerName", "phone", "email", "eventDate", "summary",
        "type", "estimatedBudget", "details", "notes",
    }
    if set(data) - fields:
        return _json_error("Unsupported inquiry fields", 400)
    if data["type"] == "website_contact":
        details = data.get("details")
        if (
            not isinstance(data.get("email"), str)
            or not data["email"].strip()
            or not isinstance(details, dict)
            or not isinstance(details.get("subject"), str)
            or not details["subject"].strip()
        ):
            return _json_error("A valid email, subject, and message are required", 400)
    record_data = {"id": secrets.token_urlsafe(18), **data}
    identity = _current_identity()
    if identity and identity.get("role") == "customer":
        record_data["customerId"] = identity["id"]
    is_website_contact = data["type"] == "website_contact"
    if is_website_contact:
        try:
            record_data["branchId"] = int(data.get("branchId"))
        except (TypeError, ValueError):
            return _json_error("Select a branch for your message", 400)

    async def create_inquiry(client: Prisma):
        if not is_website_contact:
            return await client.inquiry.create(data=_prepare_model_data(
                "inquiry",
                record_data,
                creating=True,
            ))
        async with client.tx(max_wait=10_000, timeout=30_000) as transaction:
            branch = await transaction.branch.find_first(
                where={"id": record_data["branchId"], "isActive": True}
            )
            if branch is None:
                raise ValueError("Selected branch is unavailable")
            inquiry = await transaction.inquiry.create(data=_prepare_model_data(
                "inquiry",
                record_data,
                creating=True,
            ))
            subject = data["details"]["subject"].strip()
            conversation_id = f"website-{record_data['id']}"
            conversation_data = {
                "id": conversation_id,
                "branchId": record_data["branchId"],
                "customerId": record_data.get("customerId"),
                "contactName": data["customerName"].strip(),
                "email": data.get("email"),
                "channel": "Website",
                "topic": subject,
                "status": "open",
                "unreadCount": 1,
                "filterType": "inquiry",
                "tag": "Website inquiry",
            }
            conversation = await transaction.conversation.create(
                data=_prepare_model_data(
                    "conversation",
                    conversation_data,
                    creating=True,
                )
            )
            await transaction.conversationmessage.create(data=_prepare_model_data(
                "conversationmessage",
                {
                    "conversationId": conversation.id,
                    "direction": "in",
                    "content": data["summary"].strip(),
                },
                creating=True,
            ))
            return inquiry

    try:
        return jsonify({"item": _serialize(_db(create_inquiry))}), 201
    except Exception:
        logger.exception("Could not create public inquiry")
        return _json_error("Could not submit inquiry; verify its details", 400)


@api.post("/public/catering-bookings")
def create_public_catering_booking():
    csrf_error = _require_csrf()
    if csrf_error:
        return csrf_error
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _json_error("A JSON object is required", 400)
    fields = {
        "branchId", "clientName", "phone", "email", "eventDate", "eventTime",
        "eventType", "venue", "guestCount", "notes", "packageId",
        "priceOptionLabel",
    }
    if set(data) - fields:
        return _json_error("Unsupported catering booking fields", 400)
    required = (
        "branchId", "clientName", "email", "eventDate", "eventType",
        "packageId", "priceOptionLabel",
    )
    if any(data.get(field) in (None, "") for field in required):
        return _json_error("Required catering booking details are missing", 400)
    if not all(
        isinstance(data[field], str) and data[field].strip()
        for field in ("clientName", "email", "eventDate", "eventType", "packageId", "priceOptionLabel")
    ):
        return _json_error("Catering booking text fields must be non-empty strings", 400)
    try:
        branch_id = int(data["branchId"])
        event_date = datetime.combine(
            date.fromisoformat(data["eventDate"]),
            datetime.min.time(),
        )
        guest_count = int(data["guestCount"]) if data.get("guestCount") not in (None, "") else None
    except (TypeError, ValueError):
        return _json_error("branchId, eventDate, or guestCount is invalid", 400)
    if guest_count is not None and not 1 <= guest_count <= 10000:
        return _json_error("guestCount must be between 1 and 10000", 400)
    identity = _current_identity()

    async def create_booking(client: Prisma):
        package = await client.cateringpackage.find_unique(
            where={"id": data["packageId"]}
        )
        if package is None or not package.isActive:
            raise ValueError("Selected catering package is unavailable")
        options = package.priceOptions
        selected_option = next(
            (
                option for option in options
                if isinstance(option, dict)
                and option.get("label") == data["priceOptionLabel"]
            ),
            None,
        )
        if selected_option is None:
            raise ValueError("Selected package price is unavailable")
        branch = await client.branch.find_unique(where={"id": branch_id})
        if branch is None or not branch.isActive:
            raise ValueError("Selected branch is unavailable")

        record_data: dict[str, Any] = {
            "id": secrets.token_urlsafe(18),
            "branchId": branch_id,
            "clientName": data["clientName"].strip(),
            "email": data["email"].strip().lower(),
            "eventDate": event_date,
            "eventType": data["eventType"].strip(),
            "total": Decimal(str(selected_option["value"])),
            "menu": {
                "packageId": package.id,
                "packageTitle": package.title,
                "priceOption": selected_option,
            },
        }
        for field in ("phone", "eventTime", "venue", "notes"):
            value = data.get(field)
            if value is not None:
                record_data[field] = value.strip() if isinstance(value, str) else value
        if guest_count is not None:
            record_data["guestCount"] = guest_count
        if identity and identity.get("role") == "customer":
            record_data["customerId"] = identity["id"]
        return await client.cateringbooking.create(data=_prepare_model_data(
            "cateringbooking",
            record_data,
            creating=True,
        ))

    try:
        return jsonify({"item": _serialize(_db(create_booking))}), 201
    except ValueError as error:
        return _json_error(str(error), 400)
    except Exception:
        logger.exception("Could not create public catering booking")
        return _json_error("Could not submit catering booking; verify its details", 400)


@api.post("/public/custom-cake-requests")
@_authenticated({"customer"})
def create_public_custom_cake_request():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _json_error("A JSON object is required", 400)
    required = (
        "branchId", "contactName", "contactPhone", "occasion", "size",
        "layers", "layersCount", "tiers", "tiersCount", "flavor", "frosting", "theme", "color",
        "requestedDate", "fulfillmentMethod",
    )
    if any(data.get(field) in (None, "") for field in required):
        return _json_error("Required cake request details are missing", 400)
    branch_id = data["branchId"]
    if isinstance(branch_id, bool) or not isinstance(branch_id, int) or branch_id < 1:
        return _json_error("branchId must be a positive integer", 400)
    try:
        requested_date = datetime.combine(
            date.fromisoformat(data["requestedDate"]),
            datetime.min.time(),
        )
    except (TypeError, ValueError):
        return _json_error("requestedDate must be an ISO date", 400)
    fields = {
        "branchId", "contactName", "contactPhone", "contactEmail", "occasion",
        "size", "layers", "layersCount", "tiers", "tiersCount", "flavor", "frosting", "dedication",
        "theme", "color", "requestedDate", "fulfillmentMethod", "notes",
        "paymentMethod", "referenceImages",
    }
    if set(data) - fields:
        return _json_error("Unsupported custom cake request fields", 400)
    payment_method = data.get("paymentMethod", "cash-on-delivery")
    if not isinstance(payment_method, str) or payment_method not in {
        "cash-on-delivery", "gcash", "maya", "card",
    }:
        return _json_error("Unsupported custom cake payment method", 400)
    raw_reference_images = data.get("referenceImages", [])
    if not isinstance(raw_reference_images, list) or len(raw_reference_images) > 3:
        return _json_error("Choose no more than 3 reference images", 400)
    reference_images = []
    allowed_image_types = {"image/jpeg", "image/png", "image/webp"}
    image_signatures = {
        "image/jpeg": lambda image: image.startswith(b"\xff\xd8\xff"),
        "image/png": lambda image: image.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/webp": lambda image: image.startswith(b"RIFF") and image[8:12] == b"WEBP",
    }
    for image in raw_reference_images:
        if not isinstance(image, dict) or set(image) != {"fileName", "contentType", "imageData"}:
            return _json_error("Each reference image needs a file name, type, and image data", 400)
        file_name = image.get("fileName")
        content_type = image.get("contentType")
        encoded_image = image.get("imageData")
        if not isinstance(file_name, str) or not isinstance(content_type, str) or not isinstance(encoded_image, str):
            return _json_error("Reference image details are invalid", 400)
        file_name = file_name.replace("\\", "/").rsplit("/", 1)[-1].strip()
        if not file_name or len(file_name) > 160:
            return _json_error("Reference image file names must be 1 to 160 characters", 400)
        if content_type not in allowed_image_types:
            return _json_error("Reference images must be JPG, PNG, or WebP", 400)
        try:
            image_bytes = base64.b64decode(encoded_image, validate=True)
        except (binascii.Error, ValueError):
            return _json_error("Reference image data is invalid", 400)
        if not image_bytes or len(image_bytes) > 512 * 1024:
            return _json_error("Each reference image must be no larger than 512 KB", 400)
        if not image_signatures[content_type](image_bytes):
            return _json_error("Reference image data does not match its file type", 400)
        reference_images.append({
            "fileName": file_name,
            "contentType": content_type,
            "imageData": encoded_image,
        })
    record_data = {**data, "branchId": branch_id, "requestedDate": requested_date}
    record_data.pop("referenceImages", None)
    record_data["preferredPaymentMethod"] = payment_method
    record_data.pop("paymentMethod", None)
    identity = _current_identity()
    record_data["customerId"] = identity["id"]

    async def create_request(client: Prisma):
        branch = await client.branch.find_unique(where={"id": branch_id})
        if branch is None or not branch.isActive:
            raise ValueError("Selected branch is unavailable")
        selected_options = [
            (1, "occasion", data["occasion"]),
            (2, "size", data["size"]),
            (3, "layers", data["layers"]),
            (4, "tiers", data["tiers"]),
            (5, "flavor", data["flavor"]),
            (6, "frosting", data["frosting"]),
            (7, "theme", data["theme"]),
            (7, "color", data["color"]),
            (8, "fulfillment", data["fulfillmentMethod"]),
        ]
        options = await client.customizationoption.find_many(
            where={
                "isActive": True,
                "OR": [
                    {"step": step, "field": field, "value": value}
                    for step, field, value in selected_options
                ],
            }
        )
        options_by_field = {
            (option.step, option.field): option for option in options
        }
        if len(options_by_field) != len(selected_options):
            raise ValueError("One or more selected customization options are unavailable")
        size_option = options_by_field[(2, "size")]
        layers_option = options_by_field[(3, "layers")]
        tiers_option = options_by_field[(4, "tiers")]
        if size_option.price is None or layers_option.count is None or tiers_option.count is None:
            raise ValueError("Customization prices, layers, and tiers must be configured")
        fulfillment_option = options_by_field[(8, "fulfillment")]
        record_data["sizePrice"] = size_option.price
        record_data["selectionBasePrice"] = sum(
            (
                Decimal(str(option.price or 0))
                for (step, _field), option in options_by_field.items()
                if step <= 7
            ),
            Decimal("0.00"),
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        record_data["layersCount"] = layers_option.count
        record_data["tiersCount"] = tiers_option.count
        record_data["fulfillmentFee"] = fulfillment_option.fee or Decimal("0")
        record_data["frostingColor"] = options_by_field[(6, "frosting")].color
        record_data["themeTopper"] = options_by_field[(7, "theme")].topper
        record_data["colorSwatch"] = options_by_field[(7, "color")].swatch
        record_data["requestNumber"] = secrets.token_urlsafe(18)
        async with client.tx() as transaction:
            cake_request = await transaction.customcakerequest.create(data=_prepare_model_data(
                "customcakerequest",
                record_data,
                creating=True,
            ))
            for image in reference_images:
                await transaction.customcakereferenceimage.create(data={
                    "requestId": cake_request.id,
                    "storageKey": f"custom-cake-reference/{cake_request.id}/{secrets.token_urlsafe(18)}",
                    "fileName": image["fileName"],
                    "contentType": image["contentType"],
                    "imageData": image["imageData"],
                })
            order = None
            if identity and identity.get("role") == "customer":
                total = record_data["selectionBasePrice"] + Decimal(
                    str(fulfillment_option.fee or 0)
                )
                order_data = {
                    "customerId": identity["id"],
                    "branchId": branch_id,
                    "status": "pending",
                    "deliveryDate": requested_date,
                    "isPickup": "pickup" in str(data["fulfillmentMethod"]).lower(),
                    "subtotal": total,
                    "totalAmount": total,
                    "paymentStatus": "pending",
                    "paymentMethod": payment_method,
                    "specialInstructions": data.get("notes"),
                    "channel": "web",
                }
                order = await transaction.order.create(data=_prepare_model_data(
                    "order",
                    order_data,
                    creating=True,
                ))
                await transaction.orderitem.create(data=_prepare_model_data(
                    "orderitem",
                    {
                        "orderId": order.id,
                        "customCakeRequestId": cake_request.id,
                        "quantity": 1,
                        "pricePerUnit": total,
                        "subtotal": total,
                        "customizations": json.dumps({
                            "requestNumber": cake_request.requestNumber,
                            "occasion": cake_request.occasion,
                            "size": cake_request.size,
                            "layers": cake_request.layers,
                            "tiers": cake_request.tiers,
                            "flavor": cake_request.flavor,
                            "frosting": cake_request.frosting,
                            "theme": cake_request.theme,
                            "color": cake_request.color,
                        }),
                    },
                    creating=True,
                ))
            return cake_request, order

    try:
        cake_request, order = _db(create_request)
        return jsonify({"item": _serialize(cake_request), "order": _serialize(order) if order else None}), 201
    except ValueError as error:
        return _json_error(str(error), 400)
    except Exception:
        logger.exception("Could not create public custom cake request")
        return _json_error("Could not submit cake request; verify its details", 400)


@api.patch("/customer/profile")
@_authenticated({"customer"})
def update_customer_profile():
    data = request.get_json(silent=True)
    editable = {"name", "phone", "birthday", "address", "city", "postalCode", "preferredContactMethod", "specialRequests", "preferences"}
    if not isinstance(data, dict) or set(data) - editable:
        return _json_error("A valid profile object is required", 400)
    identity = _current_identity()

    async def update_profile(client: Prisma):
        prepared_data = _prepare_model_data(
            "customer",
            data,
            creating=False,
        )
        return await client.customer.update(
            where={"id": identity["id"]},
            data=prepared_data,
        )

    try:
        customer = _db(update_profile)
    except Exception:
        logger.exception("Could not update customer profile")
        return _json_error("Could not update customer profile", 400)
    result = _serialize(customer)
    result.pop("passwordHash", None)
    return jsonify({"profile": result})
