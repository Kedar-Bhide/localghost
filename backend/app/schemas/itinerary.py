from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from uuid import UUID
from app.models.itinerary_request import ItineraryRequestStatus
from app.models.itinerary_proposal import ProposalStatus

# Itinerary Request Schemas
class ItineraryRequestCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=20, max_length=2000)
    destination_city: str = Field(..., min_length=2, max_length=255)
    destination_country: str = Field(..., min_length=2, max_length=255)
    start_date: datetime
    end_date: datetime
    group_size: int = Field(1, ge=1, le=20)
    budget_min: Optional[float] = Field(None, ge=0)
    budget_max: Optional[float] = Field(None, ge=0)
    currency: str = Field("USD", min_length=3, max_length=3)
    interests: Optional[List[str]] = []
    activity_level: Optional[str] = Field(None, pattern="^(low|moderate|high)$")
    accommodation_preference: Optional[str] = Field(None, max_length=100)
    transportation_preference: Optional[str] = Field(None, max_length=100)
    dietary_restrictions: Optional[List[str]] = []
    special_requirements: Optional[str] = Field(None, max_length=1000)
    is_public: bool = True
    urgency_level: Optional[str] = Field(None, pattern="^(low|medium|high)$")

    @validator('end_date')
    def end_date_after_start_date(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('End date must be after start date')
        return v

    @validator('budget_max')
    def budget_max_greater_than_min(cls, v, values):
        if v is not None and 'budget_min' in values and values['budget_min'] is not None:
            if v <= values['budget_min']:
                raise ValueError('Maximum budget must be greater than minimum budget')
        return v

class ItineraryRequestUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = Field(None, min_length=20, max_length=2000)
    destination_city: Optional[str] = Field(None, min_length=2, max_length=255)
    destination_country: Optional[str] = Field(None, min_length=2, max_length=255)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    group_size: Optional[int] = Field(None, ge=1, le=20)
    budget_min: Optional[float] = Field(None, ge=0)
    budget_max: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    interests: Optional[List[str]] = None
    activity_level: Optional[str] = Field(None, regex="^(low|moderate|high)$")
    accommodation_preference: Optional[str] = Field(None, max_length=100)
    transportation_preference: Optional[str] = Field(None, max_length=100)
    dietary_restrictions: Optional[List[str]] = None
    special_requirements: Optional[str] = Field(None, max_length=1000)
    is_public: Optional[bool] = None
    urgency_level: Optional[str] = Field(None, regex="^(low|medium|high)$")

class ItineraryRequestResponse(BaseModel):
    id: UUID
    traveler_id: UUID
    local_id: Optional[UUID]
    title: str
    description: str
    destination_city: str
    destination_country: str
    start_date: datetime
    end_date: datetime
    group_size: int
    budget_min: Optional[float]
    budget_max: Optional[float]
    currency: str
    interests: Optional[List[str]]
    activity_level: Optional[str]
    accommodation_preference: Optional[str]
    transportation_preference: Optional[str]
    dietary_restrictions: Optional[List[str]]
    special_requirements: Optional[str]
    status: ItineraryRequestStatus
    is_public: bool
    urgency_level: Optional[str]
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]
    completed_at: Optional[datetime]

    # Computed fields
    duration_days: Optional[int]
    proposal_count: int = 0

    # Traveler information
    traveler_name: str
    traveler_avatar: Optional[str]

    # Local information (if assigned)
    local_name: Optional[str]
    local_avatar: Optional[str]

    # Local guide specific fields
    can_propose: Optional[bool] = None
    my_proposal_id: Optional[str] = None
    my_proposal_status: Optional[str] = None

    class Config:
        from_attributes = True

# Itinerary Proposal Schemas
class DailyActivity(BaseModel):
    time: str = Field(..., description="Time of activity (e.g., '09:00')")
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=500)
    location: Optional[str] = Field(None, max_length=200)
    duration_minutes: Optional[int] = Field(None, ge=15, le=480)
    cost_per_person: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = Field(None, max_length=300)

class DailyItinerary(BaseModel):
    day: int = Field(..., ge=1, le=30)
    date: Optional[date] = None
    title: str = Field(..., min_length=3, max_length=100)
    overview: Optional[str] = Field(None, max_length=300)
    activities: List[DailyActivity] = Field(..., min_items=1)

