import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ForeignKey, Index, Integer, Text, DateTime, 
    UniqueConstraint, String,
)
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base

EMBEDDING_DIM = 1536  # text-embedding-3-small


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    page: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # pgvector column — stored as vector(1536)
    embedding: Mapped[list[float]] = mapped_column(
        Vector(EMBEDDING_DIM), nullable=True
    )

    # full-text search tsvector — populated by DB trigger (see schema.sql)
    tsv: Mapped[object] = mapped_column(TSVECTOR, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    document: Mapped["Document"] = relationship(  # noqa: F821
        "Document", back_populates="chunks"
    )

    __table_args__ = (
        UniqueConstraint("document_id", "page", "chunk_index",
                         name="uq_chunk_position"),
        Index("ix_chunks_user_document", "user_id", "document_id"),
        Index("ix_chunks_document_page_idx", "document_id", "page", "chunk_index"),
        # GIN index on tsv created in schema.sql (cannot express in SA easily)
    )