"""add encrypted, consented face templates

Revision ID: 0012_face_attendance
Revises: 0011_youtube_captions
Create Date: 2026-11-25
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0012_face_attendance"
down_revision: Union[str, None] = "0011_youtube_captions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("biometric_identities", sa.Column("face_templates_ciphertext", sa.Text(), nullable=True))
    op.add_column("biometric_identities", sa.Column("face_consent_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("biometric_identities", "face_consent_at")
    op.drop_column("biometric_identities", "face_templates_ciphertext")
