"""
UserService

Called once per OAuth login. Looks up the user by email, then creates them if they don't exist, and updates last_login.

Returns the User object so the caller can get the uuid.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from backend.app.models.user import User


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db
    
    def get_or_create(self, email: str) -> User:
        """
        Upsert a user by email. Call this immediately after verifying the Google OAuth token.
        
        Returns the User row (with its stable uuid).
        """
        user = self.db.query(User).filter(User.email == email).first()
        
        if user is None:
            user = User(email=email)
            self.db.add(user)

        user.last_login = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(user)
        
        return user