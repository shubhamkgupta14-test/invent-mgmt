import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from fastapi.concurrency import run_in_threadpool

from app.services.company_service import get_company_brand_name
from app.utils.settings import Settings


class EmailNotConfiguredError(RuntimeError):
    pass


def _smtp_configured():
    return bool(Settings.SMTP_HOST and Settings.SMTP_FROM_EMAIL)


def _send_email_sync(to_email: str, subject: str, body: str, from_name: str = None):
    if not _smtp_configured():
        if Settings.ENVIRONMENT.lower() in ["dev", "development", "local", "test"]:
            # print(f"[DEV EMAIL] To: {to_email}\nSubject: {subject}\n{body}")
            return {"sent": False, "reason": "smtp_not_configured"}
        raise EmailNotConfiguredError("SMTP is not configured")

    message = EmailMessage()
    message["From"] = formataddr((from_name or Settings.SMTP_FROM_NAME, Settings.SMTP_FROM_EMAIL))
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(Settings.SMTP_HOST, Settings.SMTP_PORT, timeout=15) as server:
        if Settings.SMTP_USE_TLS:
            server.starttls()
        if Settings.SMTP_USERNAME and Settings.SMTP_PASSWORD:
            server.login(Settings.SMTP_USERNAME, Settings.SMTP_PASSWORD)
        server.send_message(message)

    return {"sent": True}


async def send_email(to_email: str, subject: str, body: str, from_name: str = None):
    return await run_in_threadpool(_send_email_sync, to_email, subject, body, from_name)


async def send_password_reset_otp(to_email: str, otp: str):
    if Settings.ENVIRONMENT.lower() in ["dev", "development", "local", "test"]:
        print(f"[DEV OTP] Password reset OTP for {to_email}: {otp}")

    brand_name = await get_company_brand_name()
    subject = f"{brand_name} password reset OTP"
    body = (
        f"Your {brand_name} password reset OTP is {otp}.\n\n"
        f"This OTP expires in {Settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES} minutes. "
        "If you did not request this, you can ignore this email."
    )
    return await send_email(to_email, subject, body, brand_name)


async def send_email_verification_otp(to_email: str, otp: str):
    if Settings.ENVIRONMENT.lower() in ["dev", "development", "local", "test"]:
        print(f"[DEV OTP] Email verification OTP for {to_email}: {otp}")

    brand_name = await get_company_brand_name()
    subject = f"Verify your {brand_name} email"
    body = (
        f"Your {brand_name} email verification OTP is {otp}.\n\n"
        f"This OTP expires in {Settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES} minutes. "
        "If you did not request this, you can ignore this email."
    )
    return await send_email(to_email, subject, body, brand_name)
