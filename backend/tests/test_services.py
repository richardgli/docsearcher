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
import app.models.user     # noqa: F401
from app.models.document import Document
from app.models.user import User
from app.models.chunk import Chunk
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
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def sample_user_and_doc(db):
    user = User(email=f"test-{uuid.uuid4()}@example.com")
    db.add(user)
    db.flush()  # get user.id but without committing

    doc = Document(
        user_id=user.id,
        filename="sample.pdf",
        storage_path="test/sample.pdf",
        status="uploaded",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return user, doc

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

def test_index_documents_sets_status_indexed(db, sample_user_and_doc):
    user, doc = sample_user_and_doc
    IndexingService(db).index_document(doc.id, _make_minimal_pdf())
    db.refresh(doc)
    assert doc.status == "indexed"

def test_index_document_stores_chunks(db, sample_user_and_doc):
    user, doc = sample_user_and_doc
    IndexingService(db).index_document(doc.id, _make_minimal_pdf())
    chunks = db.query(Chunk).filter(Chunk.document_id == doc.id).all()
    assert len(chunks) > 0
    assert all(c.embedding is not None for c in chunks)
    assert all(len(c.embedding) == 1536 for c in chunks)

def test_reindex_replaces_chunks(db, sample_user_and_doc):
    user, doc = sample_user_and_doc
    pdf = _make_minimal_pdf()
    IndexingService(db).index_document(doc.id, pdf)
    first_count = db.query(Chunk).filter(Chunk.document_id == doc.id).count()
    IndexingService(db).index_document(doc.id, pdf)
    second_count = db.query(Chunk).filter(Chunk.document_id == doc.id).count()
    assert first_count == second_count

# SearchService integration tests

def test_search_returns_results(db, sample_user_and_doc):
    user, doc = sample_user_and_doc
    IndexingService(db).index_document(doc.id, _make_minimal_pdf())
    results = SearchService(db).search(query="fox", user_id=user.id)
    assert len(results) > 0
    assert all(0.0 <= r.score <= 1.0 for r in results)
    assert results == sorted(results, key=lambda r: r.score, reverse=True)


def test_search_scoped_to_user(db, sample_user_and_doc):
    user, doc = sample_user_and_doc
    IndexingService(db).index_document(doc.id, _make_minimal_pdf())
    results = SearchService(db).search(query="fox", user_id=uuid.uuid4())
    assert len(results) == 0


def test_search_scoped_to_document(db, sample_user_and_doc):
    user, doc = sample_user_and_doc
    IndexingService(db).index_document(doc.id, _make_minimal_pdf())
    results = SearchService(db).search(
        query="fox",
        user_id=user.id,
        document_id=doc.id,
    )
    assert all(r.document_id == doc.id for r in results)