import logging
import os
import smtplib
import ssl
from email.message import EmailMessage

import requests

logger = logging.getLogger(__name__)


class EmailConfigurationError(Exception):
    pass


class EmailDeliveryError(OSError):
    def __init__(
        self,
        stage: str,
        cause: BaseException,
        response_code: object = None,
        protocol: str = "SMTP",
    ) -> None:
        self.stage = stage
        self.error_type = type(cause).__name__
        self.response_code = response_code
        self.errno = getattr(cause, "errno", None)
        diagnostic = f"{stage}: {self.error_type}"
        if response_code is not None:
            diagnostic += f" ({protocol} {response_code})"
        if self.errno is not None:
            diagnostic += f" (errno {self.errno})"
        self.diagnostic = diagnostic
        super().__init__("Email delivery failed")


def send_email_message(recipient: str, subject: str, body: str) -> None:
    provider = os.getenv("EMAIL_PROVIDER", "smtp").strip().lower()
    if provider not in {"smtp", "resend"}:
        raise EmailConfigurationError("EMAIL_PROVIDER must be smtp or resend")

    username = os.getenv("EMAIL_SMTP_USERNAME", "").strip()
    password = os.getenv("EMAIL_SMTP_PASSWORD", "")
    sender = os.getenv("EMAIL_FROM", "").strip() or username
    recipient_domain = recipient.rpartition("@")[2].lower() or "invalid"

    if provider == "resend":
        api_key = os.getenv("RESEND_API_KEY", "").strip()
        if not api_key or not sender:
            missing = []
            if not api_key:
                missing.append("RESEND_API_KEY")
            if not sender:
                missing.append("EMAIL_FROM")
            logger.error("Resend email delivery is not configured; missing: %s", ", ".join(missing))
            raise EmailConfigurationError("Resend email delivery is not configured")
        logger.info(
            "Starting Resend delivery (recipient_domain=%s)",
            recipient_domain,
        )
        try:
            response = requests.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "from": sender,
                    "to": [recipient],
                    "subject": subject,
                    "text": body,
                },
                timeout=15,
            )
            response.raise_for_status()
        except requests.RequestException as error:
            response_code = error.response.status_code if error.response is not None else None
            logger.error(
                "Resend delivery failed (recipient_domain=%s error_type=%s status=%s)",
                recipient_domain,
                type(error).__name__,
                response_code,
            )
            raise EmailDeliveryError("https_api", error, response_code, "HTTP") from error
        logger.info(
            "Resend accepted email (recipient_domain=%s status=%s)",
            recipient_domain,
            response.status_code,
        )
        return

    missing = [
        name
        for name, value in (
            ("EMAIL_SMTP_USERNAME", username),
            ("EMAIL_SMTP_PASSWORD", password),
            ("EMAIL_FROM or EMAIL_SMTP_USERNAME", sender),
        )
        if not value
    ]
    if missing:
        logger.error(
            "Email delivery is not configured; missing: %s",
            ", ".join(missing),
        )
        raise EmailConfigurationError("Gmail SMTP credentials are not configured")

    host = os.getenv("EMAIL_SMTP_HOST", "smtp.gmail.com").strip()
    try:
        port = int(os.getenv("EMAIL_SMTP_PORT", "587"))
    except ValueError as error:
        logger.error("Email delivery has an invalid EMAIL_SMTP_PORT value")
        raise EmailConfigurationError("EMAIL_SMTP_PORT must be an integer") from error
    if not host or not 1 <= port <= 65535:
        logger.error("Email delivery has an invalid SMTP host or port")
        raise EmailConfigurationError("Invalid SMTP host or port")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content(body)

    stage = "connect"
    logger.info(
        "Starting SMTP delivery (host=%s port=%s recipient_domain=%s)",
        host,
        port,
        recipient_domain,
    )
    try:
        with smtplib.SMTP(host, port, timeout=30) as smtp:
            stage = "starttls"
            smtp.starttls(context=ssl.create_default_context())
            stage = "login"
            smtp.login(username, password)
            stage = "send"
            smtp.send_message(message)
        logger.info(
            "SMTP server accepted email (host=%s port=%s recipient_domain=%s)",
            host,
            port,
            recipient_domain,
        )
    except (OSError, smtplib.SMTPException) as error:
        smtp_code = getattr(error, "smtp_code", None)
        if isinstance(error, smtplib.SMTPRecipientsRefused):
            smtp_codes = sorted({reply[0] for reply in error.recipients.values()})
            smtp_code = ",".join(str(code) for code in smtp_codes)
        logger.error(
            "SMTP delivery failed (stage=%s host=%s port=%s "
            "recipient_domain=%s error_type=%s smtp_code=%s errno=%s)",
            stage,
            host,
            port,
            recipient_domain,
            type(error).__name__,
            smtp_code,
            getattr(error, "errno", None),
        )
        raise EmailDeliveryError(stage, error, smtp_code) from error


def _send_code(recipient: str, code: str, subject: str, instructions: str) -> None:
    body = (
        f"{instructions}\n\n"
        f"{code}\n\n"
        "This code expires in 10 minutes. If you did not request it, you can "
        "ignore this email."
    )
    send_email_message(recipient, subject, body)


def send_verification_code(recipient: str, code: str) -> None:
    _send_code(
        recipient,
        code,
        "Your Angeliz Cakes verification code",
        "Use this code to verify your Angeliz Cakes email address:",
    )


def send_password_reset_code(recipient: str, code: str) -> None:
    _send_code(
        recipient,
        code,
        "Your Angeliz Cakes password reset code",
        "Use this code to reset your Angeliz Cakes password:",
    )
