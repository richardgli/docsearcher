import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
# Expected format: postgresql+psycopg://user:password@host:port/dbname

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # detects stale connections
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db():
    """FastAPI dependency that yields a session and always closes it."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()