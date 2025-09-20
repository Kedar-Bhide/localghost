from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.profile import ProfileUpdate
from uuid import UUID
from sqlalchemy.sql import func

class ProfileService:
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: str) -> User:
        """Get user by ID."""
        try:
            user_uuid = UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID format"
            )
        
        result = await db.execute(select(User).where(User.id == user_uuid))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return user
    
    @staticmethod
    async def update_profile(db: AsyncSession, user_id: UUID, profile_data: ProfileUpdate) -> User:
        """Update user profile."""
        # Build update data
        update_data = {}
        if profile_data.full_name is not None:
            update_data["full_name"] = profile_data.full_name
        if profile_data.bio is not None:
            update_data["bio"] = profile_data.bio
        if profile_data.profile_picture_url is not None:
            update_data["profile_picture_url"] = profile_data.profile_picture_url
        
        # Add updated timestamp
        update_data["updated_at"] = func.now()
        
        # Update user
        await db.execute(
            update(User)
            .where(User.id == user_id)
            .values(**update_data)
        )
        await db.commit()
        
        # Return updated user
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one()
    
    @staticmethod
    async def complete_onboarding(db: AsyncSession, user_id: UUID) -> User:
        """Mark user onboarding as completed."""
        await db.execute(
            update(User)
            .where(User.id == user_id)
            .values(
                onboarding_completed=True,
                updated_at=func.now()
            )
        )
        await db.commit()
        
        # Return updated user
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one()