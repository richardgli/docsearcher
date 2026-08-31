CREATE EXTENSION IF NOT EXISTS vector;

-- users
CREATE TABLE IF NOT EXISTS users (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT,
    email       TEXT        NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login  TIMESTAMPTZ
);

-- documents
CREATE TABLE IF NOT EXISTS documents (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename         TEXT        NOT NULL,
    storage_path     TEXT        NOT NULL,
    checksum_sha256  TEXT,
    status           VARCHAR(32) NOT NULL DEFAULT 'uploaded',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_documents_user_created
    ON documents (user_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_user_checksum
    ON documents (user_id, checksum_sha256);

-- chunks
CREATE TABLE IF NOT EXISTS chunks (
    id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id   UUID    NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id       UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    page          INTEGER NOT NULL,
    chunk_index   INTEGER NOT NULL,
    content       TEXT    NOT NULL,
    bbox_x0       DOUBLE PRECISION,
    bbox_y0       DOUBLE PRECISION,
    bbox_x1       DOUBLE PRECISION,
    bbox_y1       DOUBLE PRECISION,
    embedding     vector(1536),
    tsv           TSVECTOR,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_chunk_position UNIQUE (document_id, page, chunk_index)
);

CREATE INDEX IF NOT EXISTS ix_chunks_user_document
    ON chunks (user_id, document_id);

CREATE INDEX IF NOT EXISTS ix_chunks_document_page_idx
    ON chunks (document_id, page, chunk_index);

CREATE INDEX IF NOT EXISTS ix_chunks_tsv_gin
    ON chunks USING GIN (tsv);

-- remember to uncomment once we have thousands of rows
-- CREATE INDEX ix_chunks_embedding_ivfflat
--     ON chunks USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100);

-- tsvector trigger
CREATE OR REPLACE FUNCTION chunks_tsv_update() RETURNS trigger AS $$
BEGIN
    NEW.tsv := to_tsvector('english', NEW.content);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chunks_tsv ON chunks;
CREATE TRIGGER trg_chunks_tsv
    BEFORE INSERT OR UPDATE OF content ON chunks
    FOR EACH ROW EXECUTE FUNCTION chunks_tsv_update();