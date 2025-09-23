from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, insert, delete, and_, or_, desc, func
from sqlalchemy.orm import selectinload, joinedload
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message, MessageStatus
from app.schemas.chat import (
    ConversationCreate, ConversationResponse, MessageCreate, MessageUpdate,
    MessageResponse, ChatListResponse, MessageListResponse
)
from typing import List, Optional
from uuid import UUID
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=ChatListResponse)
async def get_conversations(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user's conversations with pagination"""
    try:
        # Build query for conversations where user is participant
        stmt = (
            select(Conversation)
            .options(
                selectinload(Conversation.traveler),
                selectinload(Conversation.local)
            )
            .where(
                and_(
                    or_(
                        Conversation.traveler_id == current_user.id,
                        Conversation.local_id == current_user.id
                    ),
                    Conversation.is_active == True,
                    # Check if conversation is not archived for current user
                    or_(
                        and_(
                            Conversation.traveler_id == current_user.id,
                            Conversation.traveler_archived == False
                        ),
                        and_(
                            Conversation.local_id == current_user.id,
                            Conversation.local_archived == False
                        )
                    )
                )
            )
            .order_by(desc(Conversation.last_message_at))
            .limit(limit)
            .offset(offset)
        )

        result = await db.execute(stmt)
        conversations = result.scalars().all()

        # Get total count
        count_stmt = (
            select(func.count(Conversation.id))
            .where(
                and_(
                    or_(
                        Conversation.traveler_id == current_user.id,
                        Conversation.local_id == current_user.id
                    ),
                    Conversation.is_active == True,
                    or_(
                        and_(
                            Conversation.traveler_id == current_user.id,
                            Conversation.traveler_archived == False
                        ),
                        and_(
                            Conversation.local_id == current_user.id,
                            Conversation.local_archived == False
                        )
                    )
                )
            )
        )
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Get unread counts for each conversation
        conversation_responses = []
        for conversation in conversations:
            # Count unread messages
            unread_stmt = (
                select(func.count(Message.id))
                .where(
                    and_(
                        Message.conversation_id == conversation.id,
                        Message.sender_id != current_user.id,
                        Message.status != MessageStatus.READ
                    )
                )
            )
            unread_result = await db.execute(unread_stmt)
            unread_count = unread_result.scalar() or 0

            other_participant = conversation.get_other_participant(current_user.id)
            conversation_response = ConversationResponse.from_orm_with_participant(
                conversation, current_user.id, other_participant, unread_count
            )
            conversation_responses.append(conversation_response)

        return ChatListResponse(
            conversations=conversation_responses,
            total=total,
            has_more=(offset + len(conversations)) < total
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching conversations: {str(e)}"
        )

@router.post("/", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new conversation with a local guide"""
    try:
        # Verify the local guide exists and is active
        local_stmt = select(User).where(
            and_(
                User.id == conversation_data.local_id,
                User.is_active == True,
                User.role == 'local'
            )
        )
        local_result = await db.execute(local_stmt)
        local_user = local_result.scalar_one_or_none()

        if not local_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Local guide not found or inactive"
            )

        # Check if conversation already exists
        existing_stmt = (
            select(Conversation)
            .where(
                and_(
                    Conversation.traveler_id == current_user.id,
                    Conversation.local_id == conversation_data.local_id,
                    Conversation.is_active == True
                )
            )
        )
        existing_result = await db.execute(existing_stmt)
        existing_conversation = existing_result.scalar_one_or_none()

        if existing_conversation:
            # Return existing conversation
            return ConversationResponse.from_orm_with_participant(
                existing_conversation, current_user.id, local_user
            )

        # Create new conversation
        conversation = Conversation(
            traveler_id=current_user.id,
            local_id=conversation_data.local_id,
            last_message_content=conversation_data.initial_message[:100],
            last_message_sender_id=current_user.id
        )

        db.add(conversation)
        await db.flush()  # Get the conversation ID

        # Create initial message
        initial_message = Message(
            conversation_id=conversation.id,
            sender_id=current_user.id,
            content=conversation_data.initial_message
        )

        db.add(initial_message)
        await db.commit()

        # Refresh to get relationships
        await db.refresh(conversation)

        return ConversationResponse.from_orm_with_participant(
            conversation, current_user.id, local_user
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating conversation: {str(e)}"
        )

@router.get("/{conversation_id}/messages", response_model=MessageListResponse)
async def get_messages(
    conversation_id: UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get messages in a conversation with pagination"""
    try:
        # Verify user is participant in conversation
        conversation_stmt = (
            select(Conversation)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    or_(
                        Conversation.traveler_id == current_user.id,
                        Conversation.local_id == current_user.id
                    )
                )
            )
        )
        conversation_result = await db.execute(conversation_stmt)
        conversation = conversation_result.scalar_one_or_none()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied"
            )

        # Get messages with sender information
        stmt = (
            select(Message)
            .options(selectinload(Message.sender))
            .where(Message.conversation_id == conversation_id)
            .order_by(desc(Message.created_at))
            .limit(limit)
            .offset(offset)
        )

        result = await db.execute(stmt)
        messages = result.scalars().all()

        # Get total count
        count_stmt = (
            select(func.count(Message.id))
            .where(Message.conversation_id == conversation_id)
        )
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Mark unread messages as read (for messages sent to current user)
        unread_messages_stmt = (
            select(Message.id)
            .where(
                and_(
                    Message.conversation_id == conversation_id,
                    Message.sender_id != current_user.id,
                    Message.status != MessageStatus.READ
                )
            )
        )
        unread_result = await db.execute(unread_messages_stmt)
        unread_message_ids = [row[0] for row in unread_result.fetchall()]

        if unread_message_ids:
            mark_read_stmt = (
                update(Message)
                .where(Message.id.in_(unread_message_ids))
                .values(status=MessageStatus.READ, read_at=func.now())
            )
            await db.execute(mark_read_stmt)
            await db.commit()

        # Convert to response format
        message_responses = [
            MessageResponse.from_orm_with_sender(message)
            for message in reversed(messages)  # Reverse to show oldest first
        ]

        return MessageListResponse(
            messages=message_responses,
            total=total,
            has_more=(offset + len(messages)) < total
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching messages: {str(e)}"
        )

