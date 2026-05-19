import os
from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from app.db.base import Base, engine
from app.models import *
from app.services.user import UserService

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

@app.get('/login')
async def login(request: Request):
    redirect_uri = request.url_for("auth")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get('/auth')
async def auth(request: Request):
    print("authorizing")
    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo")
    print(userinfo)
    with Session(engine) as session:
        ser = UserService(session)
        print("instantiating db session")

        # Return existing user if found in database; otherwise create new user
        user = ser.get_or_create(userinfo['email'])
        print("created user")
        
    request.session["user"] = {"id": str(user.id), "email": user.email}
    # Testing user retrieval/creation
    # return RedirectResponse('/')
    FRONTEND_URL = os.getenv('FRONTEND_URL')
    return RedirectResponse(f'{FRONTEND_URL}/')

@app.get('/logout')
async def logout(request: Request):
    request.session.pop("user", None)
    FRONTEND_URL = os.getenv('FRONTEND_URL')
    return RedirectResponse(f'{FRONTEND_URL}/')

@app.get('/me')
async def me(request: Request):
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user