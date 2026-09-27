"""initial_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-08-24 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=150), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. classes table
    op.create_table(
        'classes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('year', sa.String(length=50), nullable=False),
        sa.Column('section', sa.String(length=10), nullable=False),
        sa.Column('department', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_classes_id'), 'classes', ['id'], unique=False)
    op.create_index(op.f('ix_classes_name'), 'classes', ['name'], unique=True)

    # 3. subjects table
    op.create_table(
        'subjects',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('department', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subjects_id'), 'subjects', ['id'], unique=False)
    op.create_index(op.f('ix_subjects_code'), 'subjects', ['code'], unique=True)

    # 4. teachers table
    op.create_table(
        'teachers',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('department', sa.String(length=100), nullable=False),
        sa.Column('phone', sa.String(length=25), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_teachers_id'), 'teachers', ['id'], unique=False)

    # 5. students table
    op.create_table(
        'students',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('class_id', sa.Integer(), nullable=True),
        sa.Column('department', sa.String(length=100), nullable=False),
        sa.Column('course', sa.String(length=100), nullable=False),
        sa.Column('year', sa.String(length=50), nullable=False),
        sa.Column('section', sa.String(length=10), nullable=False),
        sa.Column('phone', sa.String(length=25), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_students_id'), 'students', ['id'], unique=False)

    # 6. teacher_subject_assignments table
    op.create_table(
        'teacher_subject_assignments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('teacher_id', sa.String(length=50), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('class_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('teacher_id', 'subject_id', 'class_id', name='uq_teacher_subject_class')
    )

    # 7. devices table
    op.create_table(
        'devices',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('location', sa.String(length=100), nullable=False),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('last_seen', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_devices_id'), 'devices', ['id'], unique=False)

    # 8. attendance_sessions table
    op.create_table(
        'attendance_sessions',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('teacher_id', sa.String(length=50), nullable=False),
        sa.Column('class_id', sa.Integer(), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_attendance_sessions_id'), 'attendance_sessions', ['id'], unique=False)

    # 9. attendance_records table
    op.create_table(
        'attendance_records',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('student_id', sa.String(length=50), nullable=False),
        sa.Column('session_id', sa.String(length=50), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('method', sa.String(length=20), nullable=False),
        sa.Column('device_id', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['session_id'], ['attendance_sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', 'session_id', name='uq_student_session_attendance')
    )
    op.create_index(op.f('ix_attendance_records_id'), 'attendance_records', ['id'], unique=False)
    op.create_index(op.f('ix_attendance_records_session_id'), 'attendance_records', ['session_id'], unique=False)
    op.create_index(op.f('ix_attendance_records_student_id'), 'attendance_records', ['student_id'], unique=False)

    # 10. rfid_cards table
    op.create_table(
        'rfid_cards',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('card_uid', sa.String(length=100), nullable=False),
        sa.Column('student_id', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('registered_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id')
    )
    op.create_index(op.f('ix_rfid_cards_card_uid'), 'rfid_cards', ['card_uid'], unique=True)

    # 11. biometric_identities table
    op.create_table(
        'biometric_identities',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('student_id', sa.String(length=50), nullable=False),
        sa.Column('fingerprint_enrolled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('fingerprint_template_id', sa.String(length=100), nullable=True),
        sa.Column('face_enrolled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('face_reference_id', sa.String(length=100), nullable=True),
        sa.Column('registered_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id')
    )

    # 12. system_settings table
    op.create_table(
        'system_settings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_system_settings_key'), 'system_settings', ['key'], unique=True)


def downgrade() -> None:
    op.drop_table('system_settings')
    op.drop_table('biometric_identities')
    op.drop_table('rfid_cards')
    op.drop_table('attendance_records')
    op.drop_table('attendance_sessions')
    op.drop_table('devices')
    op.drop_table('teacher_subject_assignments')
    op.drop_table('students')
    op.drop_table('teachers')
    op.drop_table('subjects')
    op.drop_table('classes')
    op.drop_table('users')