class PriceBreakdown(BaseModel):
    guides_fee: Optional[float] = Field(None, ge=0)
    transportation: Optional[float] = Field(None, ge=0)
    accommodation: Optional[float] = Field(None, ge=0)
    meals: Optional[float] = Field(None, ge=0)
    activities: Optional[float] = Field(None, ge=0)
    equipment: Optional[float] = Field(None, ge=0)
    other: Optional[float] = Field(None, ge=0)

class ItineraryProposalCreate(BaseModel):
    request_id: UUID
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=20, max_length=2000)
    cover_message: Optional[str] = Field(None, max_length=1000)
    total_price: float = Field(..., ge=0)
    currency: str = Field("USD", min_length=3, max_length=3)
    price_breakdown: Optional[Dict[str, float]] = None
    includes: Optional[str] = Field(None, max_length=1000)
    excludes: Optional[str] = Field(None, max_length=1000)
    daily_itinerary: List[DailyItinerary] = Field(..., min_items=1)
    highlights: Optional[str] = Field(None, max_length=1000)
    estimated_duration_hours: Optional[int] = Field(None, ge=1, le=240)
    meeting_point: Optional[str] = Field(None, max_length=500)
    transportation_included: bool = False
    accommodation_included: bool = False
    meals_included: bool = False
    equipment_provided: Optional[str] = Field(None, max_length=500)
    cancellation_policy: Optional[str] = Field(None, max_length=1000)
    terms_and_conditions: Optional[str] = Field(None, max_length=2000)
    special_notes: Optional[str] = Field(None, max_length=1000)

class ItineraryProposalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = Field(None, min_length=20, max_length=2000)
    cover_message: Optional[str] = Field(None, max_length=1000)
    total_price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    price_breakdown: Optional[Dict[str, float]] = None
    includes: Optional[str] = Field(None, max_length=1000)
    excludes: Optional[str] = Field(None, max_length=1000)
    daily_itinerary: Optional[List[DailyItinerary]] = Field(None, min_items=1)
    highlights: Optional[str] = Field(None, max_length=1000)
    estimated_duration_hours: Optional[int] = Field(None, ge=1, le=240)
    meeting_point: Optional[str] = Field(None, max_length=500)
    transportation_included: Optional[bool] = None
    accommodation_included: Optional[bool] = None
    meals_included: Optional[bool] = None
    equipment_provided: Optional[str] = Field(None, max_length=500)
    cancellation_policy: Optional[str] = Field(None, max_length=1000)
    terms_and_conditions: Optional[str] = Field(None, max_length=2000)
    special_notes: Optional[str] = Field(None, max_length=1000)

class ItineraryProposalResponse(BaseModel):
    id: UUID
    request_id: UUID
    local_id: UUID
    title: str
    description: str
    cover_message: Optional[str]
    total_price: float
    currency: str
    price_breakdown: Optional[Dict[str, Any]]
    includes: Optional[str]
    excludes: Optional[str]
    daily_itinerary: Dict[str, Any]
    highlights: Optional[str]
    estimated_duration_hours: Optional[int]
    meeting_point: Optional[str]
    transportation_included: bool
    accommodation_included: bool
    meals_included: bool
    equipment_provided: Optional[str]
    cancellation_policy: Optional[str]
    terms_and_conditions: Optional[str]
    special_notes: Optional[str]
    status: ProposalStatus
    is_featured: bool
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]
    reviewed_at: Optional[datetime]
    accepted_at: Optional[datetime]

    # Computed fields
    price_per_person: Optional[float]
    duration_days: Optional[int]

    # Local information
    local_name: str
    local_avatar: Optional[str]
    local_rating: Optional[float]
    local_verified: bool

    class Config:
        from_attributes = True

# List responses with pagination
class ItineraryRequestListResponse(BaseModel):
    requests: List[ItineraryRequestResponse]
    total: int
    has_more: bool

class ItineraryProposalListResponse(BaseModel):
    proposals: List[ItineraryProposalResponse]
    total: int
    has_more: bool

# Status update schemas
class ItineraryRequestStatusUpdate(BaseModel):
    status: ItineraryRequestStatus

class ItineraryProposalStatusUpdate(BaseModel):
    status: ProposalStatus

# Search and filter schemas
class ItineraryRequestFilters(BaseModel):
    destination_city: Optional[str] = None
    destination_country: Optional[str] = None
    start_date_from: Optional[date] = None
    start_date_to: Optional[date] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    group_size_min: Optional[int] = None
    group_size_max: Optional[int] = None
    interests: Optional[List[str]] = None
    activity_level: Optional[str] = None
    status: Optional[List[ItineraryRequestStatus]] = None
    urgency_level: Optional[str] = None