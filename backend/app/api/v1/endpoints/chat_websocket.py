from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.websockets import WebSocketState
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.dependencies import get_current_user_websocket
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message, MessageStatus
from typing import Dict, Set, List, Optional
import json
import asyncio
import logging
from datetime import datetime
from uuid import UUID

logger = logging.getLogger(__name__)

# Global connection manager
class ConnectionManager:
    def __init__(self):
        # user_id -> set of websockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # conversation_id -> set of user_ids
        self.conversation_participants: Dict[str, Set[str]] = {}
        # user_id -> typing status per conversation
        self.typing_status: Dict[str, Dict[str, bool]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, conversation_id: str):
        """Connect a user to a conversation"""
        await websocket.accept()

        # Add user connection
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

        # Add user to conversation participants
        if conversation_id not in self.conversation_participants:
            self.conversation_participants[conversation_id] = set()
        self.conversation_participants[conversation_id].add(user_id)

        # Initialize typing status
        if user_id not in self.typing_status:
            self.typing_status[user_id] = {}

        logger.info(f"User {user_id} connected to conversation {conversation_id}")

    async def disconnect(self, websocket: WebSocket, user_id: str, conversation_id: str):
        """Disconnect a user from a conversation"""
        # Remove websocket from user's connections
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

        # Remove user from conversation if no more connections
        if user_id not in self.active_connections:
            if conversation_id in self.conversation_participants:
                self.conversation_participants[conversation_id].discard(user_id)
                if not self.conversation_participants[conversation_id]:
                    del self.conversation_participants[conversation_id]

            # Clear typing status
            if user_id in self.typing_status and conversation_id in self.typing_status[user_id]:
                del self.typing_status[user_id][conversation_id]
                # Notify others that user stopped typing
                await self.broadcast_typing_status(conversation_id, user_id, False)

        logger.info(f"User {user_id} disconnected from conversation {conversation_id}")

    async def send_personal_message(self, message: dict, user_id: str):
        """Send message to all connections of a specific user"""
        if user_id in self.active_connections:
            dead_connections = []
            for websocket in self.active_connections[user_id]:
                try:
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_text(json.dumps(message))
                    else:
                        dead_connections.append(websocket)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    dead_connections.append(websocket)

            # Clean up dead connections
            for websocket in dead_connections:
                self.active_connections[user_id].discard(websocket)

    async def broadcast_to_conversation(self, message: dict, conversation_id: str, exclude_user: str = None):
        """Broadcast message to all participants in a conversation"""
        if conversation_id in self.conversation_participants:
            for user_id in self.conversation_participants[conversation_id]:
                if exclude_user and user_id == exclude_user:
                    continue
                await self.send_personal_message(message, user_id)

    async def broadcast_typing_status(self, conversation_id: str, user_id: str, is_typing: bool):
        """Broadcast typing status to conversation participants"""
        # Update typing status
        if user_id in self.typing_status:
            self.typing_status[user_id][conversation_id] = is_typing

        # Broadcast to other participants
        message = {
            "type": "typing_status",
            "user_id": user_id,
            "conversation_id": conversation_id,
            "is_typing": is_typing,
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.broadcast_to_conversation(message, conversation_id, exclude_user=user_id)

    def get_conversation_participants(self, conversation_id: str) -> List[str]:
        """Get list of users currently connected to a conversation"""
        return list(self.conversation_participants.get(conversation_id, set()))

manager = ConnectionManager()

router = APIRouter()

@router.websocket("/ws/chats/{conversation_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    conversation_id: str,
    token: str = None,
    db: AsyncSession = Depends(get_db)
):
    """WebSocket endpoint for real-time chat"""
    user = None

    try:
        # Authenticate user
        if not token:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
            return

        user = await get_current_user_websocket(token, db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            return

        # Verify user is participant in conversation
        conversation_stmt = (
            select(Conversation)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    or_(
                        Conversation.traveler_id == user.id,
                        Conversation.local_id == user.id
                    ),
                    Conversation.is_active == True
                )
            )
        )
        conversation_result = await db.execute(conversation_stmt)
        conversation = conversation_result.scalar_one_or_none()

        if not conversation:
            await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA, reason="Conversation not found")
            return

        # Connect user
        await manager.connect(websocket, str(user.id), conversation_id)

        # Send connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "conversation_id": conversation_id,
            "user_id": str(user.id),
            "timestamp": datetime.utcnow().isoformat()
        }))

        # Main message loop
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message_data = json.loads(data)

                await handle_websocket_message(message_data, user, conversation, db, websocket)

            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for user {user.id}")
                break
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from user {user.id}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
            except Exception as e:
                logger.error(f"Error handling websocket message: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Internal server error"
                }))

    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")

    finally:
        if user:
            await manager.disconnect(websocket, str(user.id), conversation_id)

