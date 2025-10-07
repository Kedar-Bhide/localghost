from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime
from enum import Enum

class NotificationType(str, Enum):
    # Proposal related
    PROPOSAL_RECEIVED = "proposal_received"
    PROPOSAL_ACCEPTED = "proposal_accepted"
    PROPOSAL_DECLINED = "proposal_declined"
    PROPOSAL_UPDATED = "proposal_updated"

    # Request related
    REQUEST_ASSIGNED = "request_assigned"
    REQUEST_COMPLETED = "request_completed"
    REQUEST_CANCELLED = "request_cancelled"

    # Message related
    NEW_MESSAGE = "new_message"

    # Review related
    REVIEW_RECEIVED = "review_received"
    REVIEW_RESPONSE = "review_response"

    # General system
    SYSTEM_ANNOUNCEMENT = "system_announcement"
    ACCOUNT_UPDATE = "account_update"

class NotificationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Target user
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Notification content
    type = Column(String(50), nullable=False)  # NotificationType
    priority = Column(String(20), default=NotificationPriority.MEDIUM)  # NotificationPriority
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)

    # Optional action data
    action_url = Column(String(500), nullable=True)  # URL to navigate to
    action_label = Column(String(100), nullable=True)  # Button text

    # Metadata and context
    extra_data = Column(JSON, nullable=True)  # Additional data (proposal_id, request_id, etc.)

    # Related entities (for easy querying)
    related_proposal_id = Column(UUID(as_uuid=True), ForeignKey("itinerary_proposals.id", ondelete="CASCADE"), nullable=True)
    related_request_id = Column(UUID(as_uuid=True), ForeignKey("itinerary_requests.id", ondelete="CASCADE"), nullable=True)
    related_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)  # User who triggered the notification

    # Status
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime, nullable=True)

    # Delivery status
    is_sent = Column(Boolean, default=False, nullable=False)
    sent_at = Column(DateTime, nullable=True)
    delivery_method = Column(String(50), nullable=True)  # 'in_app', 'email', 'push', etc.

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)  # Optional expiration

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="notifications")
    related_user = relationship("User", foreign_keys=[related_user_id])
    related_proposal = relationship("ItineraryProposal", foreign_keys=[related_proposal_id])
    related_request = relationship("ItineraryRequest", foreign_keys=[related_request_id])

    def __repr__(self):
        return f"<Notification(id={self.id}, type={self.type}, user={self.user_id})>"

    @property
    def is_expired(self):
        """Check if notification has expired"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at

    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.utcnow()

    def mark_as_sent(self, delivery_method: str = "in_app"):
        """Mark notification as sent"""
        if not self.is_sent:
            self.is_sent = True
            self.sent_at = datetime.utcnow()
            self.delivery_method = delivery_method