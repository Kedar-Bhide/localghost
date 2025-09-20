from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class UserLocation(Base):
    __tablename__ = "user_locations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('profiles.id'), nullable=False)
    
    # Location details
    name = Column(String(255), nullable=False)  # User-friendly name like "Home", "Work", "Favorite Spot"
    address = Column(String(500), nullable=False)
    city = Column(String(255), nullable=False)
    state_province = Column(String(255), nullable=True)
    country = Column(String(255), nullable=False)
    postal_code = Column(String(20), nullable=True)
    
    # Coordinates
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Location metadata
    place_type = Column(String(100), nullable=True)  # home, work, hotel, landmark, etc.
    is_primary = Column(Boolean, default=False)  # Primary location for the user
    is_public = Column(Boolean, default=False)  # Whether this location can be seen by others
    
    # Travel-related info
    arrival_date = Column(DateTime(timezone=True), nullable=True)  # When user arrives (for travelers)
    departure_date = Column(DateTime(timezone=True), nullable=True)  # When user leaves (for travelers)
    is_temporary = Column(Boolean, default=False)  # Temporary location vs permanent
    
    # Additional context
    notes = Column(Text, nullable=True)  # Personal notes about the location
    timezone = Column(String(100), nullable=True)  # Timezone string
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship to User
    user = relationship("User", back_populates="locations")
    
    def __repr__(self):
        return f"<UserLocation {self.name} - {self.city}, {self.country}>"