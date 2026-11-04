"""add optional event date to class announcements

Revision ID: 0005_announcement_event_dates
Revises: 0004_announcement_files
Create Date: 2026-10-25
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0005_announcement_event_dates"
down_revision: Union[str, None] = "0004_announcement_files"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("course_announcements", sa.Column("event_date", sa.Date(), nullable=True))
    op.create_index("ix_course_announcements_event_date", "course_announcements", ["event_date"])


def downgrade() -> None:
    op.drop_index("ix_course_announcements_event_date", table_name="course_announcements")
    op.drop_column("course_announcements", "event_date")
