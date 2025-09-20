from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.user import User, UserRole
from app.schemas.auth import UserSignup, UserLogin, UserResponse, TokenResponse
from app.core.security import get_password_hash, verify_password, create_access_token
from datetime import timedelta
import os

ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "24"))

class AuthService:
    @staticmethod
    async def create_user(db: AsyncSession, user_data: UserSignup) -> TokenResponse:
        """Create a new user and return authentication token."""
        # Check if user already exists
        result = await db.execute(select(User).where(User.email == user_data.email))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            full_name=user_data.full_name,
            role=user_data.role
        )
        
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        
        # Create access token
        access_token = create_access_token(
            data={"sub": str(db_user.id), "email": db_user.email, "role": db_user.role}
        )
        
        # Create response
        user_response = UserResponse(
            id=str(db_user.id),
            email=db_user.email,
            full_name=db_user.full_name,
            role=db_user.role,
            profile_picture_url=db_user.profile_picture_url,
            bio=db_user.bio,
            onboarding_completed=db_user.onboarding_completed,
            is_active=db_user.is_active,
            created_at=db_user.created_at.isoformat()
        )
        
        return TokenResponse(
            access_token=access_token,
            expires_in=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
            user=user_response
        )
    
    @staticmethod
    async def authenticate_user(db: AsyncSession, login_data: UserLogin) -> TokenResponse:
        """Authenticate user and return token."""
        # Find user
        result = await db.execute(select(User).where(User.email == login_data.email))
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user account"
            )
        
        # Create access token
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "role": user.role}
        )
        
        # Create response
        user_response = UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            profile_picture_url=user.profile_picture_url,
            bio=user.bio,
            onboarding_completed=user.onboarding_completed,
            is_active=user.is_active,
            created_at=user.created_at.isoformat()
        )
        
        return TokenResponse(
            access_token=access_token,
            expires_in=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
            user=user_response
        )
    
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: str) -> User:
        """Get user by ID."""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user