from sqlalchemy import text

from app.core.database import engine


def main():
    statements = [
        """
        ALTER TABLE original_file_requests
        ADD COLUMN IF NOT EXISTS approved_at
        TIMESTAMP WITH TIME ZONE NULL
        """,
        """
        ALTER TABLE original_file_requests
        ADD COLUMN IF NOT EXISTS download_count
        INTEGER NOT NULL DEFAULT 0
        """,
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(
                text(statement)
            )

    print(
        "Original-file-request download columns are ready."
    )


if __name__ == "__main__":
    main()
