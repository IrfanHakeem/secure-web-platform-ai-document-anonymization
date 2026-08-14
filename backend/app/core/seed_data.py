from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.role import Role


DEFAULT_ROLES = [
    "Administrator",
    "Department User",
]


def seed_roles():
    db = SessionLocal()

    try:
        for role_name in DEFAULT_ROLES:
            existing_role = db.scalar(
                select(Role).where(Role.name == role_name)
            )

            if existing_role is None:
                db.add(Role(name=role_name))

        db.commit()
        print("Default roles seeded successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    seed_roles()