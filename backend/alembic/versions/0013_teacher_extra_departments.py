"""add additional teacher departments

Revision ID: 0013_teacher_extra_departments
Revises: 0012_face_attendance
Create Date: 2026-11-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0013_teacher_extra_departments"
down_revision: Union[str, None] = "0012_face_attendance"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("teachers")}
    if "extra_departments" not in columns:
        op.add_column("teachers", sa.Column("extra_departments", sa.String(length=400), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("teachers")}
    if "extra_departments" in columns:
        op.drop_column("teachers", "extra_departments")
