"""track daily AI requests per user

Revision ID: 0010_ai_usage_limits
Revises: 0009_institution_scoping
Create Date: 2026-11-04
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0010_ai_usage_limits"
down_revision: Union[str, None] = "0009_institution_scoping"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_usage_daily",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("usage_date", sa.Date(), nullable=False),
        sa.Column("request_count", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "usage_date", name="uq_ai_usage_user_date"),
    )
    op.create_index("ix_ai_usage_daily_user_id", "ai_usage_daily", ["user_id"], unique=False)
    op.create_index("ix_ai_usage_daily_usage_date", "ai_usage_daily", ["usage_date"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_ai_usage_daily_usage_date", table_name="ai_usage_daily")
    op.drop_index("ix_ai_usage_daily_user_id", table_name="ai_usage_daily")
    op.drop_table("ai_usage_daily")
