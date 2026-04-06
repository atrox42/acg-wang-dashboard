from datetime import datetime

from app.core.config import settings
from app.db.database import SessionLocal
from app.services.live_dashboard import recalculate_live_scores
from app.services.scoring import calculate_interaction_score, calculate_recommendation_score


def recalculate_daily_scores() -> dict:
    if not settings.mock_data_mode:
        db = SessionLocal()
        try:
            return recalculate_live_scores(db)
        finally:
            db.close()

    now = datetime.utcnow()

    sample_relationship = calculate_interaction_score(
        comments_last_30_days=6,
        repeated_comments=2,
        last_interaction_at=now,
        now=now,
    )
    sample_recommendation = calculate_recommendation_score(
        follower_count=2400,
        days_since_post=2,
        posts_per_week=4.5,
        engagement_proxy=0.07,
        category_similarity=0.84,
    )

    return {
        "ran_at": now.isoformat(),
        "relationship_sample": sample_relationship,
        "recommendation_sample": sample_recommendation,
    }
