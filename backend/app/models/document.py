from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)

    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    file_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    file_size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    sha256_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False
    )

    encrypted_file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )

    anonymized_file_path: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    is_private: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    owner = relationship("User")