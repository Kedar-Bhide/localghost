from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "24"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password for storing."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def is_token_expired(payload: dict) -> bool:
    """Check if a token payload is expired."""
    exp = payload.get("exp")
    if not exp:
        return True
    return datetime.utcnow().timestamp() > exp

def get_token_expiry_info(token: str) -> Optional[dict]:
    """Get token expiry information."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = payload.get("exp")
        if exp:
            exp_datetime = datetime.utcfromtimestamp(exp)
            current_datetime = datetime.utcnow()
            time_until_expiry = exp_datetime - current_datetime
            
            return {
                "expires_at": exp_datetime.isoformat(),
                "seconds_until_expiry": int(time_until_expiry.total_seconds()),
                "is_expired": time_until_expiry.total_seconds() <= 0
            }
        return None
    except jwt.PyJWTError:
        return None