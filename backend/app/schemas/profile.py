from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    bio: Optional[str] = Field(None, max_length=1000)
    phone_number: Optional[str] = Field(None, max_length=20)
    nationality: Optional[str] = Field(None, max_length=100)
    languages_spoken: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    travel_style: Optional[str] = Field(None, max_length=100)
    profile_picture_url: Optional[str] = None
    profile_visibility: Optional[str] = Field("public")
    show_age: Optional[bool] = True
    show_location: Optional[bool] = True
    emergency_contact_name: Optional[str] = Field(None, max_length=255)
    emergency_contact_phone: Optional[str] = Field(None, max_length=20)
    onboarding_completed: Optional[bool] = None

    @field_validator('profile_visibility')
    def validate_visibility(cls, v):
        if v and v not in ['public', 'friends', 'private']:
            raise ValueError('Profile visibility must be public, friends, or private')
        return v

    class Config:
        from_attributes = True

class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    bio: Optional[str] = None
    phone_number: Optional[str] = None
    nationality: Optional[str] = None
    languages_spoken: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    travel_style: Optional[str] = None
    profile_picture_url: Optional[str] = None
    profile_visibility: str = "public"
    show_age: bool = True
    show_location: bool = True
    is_email_verified: bool = False
    is_phone_verified: bool = False
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    onboarding_completed: bool = False
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LocalProfileCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=255, description="Professional title")
    description: str = Field(..., min_length=50, max_length=2000, description="Service description")
    expertise_areas: List[str] = Field(..., min_items=1, max_items=10)
    languages: List[str] = Field(default=["English"], min_items=1, max_items=10)
    max_group_size: int = Field(default=4, ge=1, le=20)
    base_hourly_rate: Optional[float] = Field(None, ge=0, le=1000)
    currency: str = Field(default="USD", max_length=3)
    home_city: str = Field(..., min_length=2, max_length=255)
    home_country: str = Field(..., min_length=2, max_length=255)
    travel_radius_km: int = Field(default=50, ge=0, le=500)
    services_offered: Optional[str] = Field(None, max_length=1000)
    fun_fact: Optional[str] = Field(None, max_length=500)
    why_local_guide: Optional[str] = Field(None, max_length=1000)
    instagram_handle: Optional[str] = Field(None, max_length=100)
    website_url: Optional[str] = Field(None, max_length=500)

    @field_validator('expertise_areas')
    def validate_expertise_areas(cls, v):
        allowed = ['food', 'art', 'history', 'culture', 'nightlife', 'shopping', 
                  'nature', 'architecture', 'music', 'photography', 'adventure',
                  'family-friendly', 'luxury', 'budget', 'hidden-gems', 'local-life']
        for area in v:
            if area.lower() not in allowed:
                raise ValueError(f"Invalid expertise area: {area}")
        return v

    class Config:
        from_attributes = True

class LocalProfileUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = Field(None, min_length=50, max_length=2000)
    expertise_areas: Optional[List[str]] = Field(None, min_items=1, max_items=10)
    languages: Optional[List[str]] = Field(None, min_items=1, max_items=10)
    is_available: Optional[bool] = None
    max_group_size: Optional[int] = Field(None, ge=1, le=20)
    response_time_hours: Optional[int] = Field(None, ge=1, le=168)
    base_hourly_rate: Optional[float] = Field(None, ge=0, le=1000)
    currency: Optional[str] = Field(None, max_length=3)
    home_city: Optional[str] = Field(None, min_length=2, max_length=255)
    home_country: Optional[str] = Field(None, min_length=2, max_length=255)
    travel_radius_km: Optional[int] = Field(None, ge=0, le=500)
    services_offered: Optional[str] = Field(None, max_length=1000)
    fun_fact: Optional[str] = Field(None, max_length=500)
    why_local_guide: Optional[str] = Field(None, max_length=1000)
    instagram_handle: Optional[str] = Field(None, max_length=100)
    website_url: Optional[str] = Field(None, max_length=500)

    class Config:
        from_attributes = True

class LocalProfileResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: str
    expertise_areas: List[str]
    languages: List[str]
    is_available: bool = True
    max_group_size: int
    response_time_hours: int
    is_verified: bool = False
    background_check_status: str = "pending"
    base_hourly_rate: Optional[float] = None
    currency: str
    services_offered: Optional[str] = None
    home_city: str
    home_country: str
    travel_radius_km: int
    total_bookings: int = 0
    average_rating: float = 0.0
    response_rate_percent: int = 100
    fun_fact: Optional[str] = None
    why_local_guide: Optional[str] = None
    instagram_handle: Optional[str] = None
    website_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    user: Optional[UserProfileResponse] = None

    class Config:
        from_attributes = True

# Legacy support for existing code
ProfileUpdate = UserProfileUpdate
ProfileResponse = UserProfileResponse