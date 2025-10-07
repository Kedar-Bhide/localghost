from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class ReviewCreate(BaseModel):
    proposal_id: UUID
    rating: int = Field(..., ge=1, le=5, description="Overall rating from 1-5")
    title: str = Field(..., min_length=5, max_length=200)
    content: str = Field(..., min_length=20, max_length=2000)

    # Optional aspect ratings
    communication_rating: Optional[int] = Field(None, ge=1, le=5)
    knowledge_rating: Optional[int] = Field(None, ge=1, le=5)
    reliability_rating: Optional[int] = Field(None, ge=1, le=5)
    value_rating: Optional[int] = Field(None, ge=1, le=5)

    is_public: bool = True

class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    content: Optional[str] = Field(None, min_length=20, max_length=2000)

    communication_rating: Optional[int] = Field(None, ge=1, le=5)
    knowledge_rating: Optional[int] = Field(None, ge=1, le=5)
    reliability_rating: Optional[int] = Field(None, ge=1, le=5)
    value_rating: Optional[int] = Field(None, ge=1, le=5)

    is_public: Optional[bool] = None

class ReviewResponse(BaseModel):
    response_content: str = Field(..., min_length=10, max_length=1000)

class ReviewBase(BaseModel):
    id: UUID
    proposal_id: UUID
    reviewer_id: UUID
    reviewee_id: UUID

    rating: int
    title: str
    content: str

    communication_rating: Optional[int]
    knowledge_rating: Optional[int]
    reliability_rating: Optional[int]
    value_rating: Optional[int]

    is_verified: bool
    is_public: bool
    response_content: Optional[str]
    response_date: Optional[datetime]

    created_at: datetime
    updated_at: datetime

    # Reviewer info
    reviewer_name: str
    reviewer_avatar: Optional[str]

    # Reviewee info
    reviewee_name: str
    reviewee_avatar: Optional[str]

    # Proposal info
    proposal_title: str

    class Config:
        from_attributes = True

class ReviewListResponse(BaseModel):
    reviews: List[ReviewBase]
    total: int
    has_more: bool

class ReviewStatsResponse(BaseModel):
    total_reviews: int
    average_rating: float
    rating_distribution: dict  # {1: count, 2: count, ...}

    # Aspect averages
    average_communication: Optional[float]
    average_knowledge: Optional[float]
    average_reliability: Optional[float]
    average_value: Optional[float]

    # Recent reviews
    recent_reviews: List[ReviewBase]

class ReviewEligibilityResponse(BaseModel):
    can_review: bool
    reason: Optional[str] = None
    existing_review_id: Optional[UUID] = None