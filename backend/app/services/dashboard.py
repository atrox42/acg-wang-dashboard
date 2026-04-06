from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import SessionLocal
from app.services.live_dashboard import build_live_dashboard_payload
from app.services.mock_store import get_mock_dashboard


def build_dashboard_payload(days: int, username: str | None = None, db: Session | None = None) -> dict:
    if settings.mock_data_mode:
        return get_mock_dashboard(days, username=username)

    if db is not None:
        return build_live_dashboard_payload(db, days, username=username)

    session = SessionLocal()
    try:
        return build_live_dashboard_payload(session, days, username=username)
    finally:
        session.close()
