from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.profile import ProfileUpdate, ProfileResponse
from app.services.profile_service import ProfileService

router = APIRouter()

@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's profile."""
    return ProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        profile_picture_url=current_user.profile_picture_url,
        bio=current_user.bio,
        onboarding_completed=current_user.onboarding_completed,
        is_active=current_user.is_active,
        created_at=current_user.created_at.isoformat(),
        updated_at=current_user.updated_at.isoformat() if current_user.updated_at else None
    )

@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's profile."""
    updated_user = await ProfileService.update_profile(
        db, current_user.id, profile_data
    )
    
    return ProfileResponse(
        id=str(updated_user.id),
        email=updated_user.email,
        full_name=updated_user.full_name,
        role=updated_user.role,
        profile_picture_url=updated_user.profile_picture_url,
        bio=updated_user.bio,
        onboarding_completed=updated_user.onboarding_completed,
        is_active=updated_user.is_active,
        created_at=updated_user.created_at.isoformat(),
        updated_at=updated_user.updated_at.isoformat() if updated_user.updated_at else None
    )

@router.post("/complete-onboarding")
async def complete_onboarding(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark user's onboarding as completed."""
    await ProfileService.complete_onboarding(db, current_user.id)
    return {"message": "Onboarding completed successfully"}

@router.get("/{user_id}", response_model=ProfileResponse)
async def get_user_profile(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get another user's public profile."""
    user = await ProfileService.get_user_by_id(db, user_id)
    
    # Return limited public profile info
    return ProfileResponse(
        id=str(user.id),
        email="",  # Hide email for privacy
        full_name=user.full_name,
        role=user.role,
        profile_picture_url=user.profile_picture_url,
        bio=user.bio,
        onboarding_completed=user.onboarding_completed,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
        updated_at=None  # Hide update timestamp for privacy
    )