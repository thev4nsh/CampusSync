"""add class and student batch fields

Revision ID: 0014_class_student_batch_fields
Revises: 0013_teacher_extra_departments
Create Date: 2026-11-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0014_class_student_batch_fields"
down_revision: Union[str, None] = "0013_teacher_extra_departments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_batch_reference(table_name: str) -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    column_names = {column["name"] for column in inspector.get_columns(table_name)}
    if "batch_id" not in column_names:
        op.add_column(table_name, sa.Column("batch_id", sa.Integer(), nullable=True))

    inspector = sa.inspect(bind)
    has_batch_fk = any(
        fk.get("referred_table") == "batches" and fk.get("constrained_columns") == ["batch_id"]
        for fk in inspector.get_foreign_keys(table_name)
    )
    if not has_batch_fk:
        op.create_foreign_key(
            f"fk_{table_name}_batch_id_batches",
            table_name,
            "batches",
            ["batch_id"],
            ["id"],
            ondelete="SET NULL",
        )

    index_name = f"ix_{table_name}_batch_id"
    index_names = {index["name"] for index in inspector.get_indexes(table_name)}
    if index_name not in index_names:
        op.create_index(index_name, table_name, ["batch_id"])


def upgrade() -> None:
    _add_batch_reference("classes")
    _add_batch_reference("students")

    bind = op.get_bind()
    student_columns = {column["name"] for column in sa.inspect(bind).get_columns("students")}
    if "roll_number" not in student_columns:
        op.add_column("students", sa.Column("roll_number", sa.String(length=30), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    for table_name in ("students", "classes"):
        inspector = sa.inspect(bind)
        fk = next((
            item for item in inspector.get_foreign_keys(table_name)
            if item.get("referred_table") == "batches" and item.get("constrained_columns") == ["batch_id"]
        ), None)
        if fk and fk.get("name"):
            op.drop_constraint(fk["name"], table_name, type_="foreignkey")

        index_name = f"ix_{table_name}_batch_id"
        index_names = {index["name"] for index in sa.inspect(bind).get_indexes(table_name)}
        if index_name in index_names:
            op.drop_index(index_name, table_name=table_name)

        column_names = {column["name"] for column in sa.inspect(bind).get_columns(table_name)}
        if "batch_id" in column_names:
            op.drop_column(table_name, "batch_id")

    student_columns = {column["name"] for column in sa.inspect(bind).get_columns("students")}
    if "roll_number" in student_columns:
        op.drop_column("students", "roll_number")
