"""bind campus records to an institution

Revision ID: 0009_institution_scoping
Revises: 0008_device_credentials
Create Date: 2026-11-04
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0009_institution_scoping"
down_revision: Union[str, None] = "0008_device_credentials"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TENANT_TABLES = (
    "users",
    "classes",
    "subjects",
    "teachers",
    "students",
    "teacher_subject_assignments",
    "course_materials",
    "course_material_attachments",
    "course_announcements",
    "attendance_sessions",
    "devices",
    "attendance_records",
    "rfid_cards",
    "biometric_identities",
    "system_settings",
)


def upgrade() -> None:
    op.create_table(
        "institutions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_institutions_id", "institutions", ["id"], unique=False)
    op.create_index("ix_institutions_slug", "institutions", ["slug"], unique=True)
    op.execute(
        "INSERT INTO institutions (id, name, slug, is_active) "
        "VALUES (1, 'CampusSync University', 'campus', TRUE)"
    )
    op.execute(
        "SELECT setval(pg_get_serial_sequence('institutions', 'id'), "
        "(SELECT COALESCE(MAX(id), 1) FROM institutions))"
    )

    for table in TENANT_TABLES:
        op.add_column(table, sa.Column("institution_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            f"fk_{table}_institution_id_institutions",
            table,
            "institutions",
            ["institution_id"],
            ["id"],
            ondelete="CASCADE",
        )
        op.execute(sa.text(f"UPDATE {table} SET institution_id = 1 WHERE institution_id IS NULL"))
        op.alter_column(table, "institution_id", existing_type=sa.Integer(), nullable=False)
        op.create_index(f"ix_{table}_institution_id", table, ["institution_id"], unique=False)

    # Names and subject codes are unique within a college, not across all colleges.
    op.drop_index("ix_classes_name", table_name="classes")
    op.create_unique_constraint("uq_classes_institution_name", "classes", ["institution_id", "name"])
    op.create_index("ix_classes_name", "classes", ["name"], unique=False)

    op.drop_index("ix_subjects_code", table_name="subjects")
    op.create_unique_constraint("uq_subjects_institution_code", "subjects", ["institution_id", "code"])
    op.create_index("ix_subjects_code", "subjects", ["code"], unique=False)

    op.drop_index("ix_system_settings_key", table_name="system_settings")
    op.create_unique_constraint(
        "uq_system_settings_institution_key", "system_settings", ["institution_id", "key"]
    )
    op.create_index("ix_system_settings_key", "system_settings", ["key"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_classes_name", table_name="classes")
    op.drop_constraint("uq_classes_institution_name", "classes", type_="unique")
    op.create_index("ix_classes_name", "classes", ["name"], unique=True)

    op.drop_index("ix_subjects_code", table_name="subjects")
    op.drop_constraint("uq_subjects_institution_code", "subjects", type_="unique")
    op.create_index("ix_subjects_code", "subjects", ["code"], unique=True)

    op.drop_index("ix_system_settings_key", table_name="system_settings")
    op.drop_constraint("uq_system_settings_institution_key", "system_settings", type_="unique")
    op.create_index("ix_system_settings_key", "system_settings", ["key"], unique=True)

    for table in reversed(TENANT_TABLES):
        op.drop_index(f"ix_{table}_institution_id", table_name=table)
        op.drop_constraint(f"fk_{table}_institution_id_institutions", table, type_="foreignkey")
        op.drop_column(table, "institution_id")

    op.drop_index("ix_institutions_slug", table_name="institutions")
    op.drop_index("ix_institutions_id", table_name="institutions")
    op.drop_table("institutions")
