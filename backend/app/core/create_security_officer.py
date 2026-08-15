from getpass import getpass

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User


def create_security_officer():
    db = SessionLocal()

    try:
        security_role = db.scalar(
            select(Role).where(
                Role.name == "Security Officer"
            )
        )

        if security_role is None:
            print("Security Officer role does not exist.")
            return

        username = input(
            "Security Officer username: "
        ).strip()

        if not username:
            print("Username cannot be empty.")
            return

        existing_user = db.scalar(
            select(User).where(
                User.username == username
            )
        )

        if existing_user is not None:
            print("Username already exists.")
            return

        password = getpass(
            "Security Officer password: "
        )

        if not password:
            print("Password cannot be empty.")
            return

        security_officer = User(
            username=username,
            password_hash=hash_password(password),
            role_id=security_role.id,
            department_id=None,
            is_active=True
        )

        db.add(security_officer)
        db.commit()

        print(
            "Security Officer account created successfully."
        )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    create_security_officer()