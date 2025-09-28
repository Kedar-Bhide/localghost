from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.itinerary_request import ItineraryRequest, ItineraryRequestStatus
from app.models.itinerary_proposal import ItineraryProposal, ProposalStatus
from app.schemas.itinerary import (
    ItineraryProposalCreate, ItineraryProposalUpdate, ItineraryProposalResponse,
    ItineraryProposalStatusUpdate
)
from uuid import UUID
from datetime import datetime
from app.core.notifications import NotificationService

router = APIRouter()

@router.post("/proposals", response_model=ItineraryProposalResponse, status_code=status.HTTP_201_CREATED)
async def create_itinerary_proposal(
    proposal_data: ItineraryProposalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new itinerary proposal"""
    try:
        # Check if user is a local guide
        if current_user.role != 'local':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only local guides can create proposals"
            )

        # Check if request exists and can receive proposals
        request_stmt = select(ItineraryRequest).where(ItineraryRequest.id == proposal_data.request_id)
        request_result = await db.execute(request_stmt)
        request = request_result.scalar_one_or_none()

        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Itinerary request not found"
            )

        if not request.can_receive_proposals():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request cannot receive new proposals"
            )

        # Check if local already has a proposal for this request
        existing_stmt = (
            select(ItineraryProposal)
            .where(
                and_(
                    ItineraryProposal.request_id == proposal_data.request_id,
                    ItineraryProposal.local_id == current_user.id
                )
            )
        )
        existing_result = await db.execute(existing_stmt)
        existing_proposal = existing_result.scalar_one_or_none()

        if existing_proposal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You already have a proposal for this request"
            )

        # Create proposal
        proposal_dict = proposal_data.dict()
        proposal_dict.pop('request_id')  # Remove to avoid duplicate

        proposal = ItineraryProposal(
            request_id=proposal_data.request_id,
            local_id=current_user.id,
            **proposal_dict
        )

        db.add(proposal)
        await db.flush()
        await db.refresh(proposal)

        # Load relationships
        await db.refresh(proposal, ['local', 'request'])

        await db.commit()

        # Send notification to traveler about new proposal
        await NotificationService.notify_proposal_created(
            proposal_id=str(proposal.id),
            request_id=str(proposal.request_id),
            traveler_id=str(proposal.request.traveler_id),
            local_id=str(current_user.id),
            local_name=proposal.local.full_name,
            request_title=proposal.request.title
        )

        # Create response
        proposal_response = ItineraryProposalResponse.from_orm(proposal)
        proposal_response.price_per_person = proposal.price_per_person
        proposal_response.duration_days = proposal.duration_days
        proposal_response.local_name = proposal.local.full_name
        proposal_response.local_avatar = proposal.local.profile_picture_url
        proposal_response.local_rating = getattr(proposal.local.local_profile, 'average_rating', None) if proposal.local.local_profile else None
        proposal_response.local_verified = getattr(proposal.local.local_profile, 'is_verified', False) if proposal.local.local_profile else False

        return proposal_response

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating proposal: {str(e)}"
        )

@router.get("/proposals/{proposal_id}", response_model=ItineraryProposalResponse)
async def get_itinerary_proposal(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific itinerary proposal"""
    try:
        stmt = (
            select(ItineraryProposal)
            .options(
                selectinload(ItineraryProposal.local),
                selectinload(ItineraryProposal.request)
            )
            .where(ItineraryProposal.id == proposal_id)
        )

        result = await db.execute(stmt)
        proposal = result.scalar_one_or_none()

        if not proposal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Itinerary proposal not found"
            )

        # Check permissions
        if (proposal.local_id != current_user.id and
            proposal.request.traveler_id != current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Create response
        proposal_response = ItineraryProposalResponse.from_orm(proposal)
        proposal_response.price_per_person = proposal.price_per_person
        proposal_response.duration_days = proposal.duration_days
        proposal_response.local_name = proposal.local.full_name
        proposal_response.local_avatar = proposal.local.profile_picture_url
        proposal_response.local_rating = getattr(proposal.local.local_profile, 'average_rating', None) if proposal.local.local_profile else None
        proposal_response.local_verified = getattr(proposal.local.local_profile, 'is_verified', False) if proposal.local.local_profile else False

        return proposal_response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching proposal: {str(e)}"
        )

