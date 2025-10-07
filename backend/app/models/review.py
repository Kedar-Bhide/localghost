from sqlalchemy import Column, String, Integer, Text, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign Keys
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reviewee_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("itinerary_proposals.id", ondelete="CASCADE"), nullable=False)

    # Review Content
    rating = Column(Integer, nullable=False)  # 1-5 stars
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)

    # Optional aspects
    communication_rating = Column(Integer, nullable=True)  # 1-5
    knowledge_rating = Column(Integer, nullable=True)      # 1-5
    reliability_rating = Column(Integer, nullable=True)    # 1-5
    value_rating = Column(Integer, nullable=True)          # 1-5

    # Metadata
    is_verified = Column(Boolean, default=False)  # Verified completion
    is_public = Column(Boolean, default=True)
    response_content = Column(Text, nullable=True)  # Response from reviewee
    response_date = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews_given")
    reviewee = relationship("User", foreign_keys=[reviewee_id], back_populates="reviews_received")
    proposal = relationship("ItineraryProposal", back_populates="reviews")

    def __repr__(self):
        return f"<Review(id={self.id}, rating={self.rating}, reviewer={self.reviewer_id})>"