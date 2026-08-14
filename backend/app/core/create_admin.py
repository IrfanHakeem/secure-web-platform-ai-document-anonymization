from getpass import getpass

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User


def create_admin():

    db = SessionLocal()

    try:
        admin_role = db.scalar(
            select(Role).where(
                Role.name == "Administrator"
            )
        )

        if admin_role is None:
            print("Administrator role does not exist.")
            return

        username = input("Admin username: ").strip()

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

        password = getpass("Admin password: ")

        if not password:
            print("Password cannot be empty.")
            return

        admin_user = User(
            username=username,
            password_hash=hash_password(password),
            role_id=admin_role.id,
            department_id=None,
            is_active=True
        )

        db.add(admin_user)
        db.commit()

        print("Administrator account created successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()