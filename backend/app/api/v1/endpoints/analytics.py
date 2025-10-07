from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.itinerary_request import ItineraryRequest, ItineraryRequestStatus
from app.models.itinerary_proposal import ItineraryProposal, ProposalStatus
from app.models.review import Review
from app.models.notification import Notification
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import calendar

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get comprehensive dashboard analytics for current user"""

    analytics = {}

    if current_user.role == 'traveler':
        analytics = await get_traveler_analytics(db, current_user)
    elif current_user.role == 'local':
        analytics = await get_local_analytics(db, current_user)
    else:
        analytics = await get_general_analytics(db, current_user)

    return analytics

async def get_traveler_analytics(db: AsyncSession, user: User) -> Dict[str, Any]:
    """Get analytics for traveler users"""

    # Basic counts
    total_requests_result = await db.execute(
        select(func.count(ItineraryRequest.id)).where(
            ItineraryRequest.traveler_id == user.id
        )
    )
    total_requests = total_requests_result.scalar()

    active_requests_result = await db.execute(
        select(func.count(ItineraryRequest.id)).where(
            and_(
                ItineraryRequest.traveler_id == user.id,
                ItineraryRequest.status.in_([
                    ItineraryRequestStatus.PENDING,
                    ItineraryRequestStatus.ACTIVE
                ])
            )
        )
    )
    active_requests = active_requests_result.scalar()

    completed_requests_result = await db.execute(
        select(func.count(ItineraryRequest.id)).where(
            and_(
                ItineraryRequest.traveler_id == user.id,
                ItineraryRequest.status == ItineraryRequestStatus.COMPLETED
            )
        )
    )
    completed_requests = completed_requests_result.scalar()

    # Proposals received
    proposals_received_result = await db.execute(
        select(func.count(ItineraryProposal.id)).where(
            ItineraryProposal.request_id.in_(
                select(ItineraryRequest.id).where(
                    ItineraryRequest.traveler_id == user.id
                )
            )
        )
    )
    proposals_received = proposals_received_result.scalar()

    # Reviews given
    reviews_given_result = await db.execute(
        select(func.count(Review.id)).where(Review.reviewer_id == user.id)
    )
    reviews_given = reviews_given_result.scalar()

    # Monthly activity (last 6 months)
    monthly_activity = await get_monthly_activity(db, user, 'traveler')

    # Recent requests
    recent_requests_result = await db.execute(
        select(ItineraryRequest)
        .where(ItineraryRequest.traveler_id == user.id)
        .order_by(desc(ItineraryRequest.created_at))
        .limit(5)
    )
    recent_requests = recent_requests_result.scalars().all()

    # Spending analytics
    spending_analytics = await get_spending_analytics(db, user)

    return {
        'user_type': 'traveler',
        'overview': {
            'total_requests': total_requests,
            'active_requests': active_requests,
            'completed_requests': completed_requests,
            'proposals_received': proposals_received,
            'reviews_given': reviews_given
        },
        'monthly_activity': monthly_activity,
        'recent_requests': [
            {
                'id': str(req.id),
                'title': req.title,
                'destination': f"{req.destination_city}, {req.destination_country}",
                'status': req.status.value,
                'created_at': req.created_at.isoformat()
            }
            for req in recent_requests
        ],
        'spending_analytics': spending_analytics
    }

async def get_local_analytics(db: AsyncSession, user: User) -> Dict[str, Any]:
    """Get analytics for local guide users"""

    # Basic counts
    total_proposals_result = await db.execute(
        select(func.count(ItineraryProposal.id)).where(
            ItineraryProposal.local_id == user.id
        )
    )
    total_proposals = total_proposals_result.scalar()

    accepted_proposals_result = await db.execute(
        select(func.count(ItineraryProposal.id)).where(
            and_(
                ItineraryProposal.local_id == user.id,
                ItineraryProposal.status == ProposalStatus.ACCEPTED
            )
        )
    )
    accepted_proposals = accepted_proposals_result.scalar()

    pending_proposals_result = await db.execute(
        select(func.count(ItineraryProposal.id)).where(
            and_(
                ItineraryProposal.local_id == user.id,
                ItineraryProposal.status.in_([
                    ProposalStatus.SUBMITTED,
                    ProposalStatus.UNDER_REVIEW
                ])
            )
        )
    )
    pending_proposals = pending_proposals_result.scalar()

    # Reviews received
    reviews_received_result = await db.execute(
        select(func.count(Review.id)).where(Review.reviewee_id == user.id)
    )
    reviews_received = reviews_received_result.scalar()

    # Average rating
    avg_rating_result = await db.execute(
        select(func.avg(Review.rating)).where(
            and_(
                Review.reviewee_id == user.id,
                Review.is_public == True
            )
        )
    )
    avg_rating = avg_rating_result.scalar() or 0

    # Monthly activity
    monthly_activity = await get_monthly_activity(db, user, 'local')

    # Recent proposals
    recent_proposals_result = await db.execute(
        select(ItineraryProposal)
        .options(selectinload(ItineraryProposal.request))
        .where(ItineraryProposal.local_id == user.id)
        .order_by(desc(ItineraryProposal.created_at))
        .limit(5)
    )
    recent_proposals = recent_proposals_result.scalars().all()

    # Earnings analytics
    earnings_analytics = await get_earnings_analytics(db, user)

    # Success rate
    success_rate = (accepted_proposals / total_proposals * 100) if total_proposals > 0 else 0

    return {
        'user_type': 'local',
        'overview': {
            'total_proposals': total_proposals,
            'accepted_proposals': accepted_proposals,
            'pending_proposals': pending_proposals,
            'reviews_received': reviews_received,
            'average_rating': round(avg_rating, 2),
            'success_rate': round(success_rate, 1)
        },
        'monthly_activity': monthly_activity,
        'recent_proposals': [
            {
                'id': str(prop.id),
                'title': prop.title,
                'request_title': prop.request.title if prop.request else '',
                'status': prop.status.value,
                'total_price': float(prop.total_price),
                'created_at': prop.created_at.isoformat()
            }
            for prop in recent_proposals
        ],
        'earnings_analytics': earnings_analytics
    }

async def get_general_analytics(db: AsyncSession, user: User) -> Dict[str, Any]:
    """Get general analytics for users without specific role"""

    # Notifications
    total_notifications_result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == user.id
        )
    )
    total_notifications = total_notifications_result.scalar()

    unread_notifications_result = await db.execute(
        select(func.count(Notification.id)).where(
            and_(
                Notification.user_id == user.id,
                Notification.is_read == False
            )
        )
    )
    unread_notifications = unread_notifications_result.scalar()

    return {
        'user_type': 'general',
        'overview': {
            'total_notifications': total_notifications,
            'unread_notifications': unread_notifications,
            'account_created': user.created_at.isoformat()
        }
    }

async def get_monthly_activity(db: AsyncSession, user: User, user_type: str) -> List[Dict]:
    """Get monthly activity data for the last 6 months"""

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=180)  # 6 months

    monthly_data = []

    for i in range(6):
        month_start = end_date.replace(day=1) - timedelta(days=30 * i)
        month_end = month_start + timedelta(days=calendar.monthrange(month_start.year, month_start.month)[1] - 1)

        if user_type == 'traveler':
            # Count requests created this month
            count_result = await db.execute(
                select(func.count(ItineraryRequest.id)).where(
                    and_(
                        ItineraryRequest.traveler_id == user.id,
                        ItineraryRequest.created_at >= month_start,
                        ItineraryRequest.created_at <= month_end
                    )
                )
            )
        else:  # local
            # Count proposals created this month
            count_result = await db.execute(
                select(func.count(ItineraryProposal.id)).where(
                    and_(
                        ItineraryProposal.local_id == user.id,
                        ItineraryProposal.created_at >= month_start,
                        ItineraryProposal.created_at <= month_end
                    )
                )
            )

        count = count_result.scalar()

        monthly_data.append({
            'month': month_start.strftime('%Y-%m'),
            'month_name': month_start.strftime('%B %Y'),
            'count': count
        })

    return list(reversed(monthly_data))

async def get_spending_analytics(db: AsyncSession, user: User) -> Dict:
    """Get spending analytics for traveler"""

    # Get accepted proposals for user's requests
    proposals_result = await db.execute(
        select(ItineraryProposal).where(
            and_(
                ItineraryProposal.request_id.in_(
                    select(ItineraryRequest.id).where(
                        ItineraryRequest.traveler_id == user.id
                    )
                ),
                ItineraryProposal.status == ProposalStatus.ACCEPTED
            )
        )
    )
    proposals = proposals_result.scalars().all()

    total_spent = sum(float(prop.total_price) for prop in proposals)
    average_per_trip = total_spent / len(proposals) if proposals else 0

    # Monthly spending
    monthly_spending = {}
    for prop in proposals:
        if prop.accepted_at:
            month_key = prop.accepted_at.strftime('%Y-%m')
            monthly_spending[month_key] = monthly_spending.get(month_key, 0) + float(prop.total_price)

    return {
        'total_spent': total_spent,
        'average_per_trip': round(average_per_trip, 2),
        'trips_count': len(proposals),
        'monthly_spending': monthly_spending
    }

async def get_earnings_analytics(db: AsyncSession, user: User) -> Dict:
    """Get earnings analytics for local guide"""

    # Get accepted proposals
    proposals_result = await db.execute(
        select(ItineraryProposal).where(
            and_(
                ItineraryProposal.local_id == user.id,
                ItineraryProposal.status == ProposalStatus.ACCEPTED
            )
        )
    )
    proposals = proposals_result.scalars().all()

    total_earnings = sum(float(prop.total_price) for prop in proposals)
    average_per_proposal = total_earnings / len(proposals) if proposals else 0

    # Monthly earnings
    monthly_earnings = {}
    for prop in proposals:
        if prop.accepted_at:
            month_key = prop.accepted_at.strftime('%Y-%m')
            monthly_earnings[month_key] = monthly_earnings.get(month_key, 0) + float(prop.total_price)

    return {
        'total_earnings': total_earnings,
        'average_per_proposal': round(average_per_proposal, 2),
        'accepted_proposals': len(proposals),
        'monthly_earnings': monthly_earnings
    }