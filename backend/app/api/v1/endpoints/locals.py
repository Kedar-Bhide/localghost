from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, insert, delete
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.local_profile import LocalProfile
from app.schemas.profile import LocalProfileCreate, LocalProfileUpdate, LocalProfileResponse
from typing import List
import uuid

router = APIRouter()

@router.post("/profile", response_model=LocalProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_local_profile(
    profile_data: LocalProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a local guide profile for the current user."""
    try:
        # Check if user role is 'local'
        if current_user.role != 'local':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only users with 'local' role can create local profiles"
            )
        
        # Check if user already has a local profile
        stmt = select(LocalProfile).where(LocalProfile.user_id == current_user.id)
        result = await db.execute(stmt)
        existing_profile = result.scalar_one_or_none()
        
        if existing_profile:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already has a local profile"
            )
        
        # Create new local profile
        profile_dict = profile_data.dict()
        profile_dict['user_id'] = current_user.id
        profile_dict['id'] = uuid.uuid4()
        
        # Map fields to match existing database schema and only include allowed fields
        allowed_fields = {'specialties', 'languages', 'response_time_hours', 'availability_status'}
        
        # Map expertise_areas to specialties
        if 'expertise_areas' in profile_dict:
            profile_dict['specialties'] = profile_dict.pop('expertise_areas')
        
        # Filter to only database fields
        filtered_dict = {k: v for k, v in profile_dict.items() if k in allowed_fields or k in ['user_id', 'id']}
        
        stmt = insert(LocalProfile).values(**filtered_dict).returning(LocalProfile)
        result = await db.execute(stmt)
        new_profile = result.scalar_one()
        await db.commit()
        
        # Load profile with user relationship
        stmt = select(LocalProfile).options(selectinload(LocalProfile.user)).where(LocalProfile.id == new_profile.id)
        result = await db.execute(stmt)
        profile_with_user = result.scalar_one()
        
        return LocalProfileResponse.from_orm(profile_with_user)
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating local profile: {str(e)}"
        )

@router.get("/profile/me", response_model=LocalProfileResponse)
async def get_my_local_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's local profile."""
    try:
        stmt = (
            select(LocalProfile)
            .options(selectinload(LocalProfile.user))
            .where(LocalProfile.user_id == current_user.id)
        )
        result = await db.execute(stmt)
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Local profile not found"
            )
        
        return LocalProfileResponse.from_orm(profile)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching local profile: {str(e)}"
        )

@router.put("/profile/me", response_model=LocalProfileResponse)
async def update_my_local_profile(
    profile_data: LocalProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update current user's local profile."""
    try:
        # Check if profile exists
        stmt = select(LocalProfile).where(LocalProfile.user_id == current_user.id)
        result = await db.execute(stmt)
        existing_profile = result.scalar_one_or_none()
        
        if not existing_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Local profile not found"
            )
        
        # Update profile data
        update_data = profile_data.dict(exclude_unset=True)
        if update_data:
            # Map fields to match existing database schema and filter allowed fields
            allowed_fields = {'specialties', 'languages', 'response_time_hours', 'availability_status'}
            
            # Map expertise_areas to specialties
            if 'expertise_areas' in update_data:
                update_data['specialties'] = update_data.pop('expertise_areas')
            
            # Map is_available to availability_status
            if 'is_available' in update_data:
                from app.models.local_profile import AvailabilityStatus
                update_data['availability_status'] = AvailabilityStatus.AVAILABLE if update_data.pop('is_available') else AvailabilityStatus.UNAVAILABLE
            
            # Filter to only database fields
            filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
                
            if filtered_data:
                stmt = (
                    update(LocalProfile)
                    .where(LocalProfile.user_id == current_user.id)
                    .values(**filtered_data)
                    .returning(LocalProfile)
                )
                result = await db.execute(stmt)
                updated_profile = result.scalar_one()
                await db.commit()
            else:
                # No valid fields to update
                updated_profile = existing_profile
            
            # Load profile with user relationship
            stmt = (
                select(LocalProfile)
                .options(selectinload(LocalProfile.user))
                .where(LocalProfile.id == updated_profile.id)
            )
            result = await db.execute(stmt)
            profile_with_user = result.scalar_one()
            
            return LocalProfileResponse.from_orm(profile_with_user)
        
        return LocalProfileResponse.from_orm(existing_profile)
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating local profile: {str(e)}"
        )

@router.get("/{local_id}", response_model=LocalProfileResponse)
async def get_local_profile(
    local_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific local guide's profile."""
    try:
        stmt = (
            select(LocalProfile)
            .options(selectinload(LocalProfile.user))
            .where(LocalProfile.id == local_id)
        )
        result = await db.execute(stmt)
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Local profile not found"
            )
        
        # Check if the associated user profile is public or if it's the current user
        if profile.user and profile.user.profile_visibility != 'public' and profile.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This profile is not public"
            )
        
        return LocalProfileResponse.from_orm(profile)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching local profile: {str(e)}"
        )

@router.get("/", response_model=List[LocalProfileResponse])
async def search_local_guides(
    q: str = None,
    city: str = None,
    country: str = None,
    expertise: str = None,
    available_only: bool = True,
    verified_only: bool = False,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search for local guides with optional filters."""
    try:
        # Build base query with user relationship
        stmt = (
            select(LocalProfile)
            .options(selectinload(LocalProfile.user))
            .join(User, LocalProfile.user_id == User.id)
            .where(User.is_active == True)
        )
        
        # Apply filters
        if available_only:
            # Use existing database field
            stmt = stmt.where(LocalProfile.availability_status == 'available')
            
        if verified_only:
            stmt = stmt.where(LocalProfile.is_verified == True)
            
        if expertise:
            # Search in specialties array (existing field)
            stmt = stmt.where(LocalProfile.specialties.contains([expertise]))
            
        if city:
            # We need to add city filtering - for now skip this filter
            pass
            
        if country:
            # We need to add country filtering - for now skip this filter  
            pass
            
        if q:
            # Simple text search (would need full-text search for production)
            search_term = f"%{q}%"
            stmt = stmt.where(User.full_name.ilike(search_term))
        
        # Apply pagination
        stmt = stmt.limit(limit).offset(offset)
        
        result = await db.execute(stmt)
        profiles = result.scalars().all()
        
        return [LocalProfileResponse.from_orm(profile) for profile in profiles]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while searching local guides: {str(e)}"
        )

@router.delete("/profile/me")
async def delete_my_local_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete current user's local profile."""
    try:
        stmt = delete(LocalProfile).where(LocalProfile.user_id == current_user.id)
        result = await db.execute(stmt)
        
        if result.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Local profile not found"
            )
        
        await db.commit()
        return {"message": "Local profile deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting local profile: {str(e)}"
        )