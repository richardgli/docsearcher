"""
IndexingService

Responsibilities:
  1. Download PDF bytes from Supabase Storage (caller passes bytes directly
     for now — routing layer handles the download).
  2. Extract text per page with PyMuPDF.
  3. Split each page into fixed-size token chunks (400 tok, 80 overlap).
  4. Embed chunks in batches via OpenAI text-embedding-3-small.
  5. Upsert chunks into Postgres; update document status.
"""
from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from typing import Generator

import fitz  # PyMuPDF
import tiktoken
from openai import OpenAI
from sqlalchemy.orm import Session

from app.models.chunk import Chunk, EMBEDDING_DIM
from app.models.document import Document

CHUNK_TOKENS = 400
OVERLAP_TOKENS = 80
EMBED_MODEL = "text-embedding-3-small"
EMBED_BATCH = 100  # OpenAI allows up to 2048 inputs; 100 is safe and fast

_enc = tiktoken.encoding_for_model("text-embedding-3-small")
_openai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])


# ── Chunking ──────────────────────────────────────────────────

@dataclass
class RawChunk:
    page: int          # 1-indexed
    chunk_index: int   # 0-indexed within page
    content: str


def _split_page(text: str, page: int) -> list[RawChunk]:
    """Split one page of text into overlapping token-bounded chunks."""
    tokens = _enc.encode(text)
    chunks: list[RawChunk] = []
    start = 0
    idx = 0
    while start < len(tokens):
        end = min(start + CHUNK_TOKENS, len(tokens))
        chunk_text = _enc.decode(tokens[start:end]).strip()
        if chunk_text:
            chunks.append(RawChunk(page=page, chunk_index=idx, content=chunk_text))
            idx += 1
        start += CHUNK_TOKENS - OVERLAP_TOKENS
    return chunks


def extract_chunks(pdf_bytes: bytes) -> list[RawChunk]:
    """Extract text from PDF and return all raw chunks across all pages."""
    all_chunks: list[RawChunk] = []
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text()
            if text.strip():
                all_chunks.extend(_split_page(text, page=page_num))
    return all_chunks


# ── Embedding ─────────────────────────────────────────────────

def _batch(items: list, size: int) -> Generator[list, None, None]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def embed_chunks(raw_chunks: list[RawChunk]) -> list[list[float]]:
    """Return one embedding vector per chunk, preserving order."""
    embeddings: list[list[float]] = []
    for batch in _batch(raw_chunks, EMBED_BATCH):
        resp = _openai.embeddings.create(
            model=EMBED_MODEL,
            input=[c.content for c in batch],
        )
        embeddings.extend([item.embedding for item in resp.data])
    return embeddings


# ── Service ───────────────────────────────────────────────────

class IndexingService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def index_document(self, document_id: uuid.UUID, pdf_bytes: bytes) -> None:
        """
        Full indexing pipeline for one document.
        Deletes any existing chunks first (safe re-index).
        Updates document.status throughout.
        """
        doc = self.db.get(Document, document_id)
        if doc is None:
            raise ValueError(f"Document {document_id} not found")

        # Mark as indexing
        doc.status = "indexing"
        self.db.commit()

        try:
            # 1. Extract + chunk
            raw_chunks = extract_chunks(pdf_bytes)

            # 2. Embed
            vectors = embed_chunks(raw_chunks)

            # 3. Delete stale chunks (re-index support)
            self.db.query(Chunk).filter(
                Chunk.document_id == document_id
            ).delete(synchronize_session=False)

            # 4. Bulk insert new chunks
            chunk_rows = [
                Chunk(
                    document_id=document_id,
                    user_id=doc.user_id,
                    page=rc.page,
                    chunk_index=rc.chunk_index,
                    content=rc.content,
                    embedding=vec,
                )
                for rc, vec in zip(raw_chunks, vectors)
            ]
            self.db.bulk_save_objects(chunk_rows)

            doc.status = "indexed"
            self.db.commit()

        except Exception:
            self.db.rollback()
            doc.status = "failed"
            self.db.commit()
            raise