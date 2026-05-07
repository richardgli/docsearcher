"""
SearchService

Embeds the query once, then runs a pgvector cosine similarity search
against stored chunk embeddings.  Returns ranked passages with page numbers.
"""
from __future__ import annotations

import os
import uuid
from dataclasses import dataclass

from openai import OpenAI
from pgvector.sqlalchemy import Vector
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.chunk import Chunk, EMBEDDING_DIM

EMBED_MODEL = "text-embedding-3-small"
DEFAULT_TOP_K = 5

_openai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])


@dataclass
class SearchResult:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    page: int
    chunk_index: int
    content: str
    score: float   # cosine similarity: 1 = identical, 0 = orthogonal


def _embed_query(query: str) -> list[float]:
    resp = _openai.embeddings.create(model=EMBED_MODEL, input=[query])
    return resp.data[0].embedding


class SearchService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def search(
        self,
        query: str,
        user_id: str,
        document_id: uuid.UUID | None = None,
        top_k: int = DEFAULT_TOP_K,
    ) -> list[SearchResult]:
        """
        Semantic search over chunks.

        Args:
            query:       Natural-language query string.
            user_id:     Scopes results to this user's documents.
            document_id: Optional — restrict to a single document.
            top_k:       Number of results to return.

        Returns:
            List of SearchResult sorted by descending similarity.
        """
        query_vec = _embed_query(query)

        # pgvector cosine distance operator: <=>
        # similarity = 1 - cosine_distance
        distance = Chunk.embedding.cosine_distance(query_vec).label("distance")

        stmt = (
            select(Chunk, distance)
            .where(Chunk.user_id == user_id)
            .order_by(distance)
            .limit(top_k)
        )

        if document_id is not None:
            stmt = stmt.where(Chunk.document_id == document_id)

        rows = self.db.execute(stmt).all()

        return [
            SearchResult(
                chunk_id=chunk.id,
                document_id=chunk.document_id,
                page=chunk.page,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                score=round(1.0 - float(dist), 4),
            )
            for chunk, dist in rows
        ]