async def handle_websocket_message(
    message_data: dict,
    user: User,
    conversation: Conversation,
    db: AsyncSession,
    websocket: WebSocket
):
    """Handle different types of WebSocket messages"""
    message_type = message_data.get("type")

    if message_type == "send_message":
        await handle_send_message(message_data, user, conversation, db)

    elif message_type == "typing_start":
        await manager.broadcast_typing_status(str(conversation.id), str(user.id), True)

    elif message_type == "typing_stop":
        await manager.broadcast_typing_status(str(conversation.id), str(user.id), False)

    elif message_type == "mark_as_read":
        await handle_mark_as_read(message_data, user, conversation, db)

    elif message_type == "ping":
        # Heartbeat/keepalive
        await websocket.send_text(json.dumps({
            "type": "pong",
            "timestamp": datetime.utcnow().isoformat()
        }))

    else:
        logger.warning(f"Unknown message type: {message_type}")
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": f"Unknown message type: {message_type}"
        }))

async def handle_send_message(
    message_data: dict,
    user: User,
    conversation: Conversation,
    db: AsyncSession
):
    """Handle sending a new message"""
    try:
        content = message_data.get("content", "").strip()
        if not content:
            return

        # Create new message in database
        message = Message(
            conversation_id=conversation.id,
            sender_id=user.id,
            content=content,
            message_type=message_data.get("message_type", "text")
        )

        db.add(message)
        await db.flush()  # Get the message ID

        # Update conversation last message info
        conversation.last_message_at = message.created_at
        conversation.last_message_content = content[:100]
        conversation.last_message_sender_id = user.id

        await db.commit()
        await db.refresh(message)

        # Broadcast message to conversation participants
        message_payload = {
            "type": "new_message",
            "message": {
                "id": str(message.id),
                "conversation_id": str(conversation.id),
                "sender_id": str(user.id),
                "content": content,
                "message_type": message.message_type.value,
                "status": message.status.value,
                "is_edited": message.is_edited,
                "created_at": message.created_at.isoformat(),
                "sender_name": user.full_name,
                "sender_avatar": user.profile_picture_url
            },
            "timestamp": datetime.utcnow().isoformat()
        }

        await manager.broadcast_to_conversation(
            message_payload,
            str(conversation.id)
        )

    except Exception as e:
        logger.error(f"Error sending message: {e}")
        await db.rollback()

async def handle_mark_as_read(
    message_data: dict,
    user: User,
    conversation: Conversation,
    db: AsyncSession
):
    """Handle marking messages as read"""
    try:
        message_ids = message_data.get("message_ids", [])
        if not message_ids:
            return

        # Mark messages as read
        from sqlalchemy import update
        stmt = (
            update(Message)
            .where(
                and_(
                    Message.id.in_([UUID(mid) for mid in message_ids]),
                    Message.conversation_id == conversation.id,
                    Message.sender_id != user.id,  # Can't mark own messages as read
                    Message.status != MessageStatus.READ
                )
            )
            .values(
                status=MessageStatus.READ,
                read_at=datetime.utcnow()
            )
        )
        await db.execute(stmt)
        await db.commit()

        # Broadcast read status to conversation participants
        read_payload = {
            "type": "messages_read",
            "message_ids": message_ids,
            "reader_id": str(user.id),
            "conversation_id": str(conversation.id),
            "timestamp": datetime.utcnow().isoformat()
        }

        await manager.broadcast_to_conversation(
            read_payload,
            str(conversation.id),
            exclude_user=str(user.id)
        )

    except Exception as e:
        logger.error(f"Error marking messages as read: {e}")
        await db.rollback()