@router.put("/proposals/{proposal_id}", response_model=ItineraryProposalResponse)
async def update_itinerary_proposal(
    proposal_id: UUID,
    proposal_data: ItineraryProposalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an itinerary proposal"""
    try:
        stmt = (
            select(ItineraryProposal)
            .options(selectinload(ItineraryProposal.local))
            .where(ItineraryProposal.id == proposal_id)
        )

        result = await db.execute(stmt)
        proposal = result.scalar_one_or_none()

        if not proposal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Itinerary proposal not found"
            )

        # Check permissions
        if not proposal.can_be_edited_by(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot edit this proposal"
            )

        # Update fields
        update_data = proposal_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(proposal, field, value)

        proposal.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(proposal)

        # Create response
        proposal_response = ItineraryProposalResponse.from_orm(proposal)
        proposal_response.price_per_person = proposal.price_per_person
        proposal_response.duration_days = proposal.duration_days
        proposal_response.local_name = proposal.local.full_name
        proposal_response.local_avatar = proposal.local.profile_picture_url
        proposal_response.local_rating = getattr(proposal.local.local_profile, 'average_rating', None) if proposal.local.local_profile else None
        proposal_response.local_verified = getattr(proposal.local.local_profile, 'is_verified', False) if proposal.local.local_profile else False

        return proposal_response

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating proposal: {str(e)}"
        )

@router.patch("/proposals/{proposal_id}/status", response_model=ItineraryProposalResponse)
async def update_proposal_status(
    proposal_id: UUID,
    status_update: ItineraryProposalStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update itinerary proposal status"""
    try:
        stmt = (
            select(ItineraryProposal)
            .options(
                selectinload(ItineraryProposal.local),
                selectinload(ItineraryProposal.request)
            )
            .where(ItineraryProposal.id == proposal_id)
        )

        result = await db.execute(stmt)
        proposal = result.scalar_one_or_none()

        if not proposal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Itinerary proposal not found"
            )

        # Check permissions based on status change
        if status_update.status == ProposalStatus.ACCEPTED:
            # Only traveler can accept proposals
            if proposal.request.traveler_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the traveler can accept proposals"
                )
        elif status_update.status == ProposalStatus.SUBMITTED:
            # Only local can submit proposals
            if proposal.local_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the local guide can submit proposals"
                )
        elif status_update.status in [ProposalStatus.WITHDRAWN, ProposalStatus.DECLINED]:
            # Local can withdraw, traveler can decline
            if (status_update.status == ProposalStatus.WITHDRAWN and proposal.local_id != current_user.id) or \
               (status_update.status == ProposalStatus.DECLINED and proposal.request.traveler_id != current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )

        # Get old status for notification
        old_status = proposal.status

        # Update status
        proposal.status = status_update.status

        if status_update.status == ProposalStatus.SUBMITTED:
            proposal.submitted_at = datetime.utcnow()
        elif status_update.status == ProposalStatus.ACCEPTED:
            proposal.accepted_at = datetime.utcnow()
            # Also update the request status and assign the local
            proposal.request.status = ItineraryRequestStatus.ACCEPTED
            proposal.request.local_id = proposal.local_id
        elif status_update.status in [ProposalStatus.UNDER_REVIEW]:
            proposal.reviewed_at = datetime.utcnow()

        await db.commit()
        await db.refresh(proposal)

        # Send notification if status changed
        if old_status != status_update.status:
            await NotificationService.notify_proposal_status_changed(
                proposal_id=str(proposal.id),
                request_id=str(proposal.request_id),
                local_id=str(proposal.local_id),
                traveler_id=str(proposal.request.traveler_id),
                proposal_title=proposal.title,
                old_status=old_status.value,
                new_status=status_update.status.value
            )

        # Create response
        proposal_response = ItineraryProposalResponse.from_orm(proposal)
        proposal_response.price_per_person = proposal.price_per_person
        proposal_response.duration_days = proposal.duration_days
        proposal_response.local_name = proposal.local.full_name
        proposal_response.local_avatar = proposal.local.profile_picture_url
        proposal_response.local_rating = getattr(proposal.local.local_profile, 'average_rating', None) if proposal.local.local_profile else None
        proposal_response.local_verified = getattr(proposal.local.local_profile, 'is_verified', False) if proposal.local.local_profile else False

        return proposal_response

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating status: {str(e)}"
        )

