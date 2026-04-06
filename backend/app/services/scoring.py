from __future__ import annotations

from datetime import datetime


def calculate_interaction_score(
    comments_last_30_days: int,
    repeated_comments: int,
    last_interaction_at: datetime | None,
    now: datetime | None = None,
) -> dict:
    now = now or datetime.utcnow()

    if last_interaction_at is None:
        recency_score = 0
        inactivity_penalty = 40
    else:
        days_since = max((now - last_interaction_at).days, 0)
        recency_score = max(0, 40 - (days_since * 1.1))
        inactivity_penalty = 0 if days_since <= 14 else min(45, (days_since - 14) * 0.7)

    comment_score = min(35, comments_last_30_days * 4.5)
    repeated_score = min(20, repeated_comments * 5)
    interaction_score = max(
        0,
        min(100, comment_score + repeated_score + recency_score - inactivity_penalty),
    )

    if interaction_score >= 75:
        bucket = "keep"
    elif interaction_score >= 40:
        bucket = "review"
    else:
        bucket = "unfollow"

    return {
        "comments_last_30_days": comments_last_30_days,
        "repeated_comments": repeated_comments,
        "recency_score": round(recency_score, 2),
        "inactivity_penalty": round(inactivity_penalty, 2),
        "interaction_score": round(interaction_score, 2),
        "bucket": bucket,
    }


def calculate_recommendation_score(
    follower_count: int,
    days_since_post: int,
    posts_per_week: float,
    engagement_proxy: float,
    category_similarity: float,
) -> dict:
    follower_band_score = (
        25 if follower_count <= 5000 else max(0, 25 - ((follower_count - 5000) / 1000))
    )
    posting_recency_score = max(0, 25 - (days_since_post * 1.5))
    posting_frequency_score = min(20, posts_per_week * 4)
    engagement_proxy_score = min(15, engagement_proxy * 200)
    category_similarity_score = min(15, category_similarity * 15)
    total = (
        follower_band_score
        + posting_recency_score
        + posting_frequency_score
        + engagement_proxy_score
        + category_similarity_score
    )

    return {
        "follower_band_score": round(follower_band_score, 2),
        "posting_recency_score": round(posting_recency_score, 2),
        "posting_frequency_score": round(posting_frequency_score, 2),
        "engagement_proxy_score": round(engagement_proxy_score, 2),
        "category_similarity_score": round(category_similarity_score, 2),
        "recommendation_score": round(min(100, total), 2),
    }
