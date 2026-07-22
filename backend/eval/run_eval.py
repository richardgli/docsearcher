"""
Evaluation harness for docsearcher semantic search

Measures Hit@1, Hit@3, Hit@5, MRR, and latency against a fixed test set of queries with known relevant pages.

Usage:
    cd backend
    python -m eval.run_eval
    python -m eval.run_eval --no-reindex   # if indexing already done then skip
"""

from __future__ import annotations

import argparse
import json
import statistics
import time
import uuid
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

load_dotenv()

import os
from app.db.base import Base
import app.models.user     # noqa: F401
import app.models.document # noqa: F401
import app.models.chunk    # noqa: F401
from app.models.user import User
from app.models.document import Document
from app.models.chunk import Chunk
from app.services.indexing import IndexingService
from app.services.search import SearchService

EVAL_DIR = Path(__file__).parent
PDFS_DIR = EVAL_DIR / "pdfs"
TEST_CASES_PATH = EVAL_DIR / "test_cases.json"
TOP_K = 5

# DB setup

def make_session():
    url = os.environ["DATABASE_URL"]
    engine = create_engine(url, pool_pre_ping=True)
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    return Session()

# Indexing

def index_pdfs(db, test_cases: dict, eval_user: User) -> dict[str, uuid.UUID]:
    """
    Index every PDF referenced in test_cases.
    Returns a mapping of filename -> document_id.
    """
    filenames = {q["document"] for q in test_cases["queries"]}
    doc_ids: dict[str, uuid.UUID] = {}

    for filename in filenames:
        pdf_path = PDFS_DIR / filename
        if not pdf_path.exists():
            raise FileNotFoundError(
                f"PDF not found: {pdf_path}\n"
                f"Place your PDFs in backend/eval/pdfs/"
            )

        print(f"Indexing {filename}...")
        pdf_bytes = pdf_path.read_bytes()

        doc = Document(
            user_id=eval_user.id,
            filename=filename,
            storage_path=f"eval/{filename}",
            status="uploaded",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        IndexingService(db).index_document(doc.id, pdf_bytes)
        doc_ids[filename] = doc.id
        print(f"  ✓ {filename} indexed (doc_id={doc.id})")

    return doc_ids

# Metrics

def hit_at_k(relevant_pages: list[int], result_pages: list[int], k: int) -> bool:
    """Did any relevant page appear in the top-k results?"""
    return any(p in relevant_pages for p in result_pages[:k])

def reciprocal_rank(relevant_pages: list[int], result_pages: list[int]) -> float:
    """1/rank of the first relevant result, or 0 if not found."""
    for i, page in enumerate(result_pages, start=1):
        if page in relevant_pages:
            return 1.0 / i
    return 0.0

# Main

def run_eval(reindex: bool = True) -> None:
    test_cases = json.loads(TEST_CASES_PATH.read_text())
    queries = test_cases["queries"]

    if not queries:
        print("No queries found in test_cases.json")
        return

    db = make_session()

    # Create a dedicated eval user so results don't mix with real data
    eval_email = f"eval-{uuid.uuid4()}@docsearcher.internal"
    eval_user = User(email=eval_email)
    db.add(eval_user)
    db.commit()
    db.refresh(eval_user)

    # Index PDFs
    if reindex:
        doc_ids = index_pdfs(db, test_cases, eval_user)
    else:
        # Load existing documents for this eval user
        docs = db.query(Document).filter(
            Document.user_id == eval_user.id
        ).all()
        doc_ids = {d.filename: d.id for d in docs}
        if not doc_ids:
            print("No indexed documents found. Run without --no-reindex first.")
            return

    print(f"\nRunning {len(queries)} queries...\n")

    hits_at_1, hits_at_3, hits_at_5 = [], [], []
    rr_scores = []
    latencies_ms = []

    search_svc = SearchService(db)

    for i, case in enumerate(queries, start=1):
        query = case["query"]
        filename = case["document"]
        relevant_pages = case["relevant_pages"]
        doc_id = doc_ids.get(filename)

        if doc_id is None:
            print(f"  [{i}] SKIP — {filename} not indexed")
            continue

        # Time the search
        t0 = time.perf_counter()
        results = search_svc.search(
            query=query,
            user_id=eval_user.id,
            document_id=doc_id,
            top_k=TOP_K,
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000
        latencies_ms.append(elapsed_ms)

        result_pages = [r.page for r in results]

        h1 = hit_at_k(relevant_pages, result_pages, 1)
        h3 = hit_at_k(relevant_pages, result_pages, 3)
        h5 = hit_at_k(relevant_pages, result_pages, 5)
        rr = reciprocal_rank(relevant_pages, result_pages)

        hits_at_1.append(h1)
        hits_at_3.append(h3)
        hits_at_5.append(h5)
        rr_scores.append(rr)

        status = "✓" if h3 else "✗"
        print(
            f"  [{i:02d}] {status} "
            f"Hit@3={'Y' if h3 else 'N'} "
            f"RR={rr:.2f} "
            f"pages={result_pages} "
            f"expected={relevant_pages} "
            f"({elapsed_ms:.0f}ms)\n"
            f"       {query[:80]}"
        )

    # print summary !!
    n = len(hits_at_1)
    print(f"""
{'='*50}
Results over {n} queries
{'='*50}
Hit@1:          {sum(hits_at_1)/n*100:.1f}%
Hit@3:          {sum(hits_at_3)/n*100:.1f}%
Hit@5:          {sum(hits_at_5)/n*100:.1f}%
MRR:            {statistics.mean(rr_scores):.3f}

Latency
  median:       {statistics.median(latencies_ms):.0f}ms
  p95:          {sorted(latencies_ms)[int(len(latencies_ms)*0.95)]:.0f}ms
  min/max:      {min(latencies_ms):.0f}ms / {max(latencies_ms):.0f}ms
{'='*50}
""")
    
    # clean up eval data
    db.query(Document).filter(Document.user_id == eval_user.id).delete()
    db.query(User).filter(User.id == eval_user.id).delete()
    db.commit()
    db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--no-reindex",
        action="store_true",
        help="Skip indexing and use existing documents",
    )
    args = parser.parse_args()
    run_eval(reindex=not args.no_reindex)