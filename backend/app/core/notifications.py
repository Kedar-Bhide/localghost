from typing import Dict, Any, Optional
from enum import Enum
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class NotificationType(str, Enum):
    ITINERARY_REQUEST_CREATED = "itinerary_request_created"
    ITINERARY_REQUEST_UPDATED = "itinerary_request_updated"
    ITINERARY_REQUEST_STATUS_CHANGED = "itinerary_request_status_changed"
    PROPOSAL_CREATED = "proposal_created"
    PROPOSAL_UPDATED = "proposal_updated"
    PROPOSAL_STATUS_CHANGED = "proposal_status_changed"
    PROPOSAL_ACCEPTED = "proposal_accepted"
    PROPOSAL_DECLINED = "proposal_declined"

class NotificationService:
    """
    Simple notification service for itinerary system.
    This is a basic implementation that logs notifications.
    In a production system, this would integrate with email, push notifications, etc.
    """

    @staticmethod
    async def send_notification(
        user_id: str,
        notification_type: NotificationType,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Send a notification to a user.
        For now, this just logs the notification.
        """
        notification_data = {
            "user_id": user_id,
            "type": notification_type.value,
            "title": title,
            "message": message,
            "data": data or {},
            "timestamp": datetime.utcnow().isoformat()
        }

        logger.info(f"Notification sent: {notification_data}")

        # In a real implementation, you would:
        # 1. Store the notification in the database
        # 2. Send email/push notification
        # 3. Add to real-time notification queue

        return True

    @staticmethod
    async def notify_request_created(request_id: str, traveler_id: str, request_title: str):
        """Notify when an itinerary request is created"""
        await NotificationService.send_notification(
            user_id=traveler_id,
            notification_type=NotificationType.ITINERARY_REQUEST_CREATED,
            title="Itinerary Request Created",
            message=f"Your itinerary request '{request_title}' has been created successfully.",
            data={"request_id": request_id}
        )

    @staticmethod
    async def notify_request_status_changed(
        request_id: str,
        traveler_id: str,
        request_title: str,
        old_status: str,
        new_status: str
    ):
        """Notify when an itinerary request status changes"""
        await NotificationService.send_notification(
            user_id=traveler_id,
            notification_type=NotificationType.ITINERARY_REQUEST_STATUS_CHANGED,
            title="Request Status Updated",
            message=f"Your itinerary request '{request_title}' status changed from {old_status} to {new_status}.",
            data={"request_id": request_id, "old_status": old_status, "new_status": new_status}
        )

    @staticmethod
    async def notify_proposal_created(
        proposal_id: str,
        request_id: str,
        traveler_id: str,
        local_id: str,
        local_name: str,
        request_title: str
    ):
        """Notify when a proposal is created for a request"""
        await NotificationService.send_notification(
            user_id=traveler_id,
            notification_type=NotificationType.PROPOSAL_CREATED,
            title="New Itinerary Proposal",
            message=f"{local_name} has submitted a proposal for your request '{request_title}'.",
            data={"proposal_id": proposal_id, "request_id": request_id, "local_id": local_id}
        )

    @staticmethod
    async def notify_proposal_status_changed(
        proposal_id: str,
        request_id: str,
        local_id: str,
        traveler_id: str,
        proposal_title: str,
        old_status: str,
        new_status: str
    ):
        """Notify when a proposal status changes"""
        if new_status == "accepted":
            await NotificationService.notify_proposal_accepted(
                proposal_id, request_id, local_id, traveler_id, proposal_title
            )
        elif new_status == "declined":
            await NotificationService.notify_proposal_declined(
                proposal_id, request_id, local_id, traveler_id, proposal_title
            )
        else:
            # Notify the local guide about other status changes
            await NotificationService.send_notification(
                user_id=local_id,
                notification_type=NotificationType.PROPOSAL_STATUS_CHANGED,
                title="Proposal Status Updated",
                message=f"Your proposal '{proposal_title}' status changed to {new_status}.",
                data={"proposal_id": proposal_id, "request_id": request_id, "old_status": old_status, "new_status": new_status}
            )

    @staticmethod
    async def notify_proposal_accepted(
        proposal_id: str,
        request_id: str,
        local_id: str,
        traveler_id: str,
        proposal_title: str
    ):
        """Notify when a proposal is accepted"""
        # Notify the local guide
        await NotificationService.send_notification(
            user_id=local_id,
            notification_type=NotificationType.PROPOSAL_ACCEPTED,
            title="Proposal Accepted! 🎉",
            message=f"Congratulations! Your proposal '{proposal_title}' has been accepted.",
            data={"proposal_id": proposal_id, "request_id": request_id}
        )

        # Also notify the traveler
        await NotificationService.send_notification(
            user_id=traveler_id,
            notification_type=NotificationType.PROPOSAL_ACCEPTED,
            title="Proposal Accepted",
            message=f"You've accepted the proposal '{proposal_title}'. You can now start chatting with your local guide.",
            data={"proposal_id": proposal_id, "request_id": request_id}
        )

    @staticmethod
    async def notify_proposal_declined(
        proposal_id: str,
        request_id: str,
        local_id: str,
        traveler_id: str,
        proposal_title: str
    ):
        """Notify when a proposal is declined"""
        await NotificationService.send_notification(
            user_id=local_id,
            notification_type=NotificationType.PROPOSAL_DECLINED,
            title="Proposal Declined",
            message=f"Your proposal '{proposal_title}' was not selected. Don't worry, keep creating great proposals!",
            data={"proposal_id": proposal_id, "request_id": request_id}
        )