import os
import smtplib
import ssl
from email.message import EmailMessage

from dotenv import load_dotenv


load_dotenv()


def send_admin_password_reset_otp(
    to_email: str,
    otp: str
) -> None:

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(
        os.getenv("SMTP_PORT", "587")
    )

    smtp_username = os.getenv(
        "SMTP_USERNAME"
    )

    smtp_password = os.getenv(
        "SMTP_PASSWORD"
    )

    smtp_from_email = (
        os.getenv("SMTP_FROM_EMAIL")
        or smtp_username
    )

    if not all(
        [
            smtp_host,
            smtp_username,
            smtp_password,
            smtp_from_email,
        ]
    ):
        raise RuntimeError(
            "SMTP configuration is incomplete"
        )

    message = EmailMessage()

    message["Subject"] = (
        "Secure Web Platform - "
        "Administrator Password Reset OTP"
    )

    message["From"] = smtp_from_email
    message["To"] = to_email

    message.set_content(
        (
            "Administrator Password Recovery\n\n"
            f"Your OTP is: {otp}\n\n"
            "This OTP expires in 10 minutes.\n"
            "Do not share this OTP with anyone."
        )
    )

    tls_context = (
        ssl.create_default_context()
    )

    with smtplib.SMTP(
        smtp_host,
        smtp_port,
        timeout=20
    ) as smtp:

        smtp.ehlo()

        smtp.starttls(
            context=tls_context
        )

        smtp.ehlo()

        smtp.login(
            smtp_username,
            smtp_password
        )

        smtp.send_message(
            message
        )