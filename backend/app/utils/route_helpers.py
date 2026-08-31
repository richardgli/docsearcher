from __future__ import annotations

import math
import os
import uuid
from types import SimpleNamespace
from typing import Any
from openai import OpenAI
from starlette.requests import Request
from sqlalchemy.orm import Session

from fastapi import UploadFile
from supabase import Client

from backend.app.models import Document, Chunk
from backend.app.services.indexing import extract_chunks, embed_chunks, IndexingService
from backend.app.services.documents import (
    calculate_checksum,
    get_document_by_checksum,
)

_openai_guest = OpenAI(api_key=os.environ["OPENAI_API_KEY"])


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


def resolve_request_user_context(request: Request) -> dict[str, Any]:
    user = request.session.get("user")
    if user:
        return {"is_guest": False, "user_id": uuid.UUID(user["id"]), "user": user}

    guest_id = request.session.get("guest_user_id")
    if not guest_id:
        guest_id = str(uuid.uuid4())
        request.session["guest_user_id"] = guest_id

    return {"is_guest": True, "user_id": uuid.UUID(guest_id), "user": None}


def _get_guest_documents(guest_documents: dict[str, dict[str, Any]], request: Request) -> dict[str, dict[str, Any]]:
    guest_id = resolve_request_user_context(request)["user_id"]
    guest_documents.setdefault(str(guest_id), {})
    return guest_documents[str(guest_id)]


def write_guest_document(guest_documents: dict[str, dict[str, Any]], request: Request, file: UploadFile, pdf_bytes: bytes) -> dict[str, Any]:
    guest_docs = _get_guest_documents(guest_documents, request)
    guest_doc_id = str(uuid.uuid4())
    guest_docs.clear()
    guest_docs[guest_doc_id] = {
        "id": guest_doc_id,
        "filename": file.filename or "uploaded.pdf",
        "bytes": pdf_bytes,
    }
    request.session["guest_document_id"] = guest_doc_id
    return guest_docs[guest_doc_id]


def migrate_guest_document_to_user(
    guest_documents: dict[str, dict[str, Any]],
    request: Request,
    client: Client,
    user_id: uuid.UUID,
    session: Session,
) -> dict[str, Any] | None:
    guest_id = request.session.get("guest_user_id")
    guest_doc_id = request.session.get("guest_document_id")
    if not guest_id or not guest_doc_id:
        return None

    guest_docs = guest_documents.get(str(guest_id), {})
    guest_doc = guest_docs.get(str(guest_doc_id))
    if guest_doc is None:
        return None

    file_like = SimpleNamespace(filename=guest_doc["filename"])
    created_doc = get_or_create_document(client, session, user_id, file_like, guest_doc["bytes"])

    guest_documents.pop(str(guest_id), None)
    request.session.pop("guest_user_id", None)
    request.session.pop("guest_document_id", None)

    return {
        "document_id": str(created_doc.id),
        "filename": created_doc.filename,
        "bytes": guest_doc["bytes"],
    }


def get_guest_document(guest_documents: dict[str, dict[str, Any]], request: Request, document_id: str | uuid.UUID) -> dict[str, Any] | None:
    guest_docs = _get_guest_documents(guest_documents, request)
    key = str(document_id)
    doc = guest_docs.get(key)
    if doc is not None:
        return doc

    current_guest_id = request.session.get("guest_document_id")
    if current_guest_id == key:
        return guest_docs.get(current_guest_id)
    return None


def _embed_guest_query(query: str) -> list[float]:
    response = _openai_guest.embeddings.create(model="text-embedding-3-small", input=[query])
    return response.data[0].embedding


def _guest_cosine_similarity(left: list[float], right: list[float]) -> float:
    dot = sum(x * y for x, y in zip(left, right))
    norm_left = math.sqrt(sum(x * x for x in left))
    norm_right = math.sqrt(sum(x * x for x in right))
    if norm_left == 0 or norm_right == 0:
        return 0.0
    return dot / (norm_left * norm_right)


def search_guest_document(pdf_bytes: bytes, query: str, top_k: int) -> list[dict[str, Any]]:
    raw_chunks = extract_chunks(pdf_bytes)
    if not raw_chunks:
        return []

    embeddings = embed_chunks(raw_chunks)
    query_vector = _embed_guest_query(query)
    scored = []

    for raw_chunk, embedding in zip(raw_chunks, embeddings):
        score = _guest_cosine_similarity(query_vector, embedding)
        scored.append({
            "chunk_id": str(uuid.uuid4()),
            "page": raw_chunk.page,
            "chunk_index": raw_chunk.chunk_index,
            "score": round(max(0.0, min(1.0, score)), 4),
            "content": raw_chunk.content,
            "bbox": list(raw_chunk.bbox) if raw_chunk.bbox else None,
        })

    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored[:top_k]