from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    traveler_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    local_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)

    # Conversation metadata
    last_message_at = Column(DateTime(timezone=True), server_default=func.now())
    last_message_content = Column(Text, nullable=True)
    last_message_sender_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=True)

    # Status tracking
    is_active = Column(Boolean, default=True)
    traveler_archived = Column(Boolean, default=False)
    local_archived = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    traveler = relationship("User", foreign_keys=[traveler_id], back_populates="traveler_conversations")
    local = relationship("User", foreign_keys=[local_id], back_populates="local_conversations")
    last_message_sender = relationship("User", foreign_keys=[last_message_sender_id])
    messages = relationship("Message", back_populates="conversation", lazy="dynamic", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Conversation {self.id}>"

    def get_other_participant(self, user_id):
        """Get the other participant in the conversation"""
        if str(user_id) == str(self.traveler_id):
            return self.local
        elif str(user_id) == str(self.local_id):
            return self.traveler
        return None

    def is_participant(self, user_id):
        """Check if user is a participant in this conversation"""
        return str(user_id) in [str(self.traveler_id), str(self.local_id)]

    def is_archived_for_user(self, user_id):
        """Check if conversation is archived for specific user"""
        if str(user_id) == str(self.traveler_id):
            return self.traveler_archived
        elif str(user_id) == str(self.local_id):
            return self.local_archived
        return False