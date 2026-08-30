from __future__ import annotations

import os
import uuid
from sqlalchemy.orm import Session

from supabase import Client
from backend.app.models import Document, Chunk
from backend.app.services.indexing import IndexingService
from backend.app.services.documents import (
    calculate_checksum,
    get_document_by_checksum,
)


def file_exists_in_storage(client: Client, bucket: str, storage_path: str) -> bool:
    folder = "/".join(storage_path.split("/")[:-1])
    filename = storage_path.split("/")[-1]

    files = client.storage.from_(bucket).list(folder)
    return any(f["name"] == filename for f in files)


def get_or_create_document(client: Client, session: Session, user_id: uuid.UUID, file, pdf_bytes: bytes) -> Document:
    BUCKET_NAME = os.getenv("BUCKET_NAME")
    checksum = calculate_checksum(pdf_bytes)
    doc = get_document_by_checksum(session, user_id, checksum)

    if doc is None:
        storage_path = f"uploads/{user_id}/{file.filename or 'uploaded.pdf'}"

        # Upload to storage
        client.storage.from_(BUCKET_NAME).upload(
            path=storage_path,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf"},
        )

        doc = Document(
            user_id=user_id,
            filename=file.filename or "uploaded.pdf",
            storage_path=f"uploads/{user_id}/{file.filename or 'uploaded.pdf'}",
            checksum_sha256=checksum,
            status="uploaded",
        )
        session.add(doc)
        session.commit()
        session.refresh(doc)

    if not file_exists_in_storage(client, BUCKET_NAME, doc.storage_path):
        client.storage.from_(BUCKET_NAME).upload(
            path=doc.storage_path,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf"},
        )

    if doc.status != "indexed":
        IndexingService(session).index_document(doc.id, pdf_bytes)

    return doc


def delete_document(client: Client, session: Session, user_id: uuid.UUID, document_id: uuid.UUID) -> None:
    BUCKET_NAME = os.getenv("BUCKET_NAME")
    doc = (
        session.query(Document)
        .filter(
            Document.id == document_id,
            Document.user_id == user_id)
        .first()
    )
    if doc is None:
        raise ValueError("Document not found")

    storage_path = doc.storage_path

    try:
        # Removes document chunks in chunks table
        session.query(Chunk).filter(
            Chunk.document_id == document_id,
            Chunk.user_id == user_id,
        ).delete(synchronize_session=False)

        # Removes document record in documents table
        session.query(Document).filter(
            Document.id == document_id,
            Document.user_id == user_id,
        ).delete(synchronize_session=False)

        # Removes PDF from Supabase storage
        client.storage.from_(BUCKET_NAME).remove([storage_path])

        session.commit()
    except Exception:
        session.rollback()
        raise