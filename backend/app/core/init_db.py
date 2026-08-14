from app.core.database import Base, engine
from app.models import Department, Document, Role, User


def create_tables():
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    create_tables()
    print("Database tables created successfully.")