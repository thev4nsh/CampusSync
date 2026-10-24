"""add text course materials

Revision ID: 0002_course_materials
Revises: 0001_initial_schema
Create Date: 2026-10-25
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002_course_materials"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "course_materials",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_type", sa.String(length=30), nullable=False),
        sa.Column("class_id", sa.Integer(), nullable=False),
        sa.Column("subject_id", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.String(length=50), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("summary_version", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_course_materials_id", "course_materials", ["id"], unique=False)
    op.create_index("ix_course_materials_class_id", "course_materials", ["class_id"], unique=False)
    op.create_index("ix_course_materials_subject_id", "course_materials", ["subject_id"], unique=False)
    op.create_index("ix_course_materials_teacher_id", "course_materials", ["teacher_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_course_materials_teacher_id", table_name="course_materials")
    op.drop_index("ix_course_materials_subject_id", table_name="course_materials")
    op.drop_index("ix_course_materials_class_id", table_name="course_materials")
    op.drop_index("ix_course_materials_id", table_name="course_materials")
    op.drop_table("course_materials")
