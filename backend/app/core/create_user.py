from getpass import getpass

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User


def create_user():
    db = SessionLocal()

    try:
        user_role = db.scalar(
            select(Role).where(
                Role.name == "User"
            )
        )

        if user_role is None:
            print(
                "User role does not exist."
            )
            return

        username = input(
            "User username: "
        ).strip()

        if not username:
            print(
                "Username cannot be empty."
            )
            return

        existing_user = db.scalar(
            select(User).where(
                User.username == username
            )
        )

        if existing_user is not None:
            print(
                "Username already exists."
            )
            return

        password = getpass(
            "User password: "
        )

        if not password:
            print(
                "Password cannot be empty."
            )
            return

        user = User(
            username=username,
            password_hash=hash_password(
                password
            ),
            role_id=user_role.id,
            department_id=None,
            is_active=True
        )

        db.add(
            user
        )

        db.commit()

        print(
            "User account created successfully."
        )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    create_user()
