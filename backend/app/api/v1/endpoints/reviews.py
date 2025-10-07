from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.review import Review
from app.models.itinerary_proposal import ItineraryProposal, ProposalStatus
from app.schemas.review import (
    ReviewCreate, ReviewUpdate, ReviewResponse, ReviewBase,
    ReviewListResponse, ReviewStatsResponse, ReviewEligibilityResponse
)
from uuid import UUID
from datetime import datetime
from typing import Optional

router = APIRouter()

@router.post("/", response_model=ReviewBase, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new review for a completed proposal"""

    # Check if proposal exists and is eligible for review
    result = await db.execute(
        select(ItineraryProposal)
        .options(selectinload(ItineraryProposal.request))
        .where(ItineraryProposal.id == review_data.proposal_id)
    )
    proposal = result.scalar_one_or_none()

    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # Check if proposal is accepted/completed
    if proposal.status != ProposalStatus.ACCEPTED:
        raise HTTPException(
            status_code=400,
            detail="Can only review accepted proposals"
        )

    # Determine who can review whom
    if proposal.request.traveler_id == current_user.id:
        # Traveler reviewing local guide
        reviewee_id = proposal.local_id
    elif proposal.local_id == current_user.id:
        # Local guide reviewing traveler
        reviewee_id = proposal.request.traveler_id
    else:
        raise HTTPException(
            status_code=403,
            detail="You can only review proposals you were involved in"
        )

    # Check if review already exists
    existing_review = await db.execute(
        select(Review).where(
            and_(
                Review.proposal_id == review_data.proposal_id,
                Review.reviewer_id == current_user.id
            )
        )
    )
    if existing_review.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="You have already reviewed this proposal"
        )

    # Create the review
    review = Review(
        proposal_id=review_data.proposal_id,
        reviewer_id=current_user.id,
        reviewee_id=reviewee_id,
        rating=review_data.rating,
        title=review_data.title,
        content=review_data.content,
        communication_rating=review_data.communication_rating,
        knowledge_rating=review_data.knowledge_rating,
        reliability_rating=review_data.reliability_rating,
        value_rating=review_data.value_rating,
        is_public=review_data.is_public,
        is_verified=True  # Auto-verify for accepted proposals
    )

    db.add(review)
    await db.commit()
    await db.refresh(review)

    # Load relationships for response
    result = await db.execute(
        select(Review)
        .options(
            selectinload(Review.reviewer),
            selectinload(Review.reviewee),
            selectinload(Review.proposal)
        )
        .where(Review.id == review.id)
    )
    review = result.scalar_one()

    return _review_to_response(review)

@router.get("/check-eligibility/{proposal_id}", response_model=ReviewEligibilityResponse)
async def check_review_eligibility(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Check if user can review a specific proposal"""

    # Get proposal
    result = await db.execute(
        select(ItineraryProposal)
        .options(selectinload(ItineraryProposal.request))
        .where(ItineraryProposal.id == proposal_id)
    )
    proposal = result.scalar_one_or_none()

    if not proposal:
        return ReviewEligibilityResponse(
            can_review=False,
            reason="Proposal not found"
        )

    # Check if user is involved in proposal
    if not (proposal.request.traveler_id == current_user.id or proposal.local_id == current_user.id):
        return ReviewEligibilityResponse(
            can_review=False,
            reason="You can only review proposals you were involved in"
        )

    # Check if proposal is accepted
    if proposal.status != ProposalStatus.ACCEPTED:
        return ReviewEligibilityResponse(
            can_review=False,
            reason="Can only review accepted proposals"
        )

    # Check for existing review
    existing_review = await db.execute(
        select(Review).where(
            and_(
                Review.proposal_id == proposal_id,
                Review.reviewer_id == current_user.id
            )
        )
    )
    existing = existing_review.scalar_one_or_none()

    if existing:
        return ReviewEligibilityResponse(
            can_review=False,
            reason="You have already reviewed this proposal",
            existing_review_id=existing.id
        )

    return ReviewEligibilityResponse(can_review=True)

@router.get("/user/{user_id}", response_model=ReviewListResponse)
async def get_user_reviews(
    user_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get all public reviews for a specific user"""

    # Get reviews with pagination
    result = await db.execute(
        select(Review)
        .options(
            selectinload(Review.reviewer),
            selectinload(Review.reviewee),
            selectinload(Review.proposal)
        )
        .where(
            and_(
                Review.reviewee_id == user_id,
                Review.is_public == True
            )
        )
        .order_by(Review.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    reviews = result.scalars().all()

    # Get total count
    count_result = await db.execute(
        select(func.count(Review.id)).where(
            and_(
                Review.reviewee_id == user_id,
                Review.is_public == True
            )
        )
    )
    total = count_result.scalar()

    return ReviewListResponse(
        reviews=[_review_to_response(review) for review in reviews],
        total=total,
        has_more=offset + len(reviews) < total
    )

@router.get("/user/{user_id}/stats", response_model=ReviewStatsResponse)
async def get_user_review_stats(
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get review statistics for a user"""

    # Get all public reviews for the user
    result = await db.execute(
        select(Review)
        .options(
            selectinload(Review.reviewer),
            selectinload(Review.reviewee),
            selectinload(Review.proposal)
        )
        .where(
            and_(
                Review.reviewee_id == user_id,
                Review.is_public == True
            )
        )
        .order_by(Review.created_at.desc())
    )
    reviews = result.scalars().all()

    if not reviews:
        return ReviewStatsResponse(
            total_reviews=0,
            average_rating=0.0,
            rating_distribution={1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            recent_reviews=[]
        )

    # Calculate statistics
    ratings = [review.rating for review in reviews]
    average_rating = sum(ratings) / len(ratings)

    # Rating distribution
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for rating in ratings:
        distribution[rating] += 1

    # Aspect averages
    communication_ratings = [r.communication_rating for r in reviews if r.communication_rating]
    knowledge_ratings = [r.knowledge_rating for r in reviews if r.knowledge_rating]
    reliability_ratings = [r.reliability_rating for r in reviews if r.reliability_rating]
    value_ratings = [r.value_rating for r in reviews if r.value_rating]

    return ReviewStatsResponse(
        total_reviews=len(reviews),
        average_rating=round(average_rating, 2),
        rating_distribution=distribution,
        average_communication=round(sum(communication_ratings) / len(communication_ratings), 2) if communication_ratings else None,
        average_knowledge=round(sum(knowledge_ratings) / len(knowledge_ratings), 2) if knowledge_ratings else None,
        average_reliability=round(sum(reliability_ratings) / len(reliability_ratings), 2) if reliability_ratings else None,
        average_value=round(sum(value_ratings) / len(value_ratings), 2) if value_ratings else None,
        recent_reviews=[_review_to_response(review) for review in reviews[:5]]
    )

@router.post("/{review_id}/respond", response_model=ReviewBase)
async def respond_to_review(
    review_id: UUID,
    response_data: ReviewResponse,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a response to a review (only by the reviewee)"""

    # Get the review
    result = await db.execute(
        select(Review)
        .options(
            selectinload(Review.reviewer),
            selectinload(Review.reviewee),
            selectinload(Review.proposal)
        )
        .where(Review.id == review_id)
    )
    review = result.scalar_one_or_none()

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Check if current user is the reviewee
    if review.reviewee_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only respond to reviews about you"
        )

    # Check if response already exists
    if review.response_content:
        raise HTTPException(
            status_code=400,
            detail="You have already responded to this review"
        )

    # Add response
    review.response_content = response_data.response_content
    review.response_date = datetime.utcnow()

    await db.commit()
    await db.refresh(review)

    return _review_to_response(review)

@router.get("/my-reviews", response_model=ReviewListResponse)
async def get_my_reviews(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    received: bool = Query(True, description="True for received reviews, False for given reviews"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's reviews (given or received)"""

    if received:
        condition = Review.reviewee_id == current_user.id
    else:
        condition = Review.reviewer_id == current_user.id

    result = await db.execute(
        select(Review)
        .options(
            selectinload(Review.reviewer),
            selectinload(Review.reviewee),
            selectinload(Review.proposal)
        )
        .where(condition)
        .order_by(Review.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    reviews = result.scalars().all()

    # Get total count
    count_result = await db.execute(
        select(func.count(Review.id)).where(condition)
    )
    total = count_result.scalar()

    return ReviewListResponse(
        reviews=[_review_to_response(review) for review in reviews],
        total=total,
        has_more=offset + len(reviews) < total
    )

def _review_to_response(review: Review) -> ReviewBase:
    """Convert Review model to ReviewBase response"""
    return ReviewBase(
        id=review.id,
        proposal_id=review.proposal_id,
        reviewer_id=review.reviewer_id,
        reviewee_id=review.reviewee_id,
        rating=review.rating,
        title=review.title,
        content=review.content,
        communication_rating=review.communication_rating,
        knowledge_rating=review.knowledge_rating,
        reliability_rating=review.reliability_rating,
        value_rating=review.value_rating,
        is_verified=review.is_verified,
        is_public=review.is_public,
        response_content=review.response_content,
        response_date=review.response_date,
        created_at=review.created_at,
        updated_at=review.updated_at,
        reviewer_name=review.reviewer.full_name,
        reviewer_avatar=review.reviewer.avatar_url,
        reviewee_name=review.reviewee.full_name,
        reviewee_avatar=review.reviewee.avatar_url,
        proposal_title=review.proposal.title
    )