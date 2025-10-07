from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, Integer, Float, Enum
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
import enum

class ProposalStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    WITHDRAWN = "withdrawn"

class ItineraryProposal(Base):
    __tablename__ = "itinerary_proposals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("itinerary_requests.id"), nullable=False)
    local_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)

    # Proposal details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    cover_message = Column(Text, nullable=True)  # Personal message from local to traveler

    # Pricing
    total_price = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default='USD')
    price_breakdown = Column(JSON, nullable=True)  # Detailed cost breakdown
    includes = Column(Text, nullable=True)  # What's included in the price
    excludes = Column(Text, nullable=True)  # What's not included

    # Itinerary details
    daily_itinerary = Column(JSON, nullable=False)  # Structured day-by-day plan
    highlights = Column(Text, nullable=True)  # Key highlights of the itinerary
    estimated_duration_hours = Column(Integer, nullable=True)  # Total duration in hours

    # Service details
    meeting_point = Column(String(500), nullable=True)
    transportation_included = Column(Boolean, default=False)
    accommodation_included = Column(Boolean, default=False)
    meals_included = Column(Boolean, default=False)
    equipment_provided = Column(Text, nullable=True)

    # Terms and conditions
    cancellation_policy = Column(Text, nullable=True)
    terms_and_conditions = Column(Text, nullable=True)
    special_notes = Column(Text, nullable=True)

    # Status and metadata
    status = Column(Enum(ProposalStatus), default=ProposalStatus.DRAFT, nullable=False)
    is_featured = Column(Boolean, default=False)  # Whether this is a featured proposal

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    request = relationship("ItineraryRequest", back_populates="proposals")
    local = relationship("User", back_populates="itinerary_proposals")
    reviews = relationship("Review", back_populates="proposal", lazy="dynamic")

    def __repr__(self):
        return f"<ItineraryProposal {self.id}: {self.title}>"

    @property
    def is_active(self):
        """Check if proposal is in an active state"""
        return self.status in [
            ProposalStatus.SUBMITTED,
            ProposalStatus.UNDER_REVIEW,
            ProposalStatus.ACCEPTED
        ]

    @property
    def price_per_person(self):
        """Calculate price per person if group size is available"""
        if self.request and self.request.group_size and self.request.group_size > 0:
            return self.total_price / self.request.group_size
        return self.total_price

    @property
    def duration_days(self):
        """Get duration in days from the associated request"""
        return self.request.duration_days if self.request else None

    def can_be_edited_by(self, user_id):
        """Check if user can edit this proposal"""
        return str(self.local_id) == str(user_id) and self.status in [
            ProposalStatus.DRAFT,
            ProposalStatus.SUBMITTED
        ]

    def can_be_accepted(self):
        """Check if proposal can be accepted"""
        return self.status == ProposalStatus.SUBMITTED and self.request.status in [
            "pending", "in_review"
        ]

    def get_daily_summary(self):
        """Get a summary of daily activities"""
        if not self.daily_itinerary:
            return []

        summary = []
        if isinstance(self.daily_itinerary, dict):
            for day, activities in self.daily_itinerary.items():
                if isinstance(activities, list):
                    summary.append({
                        'day': day,
                        'activity_count': len(activities),
                        'activities': [activity.get('title', 'Activity') for activity in activities[:3]]
                    })
        return summary