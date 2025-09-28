from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_, desc, func
from sqlalchemy.orm import selectinload, joinedload
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.itinerary_request import ItineraryRequest, ItineraryRequestStatus
from app.models.itinerary_proposal import ItineraryProposal, ProposalStatus
from app.schemas.itinerary import (
    ItineraryRequestCreate, ItineraryRequestUpdate, ItineraryRequestResponse,
    ItineraryProposalCreate, ItineraryProposalUpdate, ItineraryProposalResponse,
    ItineraryRequestListResponse, ItineraryProposalListResponse,
    ItineraryRequestStatusUpdate, ItineraryProposalStatusUpdate,
    ItineraryRequestFilters
)
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.core.notifications import NotificationService

router = APIRouter()

# ===== ITINERARY REQUESTS =====

@router.get("/requests", response_model=ItineraryRequestListResponse)
async def get_itinerary_requests(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None, description="Filter by status"),
    destination_city: Optional[str] = Query(None, description="Filter by destination city"),
    destination_country: Optional[str] = Query(None, description="Filter by destination country"),
    my_requests_only: bool = Query(False, description="Show only current user's requests"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get itinerary requests with filtering and pagination"""
    try:
        # Build base query
        stmt = (
            select(ItineraryRequest)
            .options(
                selectinload(ItineraryRequest.traveler),
                selectinload(ItineraryRequest.local),
                selectinload(ItineraryRequest.proposals)
            )
        )

        # Apply filters
        conditions = []

        if my_requests_only:
            conditions.append(ItineraryRequest.traveler_id == current_user.id)
        else:
            # For non-owner requests, only show public requests
            if current_user.role == 'local':
                conditions.append(
                    or_(
                        ItineraryRequest.traveler_id == current_user.id,
                        ItineraryRequest.is_public == True
                    )
                )
            else:
                conditions.append(ItineraryRequest.traveler_id == current_user.id)

        if status:
            conditions.append(ItineraryRequest.status == status)

        if destination_city:
            conditions.append(ItineraryRequest.destination_city.ilike(f"%{destination_city}%"))

        if destination_country:
            conditions.append(ItineraryRequest.destination_country.ilike(f"%{destination_country}%"))

        if conditions:
            stmt = stmt.where(and_(*conditions))

        # Add ordering and pagination
        stmt = stmt.order_by(desc(ItineraryRequest.created_at)).limit(limit).offset(offset)

        result = await db.execute(stmt)
        requests = result.scalars().all()

        # Get total count
        count_stmt = select(func.count(ItineraryRequest.id))
        if conditions:
            count_stmt = count_stmt.where(and_(*conditions))

        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Convert to response format
        request_responses = []
        for request in requests:
            request_response = ItineraryRequestResponse.from_orm(request)
            request_response.duration_days = request.duration_days
            request_response.proposal_count = request.proposal_count
            request_response.traveler_name = request.traveler.full_name
            request_response.traveler_avatar = request.traveler.profile_picture_url

            if request.local:
                request_response.local_name = request.local.full_name
                request_response.local_avatar = request.local.profile_picture_url

            request_responses.append(request_response)

        return ItineraryRequestListResponse(
            requests=request_responses,
            total=total,
            has_more=(offset + len(requests)) < total
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching requests: {str(e)}"
        )

@router.post("/requests", response_model=ItineraryRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_itinerary_request(
    request_data: ItineraryRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new itinerary request"""
    try:
        # Create new request
        request = ItineraryRequest(
            traveler_id=current_user.id,
            **request_data.dict()
        )

        db.add(request)
        await db.flush()
        await db.refresh(request)

        # Load relationships
        await db.refresh(request, ['traveler'])

        await db.commit()

        # Send notification
        await NotificationService.notify_request_created(
            request_id=str(request.id),
            traveler_id=str(current_user.id),
            request_title=request.title
        )

        # Create response
        request_response = ItineraryRequestResponse.from_orm(request)
        request_response.duration_days = request.duration_days
        request_response.proposal_count = 0
        request_response.traveler_name = request.traveler.full_name
        request_response.traveler_avatar = request.traveler.profile_picture_url

        return request_response

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating request: {str(e)}"
        )

