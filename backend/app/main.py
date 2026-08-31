import os
import uuid
from typing import Any

from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client

from backend.app.db.base import Base, engine
from backend.app.models.document import Document
from backend.app.models import *
from backend.app.services.documents import (
    get_document_by_id,
    list_documents_for_user,
)
from backend.app.services.search import SearchService
from backend.app.services.user import UserService
from backend.app.utils.route_helpers import (
    file_exists_in_storage,
    get_or_create_document,
    delete_document,
    get_guest_document,
    migrate_guest_document_to_user,
    write_guest_document,
    search_guest_document,
)

load_dotenv()

oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile",
    },
)

Base.metadata.create_all(engine)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY"))

supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
GUEST_DOCUMENTS: dict[str, dict[str, Any]] = {}


@app.get('/')
async def root(request: Request):
    user = request.session.get("user")
    if user:
        return { user['email'] }
    return { "message": "Not logged in" }

@app.get('/api/login')
async def login(request: Request):
    redirect_uri = request.url_for("auth")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get('/api/auth')
async def auth(request: Request):
    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo")

    with Session(engine) as session:
        ser = UserService(session)

        # Return existing user if found in database; otherwise create new user
        user = ser.get_or_create(userinfo['email'], userinfo.get('name'))
        request.session["user"] = {"id": str(user.id), "email": user.email, "name": user.name}

        migrate_guest_document_to_user(
            GUEST_DOCUMENTS,
            request,
            supabase,
            user.id,
            session,
        )

    FRONTEND_URL = os.getenv('FRONTEND_URL')
    return RedirectResponse(f'{FRONTEND_URL}/')

@app.get('/api/logout')
async def logout(request: Request):
    request.session.pop("user", None)
    FRONTEND_URL = os.getenv('FRONTEND_URL')
    return RedirectResponse(f'{FRONTEND_URL}/')

@app.get('/api/me')
async def me(request: Request):
    user = request.session.get("user")
    if user:
        return user

@app.get('/api/documents')
async def documents(request: Request):
    user = request.session.get("user")
    if not user:
        return {"documents": []}

    user_id = uuid.UUID(user["id"])

    with Session(engine) as session:
        docs = list_documents_for_user(session, user_id)
        return {
            "documents": [
                {
                    "id": str(doc.id),
                    "filename": doc.filename,
                    "storage_path": doc.storage_path,
                    "status": doc.status,
                    "created_at": doc.created_at.isoformat(),
                }
                for doc in docs
            ]
        }

@app.get('/api/documents/{id}')
async def user_documents(request: Request, id: uuid.UUID):
    user = request.session.get("user")
    if user:
        with Session(engine) as session:
            doc = get_document_by_id(session, id, user["id"])
            if doc is None:
                raise HTTPException(status_code=404, detail="Document not found")

            BUCKET_NAME = os.getenv("BUCKET_NAME")
            if not file_exists_in_storage(supabase, BUCKET_NAME, doc.storage_path):
                raise HTTPException(status_code=404, detail="File missing from storage")

            pdf_bytes = supabase.storage.from_(BUCKET_NAME).download(path=doc.storage_path)
            return Response(content=pdf_bytes, media_type="application/pdf")

    guest_doc = get_guest_document(GUEST_DOCUMENTS, request, id)
    if guest_doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return Response(content=guest_doc["bytes"], media_type="application/pdf")

@app.delete('/api/documents/{id}')
async def delete_user_document(request: Request, id: uuid.UUID):
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    with Session(engine) as session:
        try:
            delete_document(supabase, session, uuid.UUID(user["id"]), id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

        return {"deleted": True, "document_id": str(id)}

@app.post('/api/upload-pdf')
async def upload_pdf(
    request: Request,
    file: UploadFile = File(...),
):
    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    user = request.session.get("user")
    if not user:
        guest_doc = write_guest_document(GUEST_DOCUMENTS, request, file, pdf_bytes)
        return {
            "document_id": guest_doc["id"],
            "filename": guest_doc["filename"],
            "status": "guest",
        }

    user_id = uuid.UUID(user["id"])

    with Session(engine) as session:
        doc = get_or_create_document(supabase, session, user_id, file, pdf_bytes)

        return {
            "document_id": str(doc.id),
            "filename": doc.filename,
            "status": doc.status,
        }

@app.post('/api/search-pdf')
async def search_pdf(
    request: Request,
    file: UploadFile | None = File(None),
    document_id: str | None = Form(None),
    query: str = Form(...),
    top_k: int = Form(5),
):
    user = request.session.get("user")
    if user:
        user_id = uuid.UUID(user["id"])

        with Session(engine) as session:
            if document_id:
                try:
                    document_uuid = uuid.UUID(document_id)
                except ValueError as exc:
                    raise HTTPException(status_code=400, detail="Invalid document_id") from exc

                doc = session.get(Document, document_uuid)
                if doc is None or doc.user_id != user_id:
                    raise HTTPException(status_code=404, detail="Document not found")
            elif file is not None:
                pdf_bytes = await file.read()
                if not pdf_bytes:
                    raise HTTPException(status_code=400, detail="Uploaded file is empty")
                doc = get_or_create_document(supabase, session, user_id, file, pdf_bytes)
            else:
                raise HTTPException(status_code=400, detail="Provide a document_id or upload a PDF")

            results = SearchService(session).search(
                query=query,
                user_id=user_id,
                document_id=doc.id,
                top_k=top_k,
            )

            return {
                "document_id": str(doc.id),
                "filename": doc.filename,
                "query": query,
                "passages": [
                    {
                        "chunk_id": str(result.chunk_id),
                        "page": result.page,
                        "chunk_index": result.chunk_index,
                        "score": result.score,
                        "content": result.content,
                        "bbox": list(result.bbox) if result.bbox else None,
                    }
                    for result in results
                ],
            }

    if document_id:
        guest_doc = get_guest_document(GUEST_DOCUMENTS, request, document_id)
        if guest_doc is None:
            raise HTTPException(status_code=404, detail="Document not found")
        pdf_bytes = guest_doc["bytes"]
        filename = guest_doc["filename"]
    elif file is not None:
        pdf_bytes = await file.read()
        if not pdf_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        guest_doc = write_guest_document(GUEST_DOCUMENTS, request, file, pdf_bytes)
        filename = guest_doc["filename"]
    else:
        raise HTTPException(status_code=400, detail="Provide a document_id or upload a PDF")

    passages = search_guest_document(pdf_bytes, query, top_k)
    return {
        "document_id": str(guest_doc["id"]),
        "filename": filename,
        "query": query,
        "passages": passages,
    }