@router.delete("/proposals/{proposal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_itinerary_proposal(
    proposal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an itinerary proposal"""
    try:
        stmt = select(ItineraryProposal).where(ItineraryProposal.id == proposal_id)
        result = await db.execute(stmt)
        proposal = result.scalar_one_or_none()

        if not proposal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Itinerary proposal not found"
            )

        # Check permissions
        if proposal.local_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Only allow deletion of draft or withdrawn proposals
        if proposal.status not in [ProposalStatus.DRAFT, ProposalStatus.WITHDRAWN]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete proposal in current status"
            )

        await db.delete(proposal)
        await db.commit()

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting proposal: {str(e)}"
        )

# ===== LOCAL GUIDE SPECIFIC ENDPOINTS =====

@router.get("/my-proposals", response_model=ItineraryProposalListResponse)
async def get_my_proposals(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None, description="Filter by proposal status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all proposals created by the current local guide"""
    try:
        # Verify user is a local guide
        if current_user.role != 'local':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only local guides can access this endpoint"
            )

        # Build query
        stmt = (
            select(ItineraryProposal)
            .options(
                selectinload(ItineraryProposal.local),
                selectinload(ItineraryProposal.request)
            )
            .where(ItineraryProposal.local_id == current_user.id)
        )

        # Apply status filter
        if status:
            stmt = stmt.where(ItineraryProposal.status == status)

        # Add ordering and pagination
        stmt = stmt.order_by(desc(ItineraryProposal.created_at)).limit(limit).offset(offset)

        result = await db.execute(stmt)
        proposals = result.scalars().all()

        # Get total count
        count_stmt = select(func.count(ItineraryProposal.id)).where(ItineraryProposal.local_id == current_user.id)
        if status:
            count_stmt = count_stmt.where(ItineraryProposal.status == status)

        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Convert to response format
        proposal_responses = []
        for proposal in proposals:
            proposal_response = ItineraryProposalResponse.from_orm(proposal)
            proposal_response.price_per_person = proposal.price_per_person
            proposal_response.duration_days = proposal.duration_days
            proposal_response.local_name = proposal.local.full_name
            proposal_response.local_avatar = proposal.local.profile_picture_url
            proposal_response.local_rating = getattr(proposal.local.local_profile, 'average_rating', None) if proposal.local.local_profile else None
            proposal_response.local_verified = getattr(proposal.local.local_profile, 'is_verified', False) if proposal.local.local_profile else False

            proposal_responses.append(proposal_response)

        return ItineraryProposalListResponse(
            proposals=proposal_responses,
            total=total,
            has_more=(offset + len(proposals)) < total
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching proposals: {str(e)}"
        )

@router.get("/available-requests", response_model=ItineraryRequestListResponse)
async def get_available_requests_for_locals(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    destination_city: Optional[str] = Query(None, description="Filter by destination city"),
    destination_country: Optional[str] = Query(None, description="Filter by destination country"),
    budget_min: Optional[int] = Query(None, description="Minimum budget filter"),
    budget_max: Optional[int] = Query(None, description="Maximum budget filter"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get available itinerary requests that locals can respond to"""
    try:
        # Verify user is a local guide
        if current_user.role != 'local':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only local guides can access this endpoint"
            )

        # Build base query - only show public requests that can receive proposals
        stmt = (
            select(ItineraryRequest)
            .options(
                selectinload(ItineraryRequest.traveler),
                selectinload(ItineraryRequest.proposals)
            )
            .where(
                and_(
                    ItineraryRequest.is_public == True,
                    ItineraryRequest.status.in_([
                        ItineraryRequestStatus.PENDING,
                        ItineraryRequestStatus.ACTIVE
                    ])
                )
            )
        )

        # Apply filters
        conditions = []

        if destination_city:
            conditions.append(ItineraryRequest.destination_city.ilike(f"%{destination_city}%"))

        if destination_country:
            conditions.append(ItineraryRequest.destination_country.ilike(f"%{destination_country}%"))

        if budget_min:
            conditions.append(ItineraryRequest.budget_max >= budget_min)

        if budget_max:
            conditions.append(ItineraryRequest.budget_min <= budget_max)

        if conditions:
            stmt = stmt.where(and_(*conditions))

        # Add ordering and pagination
        stmt = stmt.order_by(desc(ItineraryRequest.created_at)).limit(limit).offset(offset)

        result = await db.execute(stmt)
        requests = result.scalars().all()

        # Get total count
        count_stmt = select(func.count(ItineraryRequest.id)).where(
            and_(
                ItineraryRequest.is_public == True,
                ItineraryRequest.status.in_([
                    ItineraryRequestStatus.PENDING,
                    ItineraryRequestStatus.ACTIVE
                ])
            )
        )
        if conditions:
            count_stmt = count_stmt.where(and_(*conditions))

        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Convert to response format and check if local already has a proposal
        request_responses = []
        for request in requests:
            request_response = ItineraryRequestResponse.from_orm(request)
            request_response.duration_days = request.duration_days
            request_response.proposal_count = request.proposal_count
            request_response.traveler_name = request.traveler.full_name
            request_response.traveler_avatar = request.traveler.profile_picture_url

            # Check if current local already has a proposal for this request
            existing_proposal = None
            for proposal in request.proposals:
                if proposal.local_id == current_user.id:
                    existing_proposal = proposal
                    break

            # Add custom field to indicate if local can create proposal
            request_response.can_propose = existing_proposal is None
            if existing_proposal:
                request_response.my_proposal_id = str(existing_proposal.id)
                request_response.my_proposal_status = existing_proposal.status.value

            request_responses.append(request_response)

        return ItineraryRequestListResponse(
            requests=request_responses,
            total=total,
            has_more=(offset + len(requests)) < total
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching available requests: {str(e)}"
        )