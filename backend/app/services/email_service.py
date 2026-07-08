import smtplib
from html import escape
from email.message import EmailMessage
from email.utils import formataddr
from datetime import UTC, datetime, timedelta

from fastapi.concurrency import run_in_threadpool

from app.database.mongodb import db
from app.services.company_service import get_company_brand_name
from app.utils.settings import Settings

users_collection = db.users
mail_collection = db.mail_messages


class EmailNotConfiguredError(RuntimeError):
    pass


def _smtp_configured():
    return bool(Settings.SMTP_HOST and Settings.SMTP_FROM_EMAIL)


def _send_email_sync(
    to_email: str,
    subject: str,
    body: str,
    from_name: str = None,
    html_body: str = None,
    attachments: list[dict] = None,
):
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
    if html_body:
        message.add_alternative(html_body, subtype="html")
    for attachment in attachments or []:
        message.add_attachment(
            attachment["content"],
            maintype=attachment.get("maintype", "application"),
            subtype=attachment.get("subtype", "octet-stream"),
            filename=attachment.get("filename"),
        )

    with smtplib.SMTP(Settings.SMTP_HOST, Settings.SMTP_PORT, timeout=15) as server:
        if Settings.SMTP_USE_TLS:
            server.starttls()
        if Settings.SMTP_USERNAME and Settings.SMTP_PASSWORD:
            server.login(Settings.SMTP_USERNAME, Settings.SMTP_PASSWORD)
        server.send_message(message)

    return {"sent": True}


async def send_email(
    to_email: str,
    subject: str,
    body: str,
    from_name: str = None,
    html_body: str = None,
    attachments: list[dict] = None,
):
    return await run_in_threadpool(
        _send_email_sync,
        to_email,
        subject,
        body,
        from_name,
        html_body,
        attachments,
    )


def build_otp_email_template(
    brand_name: str,
    title: str,
    intro: str,
    otp: str,
    expiry_minutes: int,
    reason: str,
    theme: str = "blue",
):
    themes = {
        "blue": {
            "header": "#1d4ed8",
            "brand": "#dbeafe",
            "box_bg": "#eff6ff",
            "box_border": "#93c5fd",
            "box_label": "#1d4ed8",
            "otp": "#1e3a8a",
        },
        "teal": {
            "header": "#0f766e",
            "brand": "#ccfbf1",
            "box_bg": "#f0fdfa",
            "box_border": "#5eead4",
            "box_label": "#0f766e",
            "otp": "#134e4a",
        },
    }
    palette = themes.get(theme, themes["blue"])
    safe_brand = escape(brand_name)
    safe_title = escape(title)
    safe_intro = escape(intro)
    safe_otp = escape(otp)
    safe_reason = escape(reason)

    text_body = (
        f"{title}\n\n"
        f"{intro}\n\n"
        f"OTP: {otp}\n\n"
        f"This code expires in {expiry_minutes} minutes. "
        "Do not share this code with anyone.\n\n"
        f"If you did not request this {reason}, you can ignore this email.\n\n"
        f"Thanks,\n{brand_name}"
    )

    html_body = f"""
    <!doctype html>
    <html>
      <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="background:{palette["header"]};color:#ffffff;padding:22px 28px;">
                    <div style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:{palette["brand"]};">{safe_brand}</div>
                    <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">{safe_title}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155;">{safe_intro}</p>
                    <div style="margin:22px 0;padding:18px;border:1px dashed {palette["box_border"]};border-radius:10px;background:{palette["box_bg"]};text-align:center;">
                      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:{palette["box_label"]};">One time password</div>
                      <div style="margin-top:8px;font-size:32px;font-weight:700;letter-spacing:.22em;color:{palette["otp"]};">{safe_otp}</div>
                    </div>
                    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">
                      This code expires in <strong>{expiry_minutes} minutes</strong>. Do not share this code with anyone.
                    </p>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                      If you did not request this {safe_reason}, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5;">
                    Sent by {safe_brand}. This is an automated security email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """

    return text_body, html_body


def _is_dev_like_environment():
    return Settings.ENVIRONMENT.lower() in ["dev", "development", "local", "test"]


async def _send_dev_mailer_otp(to_email: str, subject: str, body: str, html_body: str):
    user = await users_collection.find_one({
        "email": (to_email or "").strip().lower(),
        "active": True,
    })
    if not user:
        return {"sent": False, "reason": "user_not_found"}

    now = datetime.now(UTC)
    brand_name = await get_company_brand_name()
    display_name = " ".join(
        part for part in [user.get("firstname"), user.get("lastname")] if part
    ).strip() or user.get("username")
    expire_days = 1 if _is_dev_like_environment() else 30

    await mail_collection.insert_one({
        "owner_username": user.get("username"),
        "folder": "inbox",
        "from_username": "system",
        "from_name": f"{brand_name} Mailer",
        "from_email": "",
        "to_username": user.get("username"),
        "to_name": display_name,
        "to_email": user.get("email", ""),
        "subject": subject,
        "body": body,
        "html_body": html_body,
        "signature": "",
        "system_generated": True,
        "read": False,
        "starred": False,
        "created_at": now,
        "updated_at": now,
        "expire_at": now + timedelta(days=expire_days),
    })
    return {"sent": True, "channel": "mailer"}


async def send_password_reset_otp(to_email: str, otp: str):
    if Settings.ENVIRONMENT.lower() in ["dev", "development", "local", "test"]:
        print(f"[DEV OTP] Password reset OTP for {to_email}: {otp}")

    brand_name = await get_company_brand_name()
    subject = f"Reset your {brand_name} password"
    body, html_body = build_otp_email_template(
        brand_name=brand_name,
        title="Reset your password",
        intro=f"Use this verification code to reset your {brand_name} password.",
        otp=otp,
        expiry_minutes=Settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES,
        reason="password reset",
        theme="blue",
    )
    return await send_email(to_email, subject, body, brand_name, html_body)


async def send_email_verification_otp(to_email: str, otp: str):
    if _is_dev_like_environment():
        print(f"[DEV OTP] Email verification OTP for {to_email}: {otp}")

    brand_name = await get_company_brand_name()
    subject = f"Verify your {brand_name} email"
    body, html_body = build_otp_email_template(
        brand_name=brand_name,
        title="Verify your email",
        intro=f"Use this verification code to confirm your email address for {brand_name}.",
        otp=otp,
        expiry_minutes=Settings.PASSWORD_RESET_OTP_EXPIRE_MINUTES,
        reason="email verification",
        theme="teal",
    )
    if _is_dev_like_environment():
        await _send_dev_mailer_otp(to_email, subject, body, html_body)

    return await send_email(to_email, subject, body, brand_name, html_body)
