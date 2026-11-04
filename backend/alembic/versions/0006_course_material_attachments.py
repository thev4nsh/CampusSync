"""support private file attachments on class coursework

Revision ID: 0006_course_material_attachments
Revises: 0005_announcement_event_dates
Create Date: 2026-10-25
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0006_course_material_attachments"
down_revision: Union[str, None] = "0005_announcement_event_dates"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "course_material_attachments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("material_id", sa.String(length=36), nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=120), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["material_id"], ["course_materials.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_course_material_attachments_id", "course_material_attachments", ["id"])
    op.create_index("ix_course_material_attachments_material_id", "course_material_attachments", ["material_id"])


def downgrade() -> None:
    op.drop_index("ix_course_material_attachments_material_id", table_name="course_material_attachments")
    op.drop_index("ix_course_material_attachments_id", table_name="course_material_attachments")
    op.drop_table("course_material_attachments")
