"""
Integration tests for IndexingService and SearchService.

For running on local Docker Postgres

For small PDFs, should be around 0.00$ per run

Run with:
    cd backend && pytest tests/test_services.py -v
"""

import os
import uuid
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

from app.db.base import Base
import app.models.document # noqa: F401
import app.models.chunk    # noqa: F401
from app.models.document import Document
from app.services.indexing import IndexingService, extract_chunks, CHUNK_TOKENS
from app.services.search import SearchService

# Fixtures
@pytest.fixture(scope="session")
def engine():
    url = os.environ["DATABASE_URL"]
    eng = create_engine(url, pool_pre_ping=True)
    with eng.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(bind=eng)
    yield eng
    Base.metadata.drop_all(bind=eng)

@pytest.fixture
def db(engine):
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def sample_document(db) -> Document:
    doc = Document(
        user_id="test_user",
        filename="sample.pdf",
        storage_path="test/sample.pdf",
        status="uploaded",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

def _make_minimal_pdf() -> bytes:
    """Return a tiny but valid PDF with one page of readable text."""
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text(
        (72, 72),
        "The quick brown fox jumps over the lazy dog. " * 30,
    )
    return doc.tobytes()


# Chunking unit tests (no need for DB or OpenAI api calls yet)

def test_extract_chunks_returns_chunks():
    pdf_bytes = _make_minimal_pdf()
    chunks = extract_chunks(pdf_bytes)
    assert len(chunks) > 0
    assert all(c.page >= 1 for c in chunks)
    assert all(c.content.strip() for c in chunks)


def test_chunks_respect_token_limit():
    import tiktoken
    enc = tiktoken.encoding_for_model("text-embedding-3-small")
    pdf_bytes = _make_minimal_pdf()
    chunks = extract_chunks(pdf_bytes)
    for c in chunks:
        token_count = len(enc.encode(c.content))
        assert token_count <= CHUNK_TOKENS, (
            f"Chunk exceeded token limit: {token_count} tokens"
        )

# IndexingService integration tests

def test_index_documents_sets_status_indexed(db, sample_document):
    svc = IndexingService(db)
    pdf_bytes = _make_minimal_pdf()
    svc.index_document(sample_document.id, pdf_bytes)

    db.refresh(sample_document)
    assert sample_document.status == "indexed"

def test_reindex_replaces_chunks(db, sample_document):
    from app.models.chunk import Chunk
    svc = IndexingService(db)
    pdf = _make_minimal_pdf()

    svc.index_document(sample_document.id, pdf)
    first_count = db.query(Chunk).filter(
        Chunk.document_id == sample_document.id
    ).count()

    svc.index_document(sample_document.id, pdf)
    second_count = db.query(Chunk).filter(
        Chunk,document_id == sample_document.id
    ).count()

    assert first_count == second_count


# SearchService integration tests

def test_search_returns_results(db, sample_document):
    IndexingService(db).index_document(sample_document.id, _make_minimal_pdf())

    svc = SearchService(db)
    results = svc.search(query="fox", user_id="test-user")

    assert len(results) > 0
    assert all(0.0 <= r.score <= 1.0 for r in results)
    assert results == sorted(results, key=lambda r: r.score, reverse=True)


def test_search_scoped_to_user(db, sample_document):
    IndexingService(db).index_document(sample_document.id, _make_minimal_pdf())

    svc = SearchService(db)
    results = svc.search(query="fox", user_id="other-user")
    assert len(results) == 0


def test_search_scoped_to_document(db, sample_document):
    IndexingService(db).index_document(sample_document.id, _make_minimal_pdf())

    svc = SearchService(db)
    results = svc.search(
        query="fox",
        user_id="test-user",
        document_id=sample_document.id,
    )
    assert all(r.document_id == sample_document.id for r in results)