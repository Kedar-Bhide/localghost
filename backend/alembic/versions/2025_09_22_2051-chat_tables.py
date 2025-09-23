"""Add conversations and messages tables for chat system

Revision ID: 2025_09_22_2051_chat
Revises: 3dda9c1e9498
Create Date: 2025-09-22 20:51:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2025_09_22_2051_chat'
down_revision: Union[str, Sequence[str], None] = '3dda9c1e9498'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add conversations and messages tables"""

    # Create conversations table
    op.create_table('conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('traveler_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('local_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('last_message_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('last_message_content', sa.Text(), nullable=True),
        sa.Column('last_message_sender_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('traveler_archived', sa.Boolean(), nullable=True, default=False),
        sa.Column('local_archived', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['local_id'], ['profiles.id'], ),
        sa.ForeignKeyConstraint(['last_message_sender_id'], ['profiles.id'], ),
        sa.ForeignKeyConstraint(['traveler_id'], ['profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create message type and status enums (if they don't exist)
    try:
        message_type_enum = postgresql.ENUM('text', 'system', 'booking_request', 'booking_confirmation', name='messagetype')
        message_type_enum.create(op.get_bind())
    except Exception:
        # Enum already exists
        message_type_enum = postgresql.ENUM(name='messagetype')

    try:
        message_status_enum = postgresql.ENUM('sent', 'delivered', 'read', name='messagestatus')
        message_status_enum.create(op.get_bind())
    except Exception:
        # Enum already exists
        message_status_enum = postgresql.ENUM(name='messagestatus')

    # Create messages table
    op.create_table('messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', message_type_enum, nullable=False, default='text'),
        sa.Column('status', message_status_enum, nullable=False, default='sent'),
        sa.Column('is_edited', sa.Boolean(), nullable=True, default=False),
        sa.Column('edited_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ),
        sa.ForeignKeyConstraint(['sender_id'], ['profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for performance
    op.create_index('idx_conversations_participants', 'conversations', ['traveler_id', 'local_id'])
    op.create_index('idx_conversations_last_message', 'conversations', ['last_message_at'])
    op.create_index('idx_messages_conversation', 'messages', ['conversation_id'])
    op.create_index('idx_messages_created_at', 'messages', ['created_at'])
    op.create_index('idx_messages_status', 'messages', ['status'])


def downgrade() -> None:
    """Remove conversations and messages tables"""
    op.drop_index('idx_messages_status', table_name='messages')
    op.drop_index('idx_messages_created_at', table_name='messages')
    op.drop_index('idx_messages_conversation', table_name='messages')
    op.drop_index('idx_conversations_last_message', table_name='conversations')
    op.drop_index('idx_conversations_participants', table_name='conversations')

    op.drop_table('messages')
    op.drop_table('conversations')

    # Drop enums
    postgresql.ENUM(name='messagestatus').drop(op.get_bind())
    postgresql.ENUM(name='messagetype').drop(op.get_bind())