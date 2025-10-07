from sqlalchemy.ext.asyncio import AsyncSession
from app.models.notification import Notification, NotificationType, NotificationPriority
from app.models.user import User
from app.models.itinerary_proposal import ItineraryProposal
from app.models.itinerary_request import ItineraryRequest
from uuid import UUID
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

class NotificationService:
    """Service for creating and managing notifications"""

    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: UUID,
        notification_type: str,
        title: str,
        message: str,
        priority: str = NotificationPriority.MEDIUM,
        action_url: Optional[str] = None,
        action_label: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
        related_proposal_id: Optional[UUID] = None,
        related_request_id: Optional[UUID] = None,
        related_user_id: Optional[UUID] = None,
        expires_at: Optional[datetime] = None
    ) -> Notification:
        """Create a new notification"""

        notification = Notification(
            user_id=user_id,
            type=notification_type,
            priority=priority,
            title=title,
            message=message,
            action_url=action_url,
            action_label=action_label,
            extra_data=extra_data,
            related_proposal_id=related_proposal_id,
            related_request_id=related_request_id,
            related_user_id=related_user_id,
            expires_at=expires_at
        )

        db.add(notification)
        await db.commit()
        await db.refresh(notification)

        return notification

    @staticmethod
    async def notify_proposal_received(
        db: AsyncSession,
        proposal: ItineraryProposal,
        traveler: User
    ):
        """Notify traveler of a new proposal"""
        return await NotificationService.create_notification(
            db=db,
            user_id=traveler.id,
            notification_type=NotificationType.PROPOSAL_RECEIVED,
            title="New Itinerary Proposal",
            message=f"You received a new proposal for '{proposal.request.title}' from {proposal.local.full_name}.",
            priority=NotificationPriority.HIGH,
            action_url=f"/itineraries/proposals/{proposal.id}",
            action_label="View Proposal",
            related_proposal_id=proposal.id,
            related_request_id=proposal.request_id,
            related_user_id=proposal.local_id
        )

    @staticmethod
    async def notify_proposal_accepted(
        db: AsyncSession,
        proposal: ItineraryProposal,
        local_guide: User
    ):
        """Notify local guide that their proposal was accepted"""
        return await NotificationService.create_notification(
            db=db,
            user_id=local_guide.id,
            notification_type=NotificationType.PROPOSAL_ACCEPTED,
            title="Proposal Accepted! 🎉",
            message=f"Great news! Your proposal for '{proposal.request.title}' has been accepted by {proposal.request.traveler.full_name}.",
            priority=NotificationPriority.HIGH,
            action_url=f"/itineraries/proposals/{proposal.id}",
            action_label="View Details",
            related_proposal_id=proposal.id,
            related_request_id=proposal.request_id,
            related_user_id=proposal.request.traveler_id
        )

    @staticmethod
    async def notify_proposal_declined(
        db: AsyncSession,
        proposal: ItineraryProposal,
        local_guide: User
    ):
        """Notify local guide that their proposal was declined"""
        return await NotificationService.create_notification(
            db=db,
            user_id=local_guide.id,
            notification_type=NotificationType.PROPOSAL_DECLINED,
            title="Proposal Update",
            message=f"Your proposal for '{proposal.request.title}' was not selected this time. Keep creating amazing experiences!",
            priority=NotificationPriority.MEDIUM,
            action_url=f"/itineraries/proposals/{proposal.id}",
            action_label="View Details",
            related_proposal_id=proposal.id,
            related_request_id=proposal.request_id,
            related_user_id=proposal.request.traveler_id
        )

    @staticmethod
    async def notify_new_message(
        db: AsyncSession,
        recipient: User,
        sender: User,
        conversation_id: UUID,
        message_preview: str
    ):
        """Notify user of a new message"""
        return await NotificationService.create_notification(
            db=db,
            user_id=recipient.id,
            notification_type=NotificationType.NEW_MESSAGE,
            title=f"New message from {sender.full_name}",
            message=f"{message_preview[:100]}{'...' if len(message_preview) > 100 else ''}",
            priority=NotificationPriority.MEDIUM,
            action_url=f"/chats?conversation_id={conversation_id}",
            action_label="Reply",
            extra_data={"conversation_id": str(conversation_id)},
            related_user_id=sender.id
        )

    @staticmethod
    async def notify_review_received(
        db: AsyncSession,
        reviewee: User,
        reviewer: User,
        proposal: ItineraryProposal,
        rating: int
    ):
        """Notify user they received a review"""
        stars = "⭐" * rating
        return await NotificationService.create_notification(
            db=db,
            user_id=reviewee.id,
            notification_type=NotificationType.REVIEW_RECEIVED,
            title=f"New {rating}-star review! {stars}",
            message=f"{reviewer.full_name} left you a {rating}-star review for '{proposal.title}'. Check it out!",
            priority=NotificationPriority.MEDIUM,
            action_url=f"/reviews",
            action_label="View Review",
            related_proposal_id=proposal.id,
            related_user_id=reviewer.id
        )

    @staticmethod
    async def notify_review_response(
        db: AsyncSession,
        reviewer: User,
        reviewee: User,
        proposal: ItineraryProposal
    ):
        """Notify reviewer that they got a response to their review"""
        return await NotificationService.create_notification(
            db=db,
            user_id=reviewer.id,
            notification_type=NotificationType.REVIEW_RESPONSE,
            title="Response to Your Review",
            message=f"{reviewee.full_name} responded to your review for '{proposal.title}'.",
            priority=NotificationPriority.LOW,
            action_url=f"/reviews",
            action_label="View Response",
            related_proposal_id=proposal.id,
            related_user_id=reviewee.id
        )

    @staticmethod
    async def notify_request_assigned(
        db: AsyncSession,
        local_guide: User,
        request: ItineraryRequest
    ):
        """Notify local guide of request assignment"""
        return await NotificationService.create_notification(
            db=db,
            user_id=local_guide.id,
            notification_type=NotificationType.REQUEST_ASSIGNED,
            title="New Request Assignment",
            message=f"You've been assigned to help with '{request.title}' in {request.destination_city}.",
            priority=NotificationPriority.HIGH,
            action_url=f"/itineraries/requests/{request.id}",
            action_label="View Request",
            related_request_id=request.id,
            related_user_id=request.traveler_id
        )

    @staticmethod
    async def notify_system_announcement(
        db: AsyncSession,
        user_id: UUID,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        expires_in_days: int = 30
    ):
        """Send a system announcement notification"""
        expires_at = datetime.utcnow() + timedelta(days=expires_in_days)

        return await NotificationService.create_notification(
            db=db,
            user_id=user_id,
            notification_type=NotificationType.SYSTEM_ANNOUNCEMENT,
            title=title,
            message=message,
            priority=NotificationPriority.MEDIUM,
            action_url=action_url,
            action_label="Learn More" if action_url else None,
            expires_at=expires_at
        )