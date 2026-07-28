import os
import uuid
from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.app.db.base import Base, engine
from backend.app.models.document import Document
from backend.app.models import *
from backend.app.services.indexing import IndexingService
from backend.app.services.search import SearchService
from backend.app.services.user import UserService

load_dotenv()

oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile",
        "prompt": "consent",
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
        user = ser.get_or_create(userinfo['email'])
        
    request.session["user"] = {"id": str(user.id), "email": user.email}
    # Testing user retrieval/creation
    # return RedirectResponse('/')
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
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@app.post('/api/search-pdf')
async def search_pdf(
    request: Request,
    file: UploadFile = File(...),
    query: str = Form(...),
    top_k: int = Form(5),
):
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    user_id = uuid.UUID(user["id"])

    with Session(engine) as session:
        doc = Document(
            user_id=user_id,
            filename=file.filename or "uploaded.pdf",
            storage_path=f"uploads/{user_id}/{file.filename or 'uploaded.pdf'}",
            status="uploaded",
        )
        session.add(doc)
        session.commit()
        session.refresh(doc)

        IndexingService(session).index_document(doc.id, pdf_bytes)
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
                }
                for result in results
            ],
        }