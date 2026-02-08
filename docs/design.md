# DocuLens — Engineering Design Document

**Semantic Document Search Engine**

---

## Problem Definition

Users who work with large collections of PDF documents (students, researchers, professionals) struggle to locate specific information within their files. Keyword search (Ctrl+F) fails when the user remembers the concept but not the exact terminology.

### Proposed Solution

A web application that enables semantic search over uploaded PDF documents; finding passages by meaning, not exact keyword matching. The app combines a document processing pipeline (text extraction, chunking, vector embedding) with an integrated PDF viewer, allowing users to search naturally and navigate directly to relevant passages.

---

## Scope

### In Scope
- Web-based PDF upload and management
- Text extraction and semantic search using vector embeddings
- Integrated in-browser PDF viewer with navigation to search results
- Containerized development and public deployment
- Optional User authentication

### Out of Scope
- Non-PDF formats, scanned/handwritten documents (OCR)
- Mobile app, offline support

---

## Assumptions
- Documents are text-based PDFs (not scanned images)
- Documents are in English only

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Upload PDF files via drag-and-drop or file picker | Must Have |
| FR-02 | Extract text from PDFs with page number metadata | Must Have |
| FR-03 | Chunk text into overlapping segments (~500 chars) | Must Have |
| FR-04 | Generate vector embeddings for each chunk via Gemini API | Must Have |
| FR-05 | Accept natural language search queries | Must Have |
| FR-06 | Return results ranked by cosine similarity with scores | Must Have |
| FR-07 | Display source document, page number, and text preview per result | Must Have |
| FR-08 | Render PDFs in an integrated browser-based viewer | Must Have |
| FR-09 | Click a search result → viewer navigates to the correct page | Must Have |
| FR-10 | Search across all documents or within a single document | Must Have |
| FR-11 | Delete documents and associated data | Must Have |
| FR-12 | Expandable result cards showing more context | Should Have |
| FR-13 | Highlight matching passage in the PDF viewer | Should Have |
| FR-14 | Keyword search (full-text) for comparison | Could Have |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Search response time | < 500ms for ≤1,000 chunks |
| NFR-02 | Document processing time | < 60s for a 50-page PDF |
| NFR-03 | Search accuracy | Top-3 results contain relevant passage ≥80% of the time |
| NFR-04 | File size limit | 50MB per upload |
| NFR-05 | Local startup | `docker-compose up` → operational in < 60s |
| NFR-06 | Test coverage | ≥70% backend, ≥60% frontend |

---

## Constraints

### Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| English only | Limited user reach, only English users | bruh |

---

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| PDF Viewer | react-pdf (pdf.js wrapper) |
| Backend | Python + FastAPI |
| PDF Extraction | PyMuPDF (fitz) |
| Embeddings | Google Gemini Embedding API |
| Database | PostgreSQL + pgvector |
| Background Tasks | FastAPI background tasks (asyncio) |
| Containers | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Deployment | Railway or Render |

---

## Data Model

```
┌─────────────────────────────┐       ┌─────────────────────────────┐
│         documents            │       │          chunks              │
├─────────────────────────────┤       ├─────────────────────────────┤
│ id          UUID (PK)       │──1:N─▶│ id          UUID (PK)       │
│ filename    VARCHAR(255)    │       │ document_id UUID (FK)       │
│ file_path   VARCHAR(500)    │       │ content     TEXT             │
│ file_size   BIGINT          │       │ page_number INTEGER         │
│ page_count  INTEGER         │       │ chunk_index INTEGER         │
│ status      VARCHAR(20)     │       │ start_char  INTEGER         │
│ error_msg   TEXT            │       │ bbox_x/y/w/h FLOAT         │
│ uploaded_at TIMESTAMP       │       │ embedding   VECTOR(768)     │
│ processed_at TIMESTAMP      │       │ created_at  TIMESTAMP       │
└─────────────────────────────┘       └─────────────────────────────┘

Status values: 'processing' | 'ready' | 'error'
Indexes: IVFFlat on chunks.embedding, B-tree on chunks.document_id
```

---

## Testing Strategy

- **Unit tests:** Chunking logic, embedding service, search ranking, React components
- **Integration tests:** API endpoints with test database
- **E2E tests:** Upload → search → navigate flow (Playwright)
- **Search quality evaluation:** 20 query-document pairs; target ≥80% top-3 accuracy

---

## 13. Success Criteria

| Criterion |
|-----------|
| User can upload a PDF and it appears in the library |
| Documents process within 60 seconds (50-page PDF) |
| Natural language search returns ranked semantic results |
| Results show similarity score, source, page number, preview |
| Clicking a result navigates viewer to the correct page |
| Search completes in < 500ms for ≤1,000 chunks |
| Top-3 accuracy ≥80% on evaluation set |
| App is deployed at a public URL |
| `docker-compose up` runs the full stack |
| CI runs linting + tests on every push |

---

## Future Work

- OCR (Optical Character Recognition) for scanned PDFs
- Multi-format support (Word, PowerPoint)
- RAG chat mode (synthesized answers from retrieved passages)
- Keyword vs. semantic search comparison mode
- Advanced semantic chunking (by document structure/headings)