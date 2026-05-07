import os
from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

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

engine = create_engine(os.getenv("DATABASE_URL"))

app = FastAPI()
app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY"))

@app.get('/')
async def root(request: Request):
    user = request.session.get("user")
    if user:
        return { "message": f"Email: {user['email']}" }
    return { "message": "Not logged in" }

@app.get('/login')
async def login(request: Request):
    redirect_uri = request.url_for("auth")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get('/auth')
async def auth(request: Request):
    token = await oauth.google.authorize_access_token(request)
    user = token.get("userinfo")
    with Session(engine) as session:
        # Return existing user if found in database; otherwise create new user
        pass
    request.session["user"] = dict(user)
    return RedirectResponse('/')

@app.get('/logout')
async def logout(request: Request):
    request.session.pop("user", None)
    return RedirectResponse('/')