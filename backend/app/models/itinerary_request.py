from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, Integer, Float, Enum
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
import enum

class ItineraryRequestStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    IN_REVIEW = "in_review"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class ItineraryRequest(Base):
    __tablename__ = "itinerary_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    traveler_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    local_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)  # Can be null for open requests

    # Request details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    destination_city = Column(String(255), nullable=False)
    destination_country = Column(String(255), nullable=False)

    # Trip details
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    group_size = Column(Integer, nullable=False, default=1)
    budget_min = Column(Float, nullable=True)
    budget_max = Column(Float, nullable=True)
    currency = Column(String(3), nullable=False, default='USD')

    # Preferences
    interests = Column(ARRAY(String), nullable=True)
    activity_level = Column(String(50), nullable=True)  # low, moderate, high
    accommodation_preference = Column(String(100), nullable=True)
    transportation_preference = Column(String(100), nullable=True)
    dietary_restrictions = Column(ARRAY(String), nullable=True)
    special_requirements = Column(Text, nullable=True)

    # Status and metadata
    status = Column(Enum(ItineraryRequestStatus), default=ItineraryRequestStatus.DRAFT, nullable=False)
    is_public = Column(Boolean, default=True)  # Whether other locals can see this request
    urgency_level = Column(String(50), nullable=True)  # low, medium, high

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    traveler = relationship("User", foreign_keys=[traveler_id], back_populates="itinerary_requests")
    local = relationship("User", foreign_keys=[local_id], back_populates="assigned_itinerary_requests")
    proposals = relationship("ItineraryProposal", back_populates="request", lazy="dynamic", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ItineraryRequest {self.id}: {self.title}>"

    @property
    def duration_days(self):
        """Calculate trip duration in days"""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return None

    @property
    def is_active(self):
        """Check if request is in an active state"""
        return self.status in [
            ItineraryRequestStatus.PENDING,
            ItineraryRequestStatus.IN_REVIEW,
            ItineraryRequestStatus.ACCEPTED
        ]

    @property
    def proposal_count(self):
        """Get number of proposals for this request"""
        return self.proposals.count()

    def can_be_edited_by(self, user_id):
        """Check if user can edit this request"""
        return str(self.traveler_id) == str(user_id) and self.status in [
            ItineraryRequestStatus.DRAFT,
            ItineraryRequestStatus.PENDING
        ]

    def can_receive_proposals(self):
        """Check if request can receive new proposals"""
        return self.status in [
            ItineraryRequestStatus.PENDING,
            ItineraryRequestStatus.IN_REVIEW
        ] and self.is_public