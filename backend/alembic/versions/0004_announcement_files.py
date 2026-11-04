"""support common document attachments on announcements

Revision ID: 0004_announcement_files
Revises: 0003_announcements
Create Date: 2026-10-25
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0004_announcement_files"
down_revision: Union[str, None] = "0003_announcements"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("course_announcements", sa.Column("file_path", sa.String(length=500), nullable=True))
    op.add_column("course_announcements", sa.Column("file_name", sa.String(length=255), nullable=True))
    op.add_column("course_announcements", sa.Column("file_content_type", sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column("course_announcements", "file_content_type")
    op.drop_column("course_announcements", "file_name")
    op.drop_column("course_announcements", "file_path")
