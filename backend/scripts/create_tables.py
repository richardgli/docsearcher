#!/usr/bin/env python3
"""
Create all tables against the local Docker Postgres.
Usage:
    cd backend
    python -m scripts.create_tables
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Import models so Base.metadata knows about them
from app.db.base import Base
from app.db.session import engine
import app.models.document  # noqa: F401
import app.models.chunk     # noqa: F401


def main() -> None:
    db_url = os.environ.get("DATABASE_URL", "")
    if "supabase" in db_url:
        raise SystemExit(
            "Refusing to run create_all against Supabase URL. "
            "Use supabase/schema.sql in the Supabase SQL editor instead."
        )

    print(f"Creating tables on: {db_url}")
    with engine.begin() as conn:
        conn.execute(
            __import__("sqlalchemy").text("CREATE EXTENSION IF NOT EXISTS vector")
        )
    Base.metadata.create_all(bind=engine)
    print("Done.")


if __name__ == "__main__":
    main()