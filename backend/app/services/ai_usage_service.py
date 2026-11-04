"""Database-backed daily AI request limits."""
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from app.models import AIUsageDaily, User, UserRole


def daily_limit_for(user: User) -> int:
    from app.config import settings
    return settings.AI_DAILY_LIMIT_STUDENT if user.role == UserRole.STUDENT else settings.AI_DAILY_LIMIT_STAFF


def used_today(db: Session, user_id: int) -> int:
    today = datetime.now(timezone.utc).date()
    row = db.query(AIUsageDaily.request_count).filter(
        AIUsageDaily.user_id == user_id,
        AIUsageDaily.usage_date == today,
    ).first()
    return int(row[0]) if row else 0


def consume_ai_request(db: Session, user: User) -> tuple[int, int]:
    """Atomically reserve one daily request slot, even across app workers."""
    today = datetime.now(timezone.utc).date()
    limit = daily_limit_for(user)
    table = AIUsageDaily.__table__
    dialect = db.bind.dialect.name
    insert_factory = pg_insert if dialect == "postgresql" else sqlite_insert if dialect == "sqlite" else None
    if insert_factory is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI request limits require PostgreSQL or SQLite.",
        )

    db.execute(
        insert_factory(table)
        .values(user_id=user.id, usage_date=today, request_count=0)
        .on_conflict_do_nothing(index_elements=["user_id", "usage_date"])
    )
    result = db.execute(
        update(table)
        .where(
            table.c.user_id == user.id,
            table.c.usage_date == today,
            table.c.request_count < limit,
        )
        .values(request_count=table.c.request_count + 1)
    )
    db.commit()
    if result.rowcount != 1:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"You've reached today's AI study limit ({limit} requests). Try again tomorrow.",
        )
    return used_today(db, user.id), limit
