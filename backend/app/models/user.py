from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text, Integer
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
import enum

class UserRole(str, enum.Enum):
    TRAVELER = "traveler"
    LOCAL = "local"

class User(Base):
    __tablename__ = "profiles"
    
    # Only fields that exist in the current database
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    profile_picture_url = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    onboarding_completed = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    local_profile = relationship("LocalProfile", back_populates="user", uselist=False, lazy="select")
    locations = relationship("UserLocation", back_populates="user", lazy="select")

    # Conversation relationships
    traveler_conversations = relationship("Conversation", foreign_keys="Conversation.traveler_id", back_populates="traveler", lazy="dynamic")
    local_conversations = relationship("Conversation", foreign_keys="Conversation.local_id", back_populates="local", lazy="dynamic")
    sent_messages = relationship("Message", back_populates="sender", lazy="dynamic")

    # Itinerary relationships
    itinerary_requests = relationship("ItineraryRequest", foreign_keys="ItineraryRequest.traveler_id", back_populates="traveler", lazy="dynamic")
    assigned_itinerary_requests = relationship("ItineraryRequest", foreign_keys="ItineraryRequest.local_id", back_populates="local", lazy="dynamic")
    itinerary_proposals = relationship("ItineraryProposal", back_populates="local", lazy="dynamic")

    # Review relationships
    reviews_given = relationship("Review", foreign_keys="Review.reviewer_id", back_populates="reviewer", lazy="dynamic")
    reviews_received = relationship("Review", foreign_keys="Review.reviewee_id", back_populates="reviewee", lazy="dynamic")

    # Notification relationships
    notifications = relationship("Notification", foreign_keys="Notification.user_id", back_populates="user", lazy="dynamic")

    def __repr__(self):
        return f"<User {self.email}>"
    
    # Properties for missing fields to maintain compatibility
    @property
    def phone_number(self):
        return None
    
    @property
    def nationality(self):
        return None
        
    @property
    def languages_spoken(self):
        return ['English']
        
    @property
    def interests(self):
        return []
        
    @property
    def travel_style(self):
        return None
        
    @property
    def is_email_verified(self):
        return False
        
    @property
    def is_phone_verified(self):
        return False
        
    @property
    def emergency_contact_name(self):
        return None
        
    @property
    def emergency_contact_phone(self):
        return None
        
    @property
    def profile_visibility(self):
        return 'public'
        
    @property
    def show_age(self):
        return True
        
    @property
    def show_location(self):
        return True