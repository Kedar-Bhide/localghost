from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

class NotificationCreate(BaseModel):
    user_id: UUID
    type: str
    priority: str = "medium"
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=2000)
    action_url: Optional[str] = Field(None, max_length=500)
    action_label: Optional[str] = Field(None, max_length=100)
    extra_data: Optional[Dict[str, Any]] = None
    related_proposal_id: Optional[UUID] = None
    related_request_id: Optional[UUID] = None
    related_user_id: Optional[UUID] = None
    expires_at: Optional[datetime] = None

class NotificationUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    message: Optional[str] = Field(None, min_length=1, max_length=2000)
    is_read: Optional[bool] = None

class NotificationBase(BaseModel):
    id: UUID
    type: str
    priority: str
    title: str
    message: str
    action_url: Optional[str]
    action_label: Optional[str]
    extra_data: Optional[Dict[str, Any]]

    related_proposal_id: Optional[UUID]
    related_request_id: Optional[UUID]
    related_user_id: Optional[UUID]

    is_read: bool
    read_at: Optional[datetime]
    is_sent: bool
    sent_at: Optional[datetime]
    delivery_method: Optional[str]

    created_at: datetime
    expires_at: Optional[datetime]

    # Related user info (who triggered the notification)
    related_user_name: Optional[str]
    related_user_avatar: Optional[str]

    class Config:
        from_attributes = True

class NotificationListResponse(BaseModel):
    notifications: List[NotificationBase]
    total: int
    unread_count: int
    has_more: bool

class NotificationStatsResponse(BaseModel):
    total_notifications: int
    unread_count: int
    recent_notifications: List[NotificationBase]

class MarkAsReadRequest(BaseModel):
    notification_ids: List[UUID]

class NotificationPreferences(BaseModel):
    email_notifications: bool = True
    push_notifications: bool = True
    proposal_notifications: bool = True
    message_notifications: bool = True
    review_notifications: bool = True
    system_notifications: bool = True