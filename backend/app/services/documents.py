from __future__ import annotations

import hashlib
import uuid

from sqlalchemy.orm import Session

from backend.app.models.document import Document


def calculate_checksum(pdf_bytes: bytes) -> str:
    return hashlib.sha256(pdf_bytes).hexdigest()


def get_document_by_checksum(
    db: Session,
    user_id: uuid.UUID,
    checksum_sha256: str,
) -> Document | None:
    return (
        db.query(Document)
        .filter(
            Document.user_id == user_id,
            Document.checksum_sha256 == checksum_sha256,
        )
        .order_by(Document.created_at.desc())
        .first()
    )


def get_document_by_id(
    db: Session,
    id: uuid.UUID,
) -> Document | None:
    return (
        db.query(Document)
        .filter(
            Document.id == id,
        )
        .order_by(Document.created_at.desc())
        .first()
    )


def list_documents_for_user(
    db: Session,
    user_id: uuid.UUID,
) -> list[Document]:
    return (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .all()
    )
