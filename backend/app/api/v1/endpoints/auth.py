from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.schemas.auth import UserSignup, UserLogin, TokenResponse, LogoutResponse
from app.services.auth_service import AuthService, ACCESS_TOKEN_EXPIRE_HOURS

router = APIRouter()

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    user_data: UserSignup,
    db: AsyncSession = Depends(get_db)
):
    """Create a new user account."""
    try:
        return await AuthService.create_user(db, user_data)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during signup"
        )

@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return access token."""
    try:
        return await AuthService.authenticate_user(db, login_data)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login"
        )

@router.post("/logout", response_model=LogoutResponse)
async def logout():
    """Logout user (client-side token removal)."""
    return LogoutResponse(message="Successfully logged out")

@router.get("/me", response_model=dict)
async def get_current_user_info(
    current_user = Depends(get_current_active_user)
):
    """Get current user information."""
    from app.schemas.auth import UserResponse
    
    user_response = UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        profile_picture_url=current_user.profile_picture_url,
        bio=current_user.bio,
        onboarding_completed=current_user.onboarding_completed,
        is_active=current_user.is_active,
        created_at=current_user.created_at.isoformat()
    )
    
    return {"user": user_response.dict()}

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    current_user = Depends(get_current_active_user)
):
    """Refresh the current user's access token."""
    from app.core.security import create_access_token
    from app.schemas.auth import UserResponse
    
    # Generate a new access token for the current user
    access_token = create_access_token(
        data={"sub": str(current_user.id), "email": current_user.email, "role": current_user.role}
    )
    
    # Return new token with user data
    user_response = UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        profile_picture_url=current_user.profile_picture_url,
        bio=current_user.bio,
        onboarding_completed=current_user.onboarding_completed,
        is_active=current_user.is_active,
        created_at=current_user.created_at.isoformat()
    )
    
    return TokenResponse(
        access_token=access_token,
        expires_in=ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        user=user_response
    )