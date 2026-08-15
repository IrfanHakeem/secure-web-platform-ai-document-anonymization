from getpass import getpass

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User
from app.services.audit_service import record_audit_event


def recover_administrator():
    db = SessionLocal()

    try:
        administrators = db.scalars(
            select(User)
            .join(
                Role,
                User.role_id == Role.id
            )
            .where(
                Role.name == "Administrator"
            )
            .order_by(
                User.id
            )
        ).all()

        if not administrators:
            print(
                "No Administrator account found."
            )
            return

        print("\nAdministrator accounts:")
        print("-----------------------")

        for administrator in administrators:
            print(
                f"ID: {administrator.id} | "
                f"Username: {administrator.username}"
            )

        print()

        admin_id_input = input(
            "Enter Administrator ID to recover: "
        ).strip()

        if not admin_id_input.isdigit():
            print(
                "Invalid Administrator ID."
            )
            return

        admin_id = int(
            admin_id_input
        )

        administrator = next(
            (
                admin
                for admin in administrators
                if admin.id == admin_id
            ),
            None
        )

        if administrator is None:
            print(
                "Administrator account not found."
            )
            return

        new_password = getpass(
            "Enter new password: "
        )

        confirm_password = getpass(
            "Confirm new password: "
        )

        if not new_password:
            print(
                "Password cannot be empty."
            )
            return

        if new_password != confirm_password:
            print(
                "Passwords do not match."
            )
            return

        if (
            len(
                new_password.encode("utf-8")
            )
            > 72
        ):
            print(
                "Password is too long for bcrypt."
            )
            return

        administrator.password_hash = (
            hash_password(
                new_password
            )
        )

        db.commit()

        record_audit_event(
            action="ADMIN_PASSWORD_RECOVERY",
            user_id=None,
            resource_type="user",
            resource_id=administrator.id,
            details=(
                "Administrator password recovered "
                "using local server recovery script"
            ),
            ip_address=None,
        )

        print()
        print(
            "Administrator password "
            "recovered successfully."
        )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    recover_administrator()