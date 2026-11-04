"""support YouTube links and caption transcripts in classwork

Revision ID: 0011_youtube_captions
Revises: 0010_ai_usage_limits
Create Date: 2026-11-04
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0011_youtube_captions"
down_revision: Union[str, None] = "0010_ai_usage_limits"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("course_materials", sa.Column("source_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("course_materials", "source_url")