@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: UUID,
    message_data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send a message in a conversation"""
    try:
        # Verify user is participant in conversation
        conversation_stmt = (
            select(Conversation)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    or_(
                        Conversation.traveler_id == current_user.id,
                        Conversation.local_id == current_user.id
                    ),
                    Conversation.is_active == True
                )
            )
        )
        conversation_result = await db.execute(conversation_stmt)
        conversation = conversation_result.scalar_one_or_none()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied"
            )

        # Create new message
        message = Message(
            conversation_id=conversation_id,
            sender_id=current_user.id,
            content=message_data.content,
            message_type=message_data.message_type
        )

        db.add(message)
        await db.flush()  # Get the message ID

        # Update conversation last message info
        update_conversation_stmt = (
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(
                last_message_at=func.now(),
                last_message_content=message_data.content[:100],
                last_message_sender_id=current_user.id
            )
        )
        await db.execute(update_conversation_stmt)
        await db.commit()

        # Refresh to get relationships
        await db.refresh(message)

        return MessageResponse.from_orm_with_sender(message, current_user)

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while sending message: {str(e)}"
        )

@router.put("/{conversation_id}/messages/{message_id}", response_model=MessageResponse)
async def edit_message(
    conversation_id: UUID,
    message_id: UUID,
    message_data: MessageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Edit a message (only by sender within 15 minutes)"""
    try:
        # Get message and verify ownership
        message_stmt = (
            select(Message)
            .options(selectinload(Message.sender))
            .where(
                and_(
                    Message.id == message_id,
                    Message.conversation_id == conversation_id,
                    Message.sender_id == current_user.id
                )
            )
        )
        message_result = await db.execute(message_stmt)
        message = message_result.scalar_one_or_none()

        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found or access denied"
            )

        # Check if message can still be edited (within 15 minutes)
        time_diff = datetime.utcnow() - message.created_at.replace(tzinfo=None)
        if time_diff.total_seconds() > 900:  # 15 minutes
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Messages can only be edited within 15 minutes of sending"
            )

        # Update message
        update_stmt = (
            update(Message)
            .where(Message.id == message_id)
            .values(
                content=message_data.content,
                is_edited=True,
                edited_at=func.now()
            )
        )
        await db.execute(update_stmt)
        await db.commit()

        # Refresh to get updated message
        await db.refresh(message)

        return MessageResponse.from_orm_with_sender(message)

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while editing message: {str(e)}"
        )

@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Archive a conversation for the current user"""
    try:
        # Get conversation and verify user is participant
        conversation_stmt = (
            select(Conversation)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    or_(
                        Conversation.traveler_id == current_user.id,
                        Conversation.local_id == current_user.id
                    )
                )
            )
        )
        conversation_result = await db.execute(conversation_stmt)
        conversation = conversation_result.scalar_one_or_none()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied"
            )

        # Archive conversation for current user
        if str(conversation.traveler_id) == str(current_user.id):
            update_field = {"traveler_archived": True}
        else:
            update_field = {"local_archived": True}

        update_stmt = (
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(**update_field)
        )
        await db.execute(update_stmt)
        await db.commit()

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while archiving conversation: {str(e)}"
        )