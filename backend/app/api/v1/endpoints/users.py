from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.profile import UserProfileUpdate, UserProfileResponse
from typing import List

router = APIRouter()

@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's profile information."""
    return UserProfileResponse.from_orm(current_user)

@router.put("/me", response_model=UserProfileResponse)
async def update_my_profile(
    profile_data: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update current user's profile information."""
    try:
        # Update user data - only update fields that exist in the database
        update_data = profile_data.dict(exclude_unset=True)
        
        # Filter to only include database fields
        allowed_fields = {'full_name', 'bio', 'profile_picture_url', 'onboarding_completed'}
        filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
        
        if filtered_data:
            stmt = (
                update(User)
                .where(User.id == current_user.id)
                .values(**filtered_data)
                .returning(User)
            )
            result = await db.execute(stmt)
            updated_user = result.scalar_one()
            await db.commit()
            
            return UserProfileResponse.from_orm(updated_user)
        
        return UserProfileResponse.from_orm(current_user)
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating profile: {str(e)}"
        )

@router.get("/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get another user's public profile information."""
    try:
        stmt = select(User).where(User.id == user_id, User.is_active == True)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if profile is public or if it's the current user's own profile
        if user.profile_visibility != 'public' and user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This profile is not public"
            )
        
        return UserProfileResponse.from_orm(user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching user profile: {str(e)}"
        )

@router.get("/", response_model=List[UserProfileResponse])
async def search_users(
    q: str = None,
    role: str = None,
    city: str = None,
    country: str = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search for users with optional filters."""
    try:
        # Build base query
        stmt = select(User).where(User.is_active == True, User.profile_visibility == 'public')
        
        # Apply filters
        if role:
            stmt = stmt.where(User.role == role)
        
        if q:
            # Simple text search on name and bio
            search_term = f"%{q}%"
            stmt = stmt.where(
                (User.full_name.ilike(search_term)) |
                (User.bio.ilike(search_term))
            )
        
        # Apply pagination
        stmt = stmt.limit(limit).offset(offset)
        
        result = await db.execute(stmt)
        users = result.scalars().all()
        
        return [UserProfileResponse.from_orm(user) for user in users]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while searching users: {str(e)}"
        )

@router.delete("/me")
async def deactivate_my_account(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Deactivate current user's account."""
    try:
        stmt = (
            update(User)
            .where(User.id == current_user.id)
            .values(is_active=False)
        )
        await db.execute(stmt)
        await db.commit()
        
        return {"message": "Account deactivated successfully"}
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deactivating account: {str(e)}"
        )