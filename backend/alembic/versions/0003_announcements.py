"""class announcements with private file attachment metadata

Revision ID: 0003_announcements
Revises: 0002_course_materials
Create Date: 2026-10-25
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003_announcements"
down_revision: Union[str, None] = "0002_course_materials"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.create_table(
        "course_announcements",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("class_id", sa.Integer(), nullable=False),
        sa.Column("subject_id", sa.Integer(), nullable=True),
        sa.Column("teacher_id", sa.String(length=50), nullable=False),
        sa.Column("priority", sa.String(length=20), server_default="normal", nullable=False),
        sa.Column("is_alert", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("link_url", sa.Text(), nullable=True),
        sa.Column("link_label", sa.String(length=120), nullable=True),
        sa.Column("pdf_path", sa.String(length=500), nullable=True),
        sa.Column("pdf_filename", sa.String(length=255), nullable=True),
        sa.Column("poster_path", sa.String(length=500), nullable=True),
        sa.Column("poster_filename", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_course_announcements_class_id", "course_announcements", ["class_id"])
    op.create_index("ix_course_announcements_subject_id", "course_announcements", ["subject_id"])
    op.create_index("ix_course_announcements_teacher_id", "course_announcements", ["teacher_id"])


def downgrade() -> None:
    op.drop_index("ix_course_announcements_teacher_id", table_name="course_announcements")
    op.drop_index("ix_course_announcements_subject_id", table_name="course_announcements")
    op.drop_index("ix_course_announcements_class_id", table_name="course_announcements")
    op.drop_table("course_announcements")
