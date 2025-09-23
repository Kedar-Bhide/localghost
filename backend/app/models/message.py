from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
import enum

class MessageType(str, enum.Enum):
    TEXT = "text"
    SYSTEM = "system"
    BOOKING_REQUEST = "booking_request"
    BOOKING_CONFIRMATION = "booking_confirmation"

class MessageStatus(str, enum.Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"

class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)

    # Message content
    content = Column(Text, nullable=False)
    message_type = Column(Enum(MessageType), default=MessageType.TEXT, nullable=False)

    # Message status and metadata
    status = Column(Enum(MessageStatus), default=MessageStatus.SENT, nullable=False)
    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Read status tracking
    read_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")

    def __repr__(self):
        return f"<Message {self.id}: {self.content[:50]}...>"

    def mark_as_read(self):
        """Mark message as read"""
        if self.status != MessageStatus.READ:
            self.status = MessageStatus.READ
            self.read_at = func.now()

    def mark_as_delivered(self):
        """Mark message as delivered"""
        if self.status == MessageStatus.SENT:
            self.status = MessageStatus.DELIVERED
            self.delivered_at = func.now()