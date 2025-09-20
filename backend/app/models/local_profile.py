from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Float, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
import enum

class AvailabilityStatus(str, enum.Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    UNAVAILABLE = "unavailable"

class LocalProfile(Base):
    __tablename__ = "local_profiles"
    
    # Only fields that exist in the current database
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    specialties = Column(ARRAY(String), nullable=True)  # Maps to expertise_areas
    languages = Column(ARRAY(String), nullable=True, default=['English'])
    response_time_hours = Column(Integer, default=24)
    availability_status = Column(Enum(AvailabilityStatus), default=AvailabilityStatus.AVAILABLE)
    total_conversations = Column(Integer, default=0)
    total_completed_itineraries = Column(Integer, default=0)
    average_rating = Column(Float, default=0.0)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship to User - need to add user_id as foreign key
    user_id = Column(UUID(as_uuid=True), ForeignKey('profiles.id'), nullable=True)
    user = relationship("User", back_populates="local_profile")
    
    def __repr__(self):
        return f"<LocalProfile {self.id}>"
        
    # Properties for missing fields to maintain compatibility
    @property
    def title(self):
        return "Local Guide"
        
    @property
    def description(self):
        return "Experienced local guide"
        
    @property
    def expertise_areas(self):
        return self.specialties or []
        
    @property
    def is_available(self):
        return self.availability_status == AvailabilityStatus.AVAILABLE
        
    @property
    def max_group_size(self):
        return 4
        
    @property
    def background_check_status(self):
        return 'pending'
        
    @property
    def base_hourly_rate(self):
        return None
        
    @property
    def currency(self):
        return 'USD'
        
    @property
    def services_offered(self):
        return None
        
    @property
    def home_city(self):
        return "Unknown"
        
    @property
    def home_country(self):
        return "Unknown"
        
    @property
    def travel_radius_km(self):
        return 50
        
    @property
    def total_bookings(self):
        return self.total_completed_itineraries
        
    @property
    def response_rate_percent(self):
        return 100
        
    @property
    def fun_fact(self):
        return None
        
    @property
    def why_local_guide(self):
        return None
        
    @property
    def instagram_handle(self):
        return None
        
    @property
    def website_url(self):
        return None