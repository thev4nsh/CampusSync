"""require device credentials for attendance ingestion

Revision ID: 0008_device_credentials
Revises: 0007_auth_sessions
Create Date: 2026-10-26
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0008_device_credentials"
down_revision: Union[str, None] = "0007_auth_sessions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("devices", sa.Column("api_key_hash", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("devices", "api_key_hash")
