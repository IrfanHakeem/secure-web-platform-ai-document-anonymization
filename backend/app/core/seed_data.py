from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.role import Role


DEFAULT_ROLES = [
    "Administrator",
    "User",
    "Security Officer",
]


def seed_roles():
    db = SessionLocal()

    try:
        old_user_role = db.scalar(
            select(Role).where(
                Role.name == "Department User"
            )
        )

        new_user_role = db.scalar(
            select(Role).where(
                Role.name == "User"
            )
        )

        if old_user_role is not None and new_user_role is None:
            old_user_role.name = "User"

            # Important because SessionLocal uses autoflush=False.
            # Push the rename before checking/inserting roles below.
            db.flush()

        for role_name in DEFAULT_ROLES:
            existing_role = db.scalar(
                select(Role).where(
                    Role.name == role_name
                )
            )

            if existing_role is None:
                db.add(
                    Role(name=role_name)
                )

                # Make this role visible to later queries
                # inside the same transaction.
                db.flush()

        db.commit()

        print(
            "System roles synchronized successfully."
        )

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_roles()