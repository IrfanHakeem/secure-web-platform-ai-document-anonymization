from getpass import getpass

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User


def main():
    db = SessionLocal()

    try:
        admin = db.scalar(
            select(User)
            .join(Role)
            .where(
                Role.name == "Administrator"
            )
        )

        if admin is None:
            print(
                "ERROR: Administrator account not found."
            )
            return

        print(
            f"Administrator account: {admin.email}"
        )

        password = getpass(
            "New password: "
        )

        confirm_password = getpass(
            "Confirm new password: "
        )

        if not password:
            print(
                "ERROR: Password cannot be empty."
            )
            return

        if password != confirm_password:
            print(
                "ERROR: Passwords do not match."
            )
            return

        if len(
            password.encode("utf-8")
        ) > 72:
            print(
                "ERROR: Password is too long."
            )
            return

        admin.password_hash = (
            hash_password(password)
        )

        db.commit()

        print(
            "SUCCESS: Administrator password updated."
        )

    finally:
        db.close()


if __name__ == "__main__":
    main()