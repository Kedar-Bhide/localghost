from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationCreate, NotificationUpdate, NotificationBase,
    NotificationListResponse, NotificationStatsResponse,
    MarkAsReadRequest, NotificationPreferences
)
from app.services.notification_service import NotificationService
from uuid import UUID
from datetime import datetime
from typing import Optional, List

router = APIRouter()

@router.get("/", response_model=NotificationListResponse)
async def get_my_notifications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False, description="Show only unread notifications"),
    notification_type: Optional[str] = Query(None, description="Filter by notification type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's notifications"""

    # Build query conditions
    conditions = [Notification.user_id == current_user.id]

    if unread_only:
        conditions.append(Notification.is_read == False)

    if notification_type:
        conditions.append(Notification.type == notification_type)

    # Get notifications with pagination
    result = await db.execute(
        select(Notification)
        .options(selectinload(Notification.related_user))
        .where(and_(*conditions))
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    notifications = result.scalars().all()

    # Get total count
    count_result = await db.execute(
        select(func.count(Notification.id)).where(and_(*conditions))
    )
    total = count_result.scalar()

    # Get unread count
    unread_result = await db.execute(
        select(func.count(Notification.id)).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.is_read == False
            )
        )
    )
    unread_count = unread_result.scalar()

    return NotificationListResponse(
        notifications=[_notification_to_response(notification) for notification in notifications],
        total=total,
        unread_count=unread_count,
        has_more=offset + len(notifications) < total
    )

@router.get("/stats", response_model=NotificationStatsResponse)
async def get_notification_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get notification statistics for current user"""

    # Get total count
    total_result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id
        )
    )
    total = total_result.scalar()

    # Get unread count
    unread_result = await db.execute(
        select(func.count(Notification.id)).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.is_read == False
            )
        )
    )
    unread_count = unread_result.scalar()

    # Get recent notifications
    recent_result = await db.execute(
        select(Notification)
        .options(selectinload(Notification.related_user))
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(5)
    )
    recent_notifications = recent_result.scalars().all()

    return NotificationStatsResponse(
        total_notifications=total,
        unread_count=unread_count,
        recent_notifications=[_notification_to_response(notification) for notification in recent_notifications]
    )

@router.patch("/mark-read", response_model=dict)
async def mark_notifications_as_read(
    request: MarkAsReadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark specific notifications as read"""

    # Get notifications that belong to current user
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id.in_(request.notification_ids),
                Notification.user_id == current_user.id
            )
        )
    )
    notifications = result.scalars().all()

    if not notifications:
        raise HTTPException(
            status_code=404,
            detail="No notifications found"
        )

    # Mark as read
    marked_count = 0
    for notification in notifications:
        if not notification.is_read:
            notification.mark_as_read()
            marked_count += 1

    await db.commit()

    return {
        "message": f"Marked {marked_count} notifications as read",
        "marked_count": marked_count
    }

@router.patch("/mark-all-read", response_model=dict)
async def mark_all_notifications_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark all notifications as read for current user"""

    # Get all unread notifications
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.is_read == False
            )
        )
    )
    notifications = result.scalars().all()

    # Mark as read
    for notification in notifications:
        notification.mark_as_read()

    await db.commit()

    return {
        "message": f"Marked {len(notifications)} notifications as read",
        "marked_count": len(notifications)
    }

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a specific notification"""

    # Get notification
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    await db.delete(notification)
    await db.commit()

    return {"message": "Notification deleted successfully"}

@router.delete("/clear-all")
async def clear_all_notifications(
    older_than_days: int = Query(30, ge=1, le=365, description="Delete notifications older than X days"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Clear old notifications for current user"""

    from datetime import timedelta
    cutoff_date = datetime.utcnow() - timedelta(days=older_than_days)

    # Get old notifications
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.created_at < cutoff_date
            )
        )
    )
    notifications = result.scalars().all()

    # Delete them
    for notification in notifications:
        await db.delete(notification)

    await db.commit()

    return {
        "message": f"Deleted {len(notifications)} old notifications",
        "deleted_count": len(notifications)
    }

@router.post("/test", response_model=NotificationBase)
async def create_test_notification(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a test notification for development"""

    notification = await NotificationService.notify_system_announcement(
        db=db,
        user_id=current_user.id,
        title="Test Notification",
        message="This is a test notification to verify the notification system is working correctly.",
        action_url="/dashboard"
    )

    result = await db.execute(
        select(Notification)
        .options(selectinload(Notification.related_user))
        .where(Notification.id == notification.id)
    )
    notification = result.scalar_one()

    return _notification_to_response(notification)

def _notification_to_response(notification: Notification) -> NotificationBase:
    """Convert Notification model to NotificationBase response"""
    return NotificationBase(
        id=notification.id,
        type=notification.type,
        priority=notification.priority,
        title=notification.title,
        message=notification.message,
        action_url=notification.action_url,
        action_label=notification.action_label,
        metadata=notification.metadata,
        related_proposal_id=notification.related_proposal_id,
        related_request_id=notification.related_request_id,
        related_user_id=notification.related_user_id,
        is_read=notification.is_read,
        read_at=notification.read_at,
        is_sent=notification.is_sent,
        sent_at=notification.sent_at,
        delivery_method=notification.delivery_method,
        created_at=notification.created_at,
        expires_at=notification.expires_at,
        related_user_name=notification.related_user.full_name if notification.related_user else None,
        related_user_avatar=notification.related_user.avatar_url if notification.related_user else None
    )