@router.get("/requests/{request_id}", response_model=ItineraryRequestResponse)
async def get_itinerary_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific itinerary request"""
    try:
        stmt = (
            select(ItineraryRequest)
            .options(
                selectinload(ItineraryRequest.traveler),
                selectinload(ItineraryRequest.local),
                selectinload(ItineraryRequest.proposals)
            )
            .where(ItineraryRequest.id == request_id)
        )

        result = await db.execute(stmt)
        request = result.scalar_one_or_none()

        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Itinerary request not found"
            )

        # Check permissions
        if (request.traveler_id != current_user.id and
            not request.is_public and
            current_user.role != 'local'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Create response
        request_response = ItineraryRequestResponse.from_orm(request)
        request_response.duration_days = request.duration_days
        request_response.proposal_count = request.proposal_count
        request_response.traveler_name = request.traveler.full_name
        request_response.traveler_avatar = request.traveler.profile_picture_url

        if request.local:
            request_response.local_name = request.local.full_name
            request_response.local_avatar = request.local.profile_picture_url

        return request_response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching request: {str(e)}"
        )

@router.put("/requests/{request_id}", response_model=ItineraryRequestResponse)
async def update_itinerary_request(
    request_id: UUID,
    request_data: ItineraryRequestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an itinerary request"""
    try:
        stmt = (
            select(ItineraryRequest)
            .options(selectinload(ItineraryRequest.traveler))
            .where(ItineraryRequest.id == request_id)
        )

        result = await db.execute(stmt)
        request = result.scalar_one_or_none()

        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Itinerary request not found"
            )

        # Check permissions
        if not request.can_be_edited_by(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot edit this request"
            )

        # Update fields
        update_data = request_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(request, field, value)

        request.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(request)

        # Create response
        request_response = ItineraryRequestResponse.from_orm(request)
        request_response.duration_days = request.duration_days
        request_response.proposal_count = request.proposal_count
        request_response.traveler_name = request.traveler.full_name
        request_response.traveler_avatar = request.traveler.profile_picture_url

        return request_response

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating request: {str(e)}"
        )

@router.patch("/requests/{request_id}/status", response_model=ItineraryRequestResponse)
async def update_request_status(
    request_id: UUID,
    status_update: ItineraryRequestStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update itinerary request status"""
    try:
        stmt = (
            select(ItineraryRequest)
            .options(selectinload(ItineraryRequest.traveler))
            .where(ItineraryRequest.id == request_id)
        )

        result = await db.execute(stmt)
        request = result.scalar_one_or_none()

        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Itinerary request not found"
            )

        # Check permissions
        if request.traveler_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Get old status for notification
        old_status = request.status

        # Update status
        request.status = status_update.status
        if status_update.status == ItineraryRequestStatus.PENDING:
            request.submitted_at = datetime.utcnow()
        elif status_update.status == ItineraryRequestStatus.COMPLETED:
            request.completed_at = datetime.utcnow()

        await db.commit()
        await db.refresh(request)

        # Send notification if status changed
        if old_status != status_update.status:
            await NotificationService.notify_request_status_changed(
                request_id=str(request.id),
                traveler_id=str(request.traveler_id),
                request_title=request.title,
                old_status=old_status.value,
                new_status=status_update.status.value
            )

        # Create response
        request_response = ItineraryRequestResponse.from_orm(request)
        request_response.duration_days = request.duration_days
        request_response.proposal_count = request.proposal_count
        request_response.traveler_name = request.traveler.full_name
        request_response.traveler_avatar = request.traveler.profile_picture_url

        return request_response

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while updating status: {str(e)}"
        )

@router.delete("/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_itinerary_request(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an itinerary request"""
    try:
        stmt = select(ItineraryRequest).where(ItineraryRequest.id == request_id)
        result = await db.execute(stmt)
        request = result.scalar_one_or_none()

        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Itinerary request not found"
            )

        # Check permissions
        if request.traveler_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Only allow deletion of draft or cancelled requests
        if request.status not in [ItineraryRequestStatus.DRAFT, ItineraryRequestStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete request in current status"
            )

        await db.delete(request)
        await db.commit()

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while deleting request: {str(e)}"
        )

# ===== ITINERARY PROPOSALS =====

@router.get("/requests/{request_id}/proposals", response_model=ItineraryProposalListResponse)
async def get_request_proposals(
    request_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get proposals for a specific itinerary request"""
    try:
        # Check if request exists and user has access
        request_stmt = select(ItineraryRequest).where(ItineraryRequest.id == request_id)
        request_result = await db.execute(request_stmt)
        request = request_result.scalar_one_or_none()

        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Itinerary request not found"
            )

        # Check permissions
        if (request.traveler_id != current_user.id and
            not request.is_public and
            current_user.role != 'local'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Get proposals
        stmt = (
            select(ItineraryProposal)
            .options(
                selectinload(ItineraryProposal.local),
                selectinload(ItineraryProposal.request)
            )
            .where(ItineraryProposal.request_id == request_id)
            .order_by(desc(ItineraryProposal.created_at))
            .limit(limit)
            .offset(offset)
        )

        result = await db.execute(stmt)
        proposals = result.scalars().all()

        # Get total count
        count_stmt = (
            select(func.count(ItineraryProposal.id))
            .where(ItineraryProposal.request_id == request_id)
        )
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