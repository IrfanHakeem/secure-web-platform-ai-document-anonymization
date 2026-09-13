from sqlalchemy import text

from app.core.database import engine


def main():
    statements = [
        """
        ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS is_archived
        BOOLEAN NOT NULL DEFAULT FALSE
        """,
        """
        ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS archived_at
        TIMESTAMP NULL
        """,
        """
        UPDATE documents
        SET is_archived = FALSE
        WHERE is_archived IS NULL
        """,
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(
                text(statement)
            )

    print(
        "Document archive columns are ready."
    )


if __name__ == "__main__":
    main()
