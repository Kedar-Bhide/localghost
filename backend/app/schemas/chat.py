from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.models.message import MessageType, MessageStatus

# Message Schemas
class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    message_type: MessageType = MessageType.TEXT

class MessageUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)

class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    content: str
    message_type: MessageType
    status: MessageStatus
    is_edited: bool
    edited_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    read_at: Optional[datetime]
    delivered_at: Optional[datetime]

    # Sender information
    sender_name: str
    sender_avatar: Optional[str]

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_sender(cls, message, sender=None):
        """Create MessageResponse with sender information"""
        if sender is None:
            sender = message.sender

        return cls(
            id=message.id,
            conversation_id=message.conversation_id,
            sender_id=message.sender_id,
            content=message.content,
            message_type=message.message_type,
            status=message.status,
            is_edited=message.is_edited,
            edited_at=message.edited_at,
            created_at=message.created_at,
            updated_at=message.updated_at,
            read_at=message.read_at,
            delivered_at=message.delivered_at,
            sender_name=sender.full_name if sender else "Unknown",
            sender_avatar=sender.profile_picture_url if sender else None
        )

# Conversation Schemas
class ConversationCreate(BaseModel):
    local_id: UUID
    initial_message: str = Field(..., min_length=1, max_length=2000)

class ConversationResponse(BaseModel):
    id: UUID
    traveler_id: UUID
    local_id: UUID
    last_message_at: datetime
    last_message_content: Optional[str]
    last_message_sender_id: Optional[UUID]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Participant information
    other_participant_id: UUID
    other_participant_name: str
    other_participant_avatar: Optional[str]

    # Unread count
    unread_count: int = 0

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_participant(cls, conversation, current_user_id, other_participant=None, unread_count=0):
        """Create ConversationResponse with other participant information"""
        if other_participant is None:
            other_participant = conversation.get_other_participant(current_user_id)

        return cls(
            id=conversation.id,
            traveler_id=conversation.traveler_id,
            local_id=conversation.local_id,
            last_message_at=conversation.last_message_at,
            last_message_content=conversation.last_message_content,
            last_message_sender_id=conversation.last_message_sender_id,
            is_active=conversation.is_active,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            other_participant_id=other_participant.id if other_participant else None,
            other_participant_name=other_participant.full_name if other_participant else "Unknown",
            other_participant_avatar=other_participant.profile_picture_url if other_participant else None,
            unread_count=unread_count
        )

# Chat list and pagination
class ChatListResponse(BaseModel):
    conversations: List[ConversationResponse]
    total: int
    has_more: bool

class MessageListResponse(BaseModel):
    messages: List[MessageResponse]
    total: int
    has_more: bool

# Real-time updates
class MessageStatusUpdate(BaseModel):
    message_id: UUID
    status: MessageStatus
    timestamp: datetime

class ConversationUpdate(BaseModel):
    conversation_id: UUID
    last_message: Optional[MessageResponse]
    unread_count: int
    timestamp: datetime