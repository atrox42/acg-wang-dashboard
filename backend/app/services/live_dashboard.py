from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Iterable
from uuid import uuid4

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.entities import (
    Account,
    AccountScore,
    Comment,
    DiscoverySeed,
    Recommendation,
    RecommendationAction,
    Snapshot,
    SnapshotEntry,
)
from app.services.scoring import calculate_interaction_score, calculate_recommendation_score


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


def _normalize_term(value: str) -> str:
    return value.strip().lower().replace("#", "").replace("@", "")


def _extract_profile_bio(account: Account) -> str:
    metadata = account.metadata_json or {}
    bio = metadata.get("bio")
    if isinstance(bio, str) and bio.strip():
        return bio.strip()
    if account.category:
        return f"{account.category} 관련 계정"
    return account.full_name or ""


def _extract_recent_posted_at(account: Account) -> datetime:
    metadata = account.metadata_json or {}
    raw_value = metadata.get("last_posted_at")
    if isinstance(raw_value, str):
        try:
            return _to_naive_datetime(datetime.fromisoformat(raw_value.replace("Z", "+00:00")))
        except ValueError:
            pass
    return _to_naive_datetime(account.updated_at or account.created_at)


def _to_naive_datetime(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value.astimezone().replace(tzinfo=None)
    return value


def _extract_posts_per_week(account: Account) -> float:
    metadata = account.metadata_json or {}
    raw_value = metadata.get("posts_per_week")
    if isinstance(raw_value, (int, float)):
        return float(raw_value)
    follower_count = account.follower_count or 0
    if follower_count >= 5000:
        return 4.0
    if follower_count >= 1000:
        return 3.0
    return 2.0


def _extract_engagement_proxy(account: Account) -> float:
    metadata = account.metadata_json or {}
    raw_value = metadata.get("engagement_proxy")
    if isinstance(raw_value, (int, float)):
        return float(raw_value)
    follower_count = max(account.follower_count or 0, 1)
    following_count = max(account.following_count or 0, 1)
    ratio = follower_count / following_count
    return round(min(0.12, max(0.02, ratio / 100)), 4)


def _build_category_similarity(account: Account, seed_terms: list[str]) -> float:
    searchable = " ".join(
        filter(
            None,
            [
                account.username.lower(),
                (account.full_name or "").lower(),
                (account.category or "").lower(),
                _extract_profile_bio(account).lower(),
            ],
        )
    )
    if not seed_terms:
        return 0.6 if account.category else 0.45

    match_count = sum(1 for term in seed_terms if term and term in searchable)
    if not match_count:
        return 0.18 if account.category else 0.08
    return min(1.0, 0.35 + (match_count * 0.2))


def _latest_snapshot(db: Session, snapshot_type: str, offset: int = 0) -> Snapshot | None:
    return db.execute(
        select(Snapshot)
        .where(Snapshot.snapshot_type == snapshot_type)
        .order_by(Snapshot.imported_at.desc())
        .offset(offset)
        .limit(1)
    ).scalar_one_or_none()


def _snapshot_account_ids(db: Session, snapshot_id: str | None) -> list[str]:
    if not snapshot_id:
        return []
    return list(
        db.execute(
            select(SnapshotEntry.account_id)
            .where(SnapshotEntry.snapshot_id == snapshot_id)
            .order_by(SnapshotEntry.account_id.asc())
        ).scalars()
    )


def _load_accounts(db: Session, account_ids: Iterable[str]) -> dict[str, Account]:
    ids = list(dict.fromkeys(account_ids))
    if not ids:
        return {}
    accounts = db.execute(select(Account).where(Account.id.in_(ids))).scalars().all()
    return {account.id: account for account in accounts}


def _load_latest_comment_map(db: Session, account_ids: Iterable[str]) -> dict[str, Comment]:
    ids = list(dict.fromkeys(account_ids))
    if not ids:
        return {}
    comments = (
        db.execute(
            select(Comment)
            .where(Comment.commenter_account_id.in_(ids))
            .order_by(Comment.created_at.desc())
        )
        .scalars()
        .all()
    )

    latest_by_account: dict[str, Comment] = {}
    for comment in comments:
        latest_by_account.setdefault(comment.commenter_account_id, comment)
    return latest_by_account


def _load_comment_stats(db: Session, account_ids: Iterable[str], window_days: int) -> dict[str, dict]:
    ids = list(dict.fromkeys(account_ids))
    if not ids:
        return {}

    since = datetime.utcnow() - timedelta(days=window_days)
    rows = db.execute(
        select(
            Comment.commenter_account_id,
            func.count(Comment.id),
            func.max(Comment.created_at),
        )
        .where(Comment.commenter_account_id.in_(ids), Comment.created_at >= since)
        .group_by(Comment.commenter_account_id)
    ).all()

    stats: dict[str, dict] = {}
    for account_id, comment_count, last_interaction_at in rows:
        stats[account_id] = {
            "comments_last_30_days": int(comment_count or 0),
            "repeated_comments": max(int(comment_count or 0) - 1, 0),
            "last_interaction_at": last_interaction_at,
        }
    return stats


def _baseline_relationship(account_id: str, mutual_ids: set[str], follower_ids: set[str], following_ids: set[str]) -> dict:
    if account_id in mutual_ids:
        return {
            "comments_last_30_days": 0,
            "repeated_comments": 0,
            "recency_score": 28.0,
            "inactivity_penalty": 0.0,
            "interaction_score": 58.0,
            "bucket": "review",
        }
    if account_id in follower_ids:
        return {
            "comments_last_30_days": 0,
            "repeated_comments": 0,
            "recency_score": 22.0,
            "inactivity_penalty": 0.0,
            "interaction_score": 46.0,
            "bucket": "review",
        }
    if account_id in following_ids:
        return {
            "comments_last_30_days": 0,
            "repeated_comments": 0,
            "recency_score": 14.0,
            "inactivity_penalty": 0.0,
            "interaction_score": 30.0,
            "bucket": "unfollow",
        }
    return {
        "comments_last_30_days": 0,
        "repeated_comments": 0,
        "recency_score": 0.0,
        "inactivity_penalty": 35.0,
        "interaction_score": 10.0,
        "bucket": "unfollow",
    }


def import_snapshot_rows(db: Session, snapshot_type: str, filename: str, rows: list[dict]) -> dict:
    usernames = [row["username"] for row in rows]
    existing_accounts = {
        account.username: account
        for account in db.execute(select(Account).where(Account.username.in_(usernames))).scalars().all()
    }

    snapshot = Snapshot(
        id=_new_id("snap"),
        snapshot_type=snapshot_type,
        imported_at=datetime.utcnow(),
        source_filename=filename,
        total_rows=len(rows),
    )
    db.add(snapshot)

    for row in rows:
        account = existing_accounts.get(row["username"])
        if not account:
            account = Account(
                id=_new_id("acct"),
                username=row["username"],
                created_at=datetime.utcnow(),
            )
            existing_accounts[row["username"]] = account
            db.add(account)

        account.full_name = row["full_name"]
        account.follower_count = row["follower_count"]
        account.following_count = row["following_count"]
        account.category = row["category"]
        account.updated_at = datetime.utcnow()
        account.metadata_json = {
            **(account.metadata_json or {}),
            "last_snapshot_type": snapshot_type,
            "last_source_filename": filename,
        }

        db.add(
            SnapshotEntry(
                id=_new_id("entry"),
                snapshot_id=snapshot.id,
                account_id=account.id,
                is_mutual=False,
            )
        )

    db.flush()

    follower_snapshot = snapshot if snapshot_type == "followers" else _latest_snapshot(db, "followers")
    following_snapshot = snapshot if snapshot_type == "following" else _latest_snapshot(db, "following")
    follower_ids = set(_snapshot_account_ids(db, follower_snapshot.id if follower_snapshot else None))
    following_ids = set(_snapshot_account_ids(db, following_snapshot.id if following_snapshot else None))
    mutual_ids = follower_ids & following_ids

    all_entry_snapshot_ids = [value for value in [follower_snapshot.id if follower_snapshot else None, following_snapshot.id if following_snapshot else None] if value]
    if all_entry_snapshot_ids:
        entries = (
            db.execute(select(SnapshotEntry).where(SnapshotEntry.snapshot_id.in_(all_entry_snapshot_ids)))
            .scalars()
            .all()
        )
        for entry in entries:
            entry.is_mutual = entry.account_id in mutual_ids

    db.commit()

    return {
        "snapshot_id": snapshot.id,
        "snapshot_type": snapshot_type,
        "imported_rows": len(rows),
        "filename": filename,
        "mock_mode": False,
    }


def save_seed_values(db: Session, seed_accounts: list[str], hashtags: list[str]) -> dict:
    normalized_pairs = [
        ("account", _normalize_term(value)) for value in seed_accounts if _normalize_term(value)
    ] + [("hashtag", _normalize_term(value)) for value in hashtags if _normalize_term(value)]

    existing = {
        (seed.seed_type, seed.seed_value): seed
        for seed in db.execute(select(DiscoverySeed)).scalars().all()
    }

    saved_seed_accounts = 0
    saved_hashtags = 0

    for seed_type, seed_value in normalized_pairs:
        record = existing.get((seed_type, seed_value))
        if record:
            record.active = True
        else:
            db.add(
                DiscoverySeed(
                    id=_new_id("seed"),
                    seed_type=seed_type,
                    seed_value=seed_value,
                    active=True,
                    created_at=datetime.utcnow(),
                )
            )
        if seed_type == "account":
            saved_seed_accounts += 1
        else:
            saved_hashtags += 1

    db.commit()

    return {
        "saved_seed_accounts": saved_seed_accounts,
        "saved_hashtags": saved_hashtags,
        "mock_mode": False,
    }


def recalculate_live_scores(db: Session, window_days: int = 30) -> dict:
    latest_follower = _latest_snapshot(db, "followers")
    latest_following = _latest_snapshot(db, "following")
    follower_ids = set(_snapshot_account_ids(db, latest_follower.id if latest_follower else None))
    following_ids = set(_snapshot_account_ids(db, latest_following.id if latest_following else None))
    mutual_ids = follower_ids & following_ids
    tracked_ids = sorted(follower_ids | following_ids)
    accounts = _load_accounts(db, tracked_ids)

    comment_stats = _load_comment_stats(db, tracked_ids, window_days)

    db.execute(delete(AccountScore).where(AccountScore.window_days == window_days))

    score_count = 0
    for account_id in tracked_ids:
        stats = comment_stats.get(account_id)
        if stats and stats["last_interaction_at"] is not None:
            scoring = calculate_interaction_score(
                comments_last_30_days=stats["comments_last_30_days"],
                repeated_comments=stats["repeated_comments"],
                last_interaction_at=stats["last_interaction_at"],
            )
        else:
            scoring = _baseline_relationship(account_id, mutual_ids, follower_ids, following_ids)

        db.add(
            AccountScore(
                id=_new_id("score"),
                account_id=account_id,
                window_days=window_days,
                comments_last_30_days=scoring["comments_last_30_days"],
                repeated_comments=scoring["repeated_comments"],
                recency_score=scoring["recency_score"],
                inactivity_penalty=scoring["inactivity_penalty"],
                interaction_score=scoring["interaction_score"],
                bucket=scoring["bucket"],
                calculated_at=datetime.utcnow(),
            )
        )
        score_count += 1

    active_seed_terms = [
        seed.seed_value
        for seed in db.execute(select(DiscoverySeed).where(DiscoverySeed.active.is_(True))).scalars().all()
    ]

    latest_status_by_account: dict[str, str] = {}
    existing_recommendations = db.execute(select(Recommendation)).scalars().all()
    for recommendation in existing_recommendations:
        latest_status_by_account[recommendation.account_id] = recommendation.status

    db.execute(delete(RecommendationAction))
    db.execute(delete(Recommendation))

    candidate_ids = sorted(follower_ids - following_ids)
    recommendation_count = 0
    for rank, account_id in enumerate(candidate_ids, start=1):
        account = accounts.get(account_id)
        if not account:
            continue
        last_posted_at = _extract_recent_posted_at(account)
        recommendation = calculate_recommendation_score(
            follower_count=account.follower_count or 0,
            days_since_post=max((datetime.utcnow() - last_posted_at).days, 0),
            posts_per_week=_extract_posts_per_week(account),
            engagement_proxy=_extract_engagement_proxy(account),
            category_similarity=_build_category_similarity(account, active_seed_terms),
        )
        db.add(
            Recommendation(
                id=_new_id("rec"),
                account_id=account_id,
                recommendation_date=date.today(),
                follower_band_score=recommendation["follower_band_score"],
                posting_recency_score=recommendation["posting_recency_score"],
                posting_frequency_score=recommendation["posting_frequency_score"],
                engagement_proxy_score=recommendation["engagement_proxy_score"],
                category_similarity_score=recommendation["category_similarity_score"],
                recommendation_score=recommendation["recommendation_score"],
                rank=rank,
                status=latest_status_by_account.get(account_id, "none"),
            )
        )
        recommendation_count += 1

    db.commit()

    return {
        "ran_at": datetime.utcnow().isoformat(),
        "window_days": window_days,
        "scored_accounts": score_count,
        "generated_recommendations": recommendation_count,
        "mock_mode": False,
    }


def save_recommendation_action_live(db: Session, recommendation_id: str, action: str) -> dict:
    recommendation = db.get(Recommendation, recommendation_id)
    if not recommendation:
        raise ValueError("Recommendation not found.")

    recommendation.status = action
    db.add(
        RecommendationAction(
            id=_new_id("raction"),
            recommendation_id=recommendation_id,
            action=action,
            created_at=datetime.utcnow(),
        )
    )
    db.commit()

    return {
        "recommendation_id": recommendation_id,
        "action": action,
        "saved": True,
        "mock_mode": False,
    }


def build_live_dashboard_payload(db: Session, days: int, username: str | None = None) -> dict:
    latest_follower = _latest_snapshot(db, "followers")
    latest_following = _latest_snapshot(db, "following")
    previous_follower = _latest_snapshot(db, "followers", offset=1)
    previous_following = _latest_snapshot(db, "following", offset=1)

    follower_ids = set(_snapshot_account_ids(db, latest_follower.id if latest_follower else None))
    following_ids = set(_snapshot_account_ids(db, latest_following.id if latest_following else None))
    previous_follower_ids = set(_snapshot_account_ids(db, previous_follower.id if previous_follower else None))
    previous_following_ids = set(_snapshot_account_ids(db, previous_following.id if previous_following else None))

    tracked_ids = sorted(follower_ids | following_ids)
    accounts_by_id = _load_accounts(db, tracked_ids)

    latest_comment_map = _load_latest_comment_map(db, tracked_ids)
    comment_stats = _load_comment_stats(db, tracked_ids, 30)

    score_rows = (
        db.execute(select(AccountScore).where(AccountScore.window_days == days))
        .scalars()
        .all()
    )
    scores_by_account = {score.account_id: score for score in score_rows}

    cleanup_accounts = []
    for account_id in tracked_ids:
        account = accounts_by_id.get(account_id)
        if not account:
            continue

        score = scores_by_account.get(account_id)
        if score:
            score_data = {
                "comments_last_30_days": score.comments_last_30_days,
                "repeated_comments": score.repeated_comments,
                "interaction_score": score.interaction_score,
                "inactivity_penalty": score.inactivity_penalty,
                "bucket": score.bucket,
            }
        else:
            fallback = _baseline_relationship(account_id, follower_ids & following_ids, follower_ids, following_ids)
            score_data = {
                "comments_last_30_days": fallback["comments_last_30_days"],
                "repeated_comments": fallback["repeated_comments"],
                "interaction_score": fallback["interaction_score"],
                "inactivity_penalty": fallback["inactivity_penalty"],
                "bucket": fallback["bucket"],
            }

        latest_comment = latest_comment_map.get(account_id)
        tags = []
        if account_id in follower_ids and account_id in following_ids:
            tags.append("맞팔")
        elif account_id in follower_ids:
            tags.append("팔로워")
        elif account_id in following_ids:
            tags.append("팔로잉")
        if account.category:
            tags.append(account.category)

        cleanup_accounts.append(
            {
                "account_id": account.id,
                "username": account.username,
                "full_name": account.full_name or account.username,
                "profile_image": "",
                "profile_bio": _extract_profile_bio(account),
                "last_interaction_at": latest_comment.created_at if latest_comment else account.updated_at,
                "comments_last_30_days": score_data["comments_last_30_days"],
                "likes_last_30_days": 0,
                "repeated_comments": score_data["repeated_comments"],
                "recent_comment_preview": latest_comment.comment_text if latest_comment else "",
                "recent_reaction_label": "오늘 댓글"
                if latest_comment and latest_comment.created_at >= datetime.utcnow() - timedelta(days=1)
                else "최근 활동",
                "interaction_score": score_data["interaction_score"],
                "inactivity_penalty": score_data["inactivity_penalty"],
                "bucket": score_data["bucket"],
                "tags": tags,
            }
        )

    cleanup_accounts.sort(key=lambda item: (-item["interaction_score"], item["username"]))
    cleanup_lookup = {item["account_id"]: item for item in cleanup_accounts}

    def map_accounts(account_ids: Iterable[str]) -> list[dict]:
        return [cleanup_lookup[account_id] for account_id in account_ids if account_id in cleanup_lookup]

    daily_follower_ids = sorted(follower_ids - previous_follower_ids) if previous_follower_ids else []
    daily_unfollow_ids = (
        sorted(previous_following_ids - following_ids) if previous_following_ids else []
    )
    daily_comment_ids = sorted(
        {
            comment.commenter_account_id
            for comment in latest_comment_map.values()
            if comment.created_at >= datetime.utcnow() - timedelta(days=1)
        }
    )

    follower_accounts = map_accounts(sorted(follower_ids))
    following_accounts = map_accounts(sorted(following_ids))
    daily_follower_accounts = map_accounts(daily_follower_ids)
    daily_unfollow_accounts = map_accounts(daily_unfollow_ids)
    daily_comment_accounts = map_accounts(daily_comment_ids)

    latest_recommendation_date = db.execute(select(func.max(Recommendation.recommendation_date))).scalar_one_or_none()
    recommendation_rows = []
    if latest_recommendation_date is not None:
        recommendation_rows = (
            db.execute(
                select(Recommendation, Account)
                .join(Account, Account.id == Recommendation.account_id)
                .where(Recommendation.recommendation_date == latest_recommendation_date)
                .order_by(Recommendation.rank.asc(), Recommendation.recommendation_score.desc())
            )
            .all()
        )

    recommendations = []
    for recommendation, account in recommendation_rows:
        recommendations.append(
            {
                "account_id": recommendation.id,
                "username": account.username,
                "display_name": account.full_name or account.username,
                "profile_image": "",
                "last_login_at": account.updated_at,
                "recent_post_url": f"https://instagram.com/{account.username}/",
                "follower_count": account.follower_count or 0,
                "last_posted_at": _extract_recent_posted_at(account),
                "posts_per_week": _extract_posts_per_week(account),
                "engagement_proxy": _extract_engagement_proxy(account),
                "category_similarity": round(recommendation.category_similarity_score / 15, 4),
                "recommendation_score": recommendation.recommendation_score,
                "categories": [account.category] if account.category else [],
                "action": recommendation.status,
            }
        )

    recommendation_counts = defaultdict(int)
    for item in recommendations:
        recommendation_counts[item["action"]] += 1

    comment_count = db.execute(select(func.count(Comment.id))).scalar_one()

    return {
        "mock_mode": False,
        "days": days,
        "cleanup_summary": {
            "imported_followers": len(follower_accounts),
            "imported_following": len(following_accounts),
            "tracked_posts": 0,
            "tracked_comments": comment_count,
            "daily_follower_delta": len(daily_follower_accounts),
            "daily_unfollow_count": len(daily_unfollow_accounts),
            "daily_comment_count": len(daily_comment_accounts),
            "keep_count": sum(1 for item in cleanup_accounts if item["bucket"] == "keep"),
            "review_count": sum(1 for item in cleanup_accounts if item["bucket"] == "review"),
            "unfollow_count": sum(1 for item in cleanup_accounts if item["bucket"] == "unfollow"),
        },
        "cleanup_accounts": cleanup_accounts,
        "follower_accounts": follower_accounts,
        "following_accounts": following_accounts,
        "daily_follower_accounts": daily_follower_accounts,
        "daily_unfollow_accounts": daily_unfollow_accounts,
        "daily_comment_accounts": daily_comment_accounts,
        "recommendation_summary": {
            "daily_top_count": len([item for item in recommendations if item["action"] != "hidden"]),
            "saved_count": recommendation_counts["saved"],
            "hidden_count": recommendation_counts["hidden"],
            "bookmarked_count": recommendation_counts["bookmarked"],
        },
        "recommendations": recommendations,
    }
