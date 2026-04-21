from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
import hashlib
import hmac
import json
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen
from uuid import uuid4

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
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
        return f"{account.category} 관??계정"
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


def _redact_instagram_url(url: str) -> str:
    parsed = urlsplit(url)
    safe_query = []
    for key, value in parse_qsl(parsed.query, keep_blank_values=True):
        if key in {"access_token", "appsecret_proof"}:
            value = "[redacted]"
        safe_query.append((key, value))
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(safe_query), parsed.fragment))


def _build_instagram_query(fields: str, access_token: str | None = None) -> dict[str, str]:
    query = {"fields": fields}
    if access_token:
        query["access_token"] = access_token
        if settings.instagram_app_secret:
            query["appsecret_proof"] = hmac.new(
                settings.instagram_app_secret.encode("utf-8"),
                access_token.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
    return query


def _fetch_instagram_profile_candidate(url: str, bearer_token: str | None = None) -> dict | None:
    request = Request(url)
    if bearer_token:
        request.add_header("Authorization", f"Bearer {bearer_token}")

    try:
        with urlopen(request, timeout=10) as response:
            body = response.read().decode("utf-8")
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        print(
            "Instagram profile fetch failed",
            json.dumps(
                {
                    "url": _redact_instagram_url(url),
                    "status": error.code,
                    "body": body[:800],
                    "bearer": bool(bearer_token),
                },
                ensure_ascii=False,
            ),
        )
        return None
    except (URLError, TimeoutError) as error:
        print(
            "Instagram profile fetch failed",
            json.dumps(
                {
                    "url": _redact_instagram_url(url),
                    "error": str(error),
                    "bearer": bool(bearer_token),
                },
                ensure_ascii=False,
            ),
        )
        return None

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return None

    return payload if isinstance(payload, dict) else None


def _normalize_instagram_profile_payload(payload: dict | None) -> dict | None:
    if not payload:
        return None

    nested_data = payload.get("data")
    if isinstance(nested_data, list) and nested_data and isinstance(nested_data[0], dict):
        return nested_data[0]

    return payload


def _try_fetch_instagram_profile(endpoint: str, fields: str, access_token: str) -> dict | None:
    query_url = f"{endpoint}?{urlencode(_build_instagram_query(fields, access_token))}"
    direct_payload = _fetch_instagram_profile_candidate(query_url)
    normalized_direct_payload = _normalize_instagram_profile_payload(direct_payload)
    if normalized_direct_payload and not normalized_direct_payload.get("error"):
        return normalized_direct_payload

    bearer_url = f"{endpoint}?{urlencode(_build_instagram_query(fields))}"
    bearer_payload = _fetch_instagram_profile_candidate(bearer_url, bearer_token=access_token)
    normalized_bearer_payload = _normalize_instagram_profile_payload(bearer_payload)
    if normalized_bearer_payload and not normalized_bearer_payload.get("error"):
        return normalized_bearer_payload

    return None


def _resolve_instagram_profile(access_token: str, fallback_instagram_id: str | None) -> dict | None:
    fallback_value = (fallback_instagram_id or "").strip()
    merged: dict = {}

    base_candidates = [
        ("https://graph.instagram.com/me", "user_id,username"),
        ("https://graph.instagram.com/v23.0/me", "user_id,username"),
        ("https://graph.facebook.com/me", "id,username"),
        ("https://graph.facebook.com/v23.0/me", "id,username"),
        ("https://graph.instagram.com/me", "username"),
        ("https://graph.instagram.com/v23.0/me", "username"),
        ("https://graph.facebook.com/me", "username"),
        ("https://graph.facebook.com/v23.0/me", "username"),
        ("https://graph.instagram.com/me", "user_id"),
        ("https://graph.instagram.com/v23.0/me", "user_id"),
        ("https://graph.facebook.com/me", "id"),
        ("https://graph.facebook.com/v23.0/me", "id"),
    ]

    for endpoint, fields in base_candidates:
        payload = _try_fetch_instagram_profile(endpoint, fields, access_token)
        if not payload:
            continue
        merged = {**merged, **payload}
        if merged.get("username"):
            break

    node_ids = []
    for candidate in [merged.get("user_id"), merged.get("id"), fallback_value]:
        if candidate is None:
            continue
        normalized = str(candidate).strip()
        if normalized and normalized not in node_ids:
            node_ids.append(normalized)

    for node_id in node_ids:
        for endpoint, fields in [
            (f"https://graph.instagram.com/{node_id}", "username"),
            (f"https://graph.instagram.com/v23.0/{node_id}", "username"),
            (f"https://graph.facebook.com/{node_id}", "username"),
            (f"https://graph.facebook.com/v23.0/{node_id}", "username"),
        ]:
            payload = _try_fetch_instagram_profile(endpoint, fields, access_token)
            if not payload:
                continue
            merged = {**merged, **payload}
            if merged.get("username"):
                break
        if merged.get("username"):
            break

    metric_candidates = [
        ("https://graph.instagram.com/me", "media_count"),
        ("https://graph.instagram.com/v23.0/me", "media_count"),
        ("https://graph.facebook.com/me", "followers_count,follows_count,media_count"),
        ("https://graph.facebook.com/v23.0/me", "followers_count,follows_count,media_count"),
    ]
    for node_id in node_ids:
        metric_candidates.extend(
            [
                (f"https://graph.instagram.com/{node_id}", "media_count"),
                (f"https://graph.instagram.com/v23.0/{node_id}", "media_count"),
                (f"https://graph.facebook.com/{node_id}", "followers_count,follows_count,media_count"),
                (f"https://graph.facebook.com/v23.0/{node_id}", "followers_count,follows_count,media_count"),
            ]
        )

    for endpoint, fields in metric_candidates:
        payload = _try_fetch_instagram_profile(endpoint, fields, access_token)
        if not payload:
            continue
        merged = {**merged, **payload}
        if (
            isinstance(merged.get("followers_count"), int)
            or isinstance(merged.get("follows_count"), int)
            or isinstance(merged.get("media_count"), int)
        ):
            break

    return merged or None


def _refresh_connected_account_from_token(
    db: Session,
    account: Account,
    *,
    access_token: str,
    instagram_user_id: str | None,
) -> None:
    profile = _resolve_instagram_profile(access_token, instagram_user_id)
    metadata = account.metadata_json or {}
    if not profile:
        metadata["last_live_refresh_error"] = "profile_lookup_failed"
        metadata["last_live_refresh_at"] = datetime.utcnow().isoformat()
        account.metadata_json = metadata
        account.updated_at = datetime.utcnow()
        return

    resolved_username = str(profile.get("username") or "").strip().lower().lstrip("@")
    if resolved_username:
        existing_account = db.execute(
            select(Account).where(Account.username == resolved_username)
        ).scalar_one_or_none()
        if existing_account is None or existing_account.id == account.id:
            account.username = resolved_username
        metadata["resolved_username"] = resolved_username

    if profile.get("name"):
        account.full_name = str(profile["name"]).strip()
    if isinstance(profile.get("followers_count"), int):
        account.follower_count = int(profile["followers_count"])
    if isinstance(profile.get("follows_count"), int):
        account.following_count = int(profile["follows_count"])
    if isinstance(profile.get("media_count"), int):
        metadata["media_count"] = int(profile["media_count"])
    if profile.get("profile_picture_url"):
        metadata["profile_picture_url"] = str(profile["profile_picture_url"]).strip()

    metadata["last_live_refresh_at"] = datetime.utcnow().isoformat()
    metadata.pop("last_live_refresh_error", None)
    account.metadata_json = metadata
    account.updated_at = datetime.utcnow()


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


def sync_connected_profile(
    db: Session,
    *,
    username: str,
    full_name: str | None = None,
    instagram_user_id: str | None = None,
    follower_count: int | None = None,
    following_count: int | None = None,
    media_count: int | None = None,
    access_token: str | None = None,
) -> dict:
    normalized_username = username.strip().lower().lstrip("@")
    if not normalized_username:
        raise ValueError("username is required")
    normalized_instagram_user_id = (
        str(instagram_user_id).strip()
        if instagram_user_id is not None and str(instagram_user_id).strip()
        else None
    )

    now = datetime.utcnow()
    account = None
    if normalized_instagram_user_id:
        accounts = (
            db.execute(select(Account).where(Account.metadata_json.is_not(None)))
            .scalars()
            .all()
        )
        for existing_account in accounts:
            metadata = existing_account.metadata_json or {}
            if str(metadata.get("instagram_user_id") or "").strip() == normalized_instagram_user_id:
                account = existing_account
                break

    if account is None:
        account = db.execute(
            select(Account).where(Account.username == normalized_username)
        ).scalar_one_or_none()
    if account is None:
        account = Account(
            id=_new_id("acct"),
            username=normalized_username,
            created_at=now,
        )
        db.add(account)

    metadata = account.metadata_json or {}
    metadata["source"] = "instagram_oauth"
    metadata["last_synced_at"] = now.isoformat()
    if instagram_user_id:
        metadata["instagram_user_id"] = str(instagram_user_id)
    if media_count is not None:
        metadata["media_count"] = int(media_count)
    if access_token:
        metadata["instagram_access_token"] = access_token

    if not normalized_username.startswith("instagram-"):
        existing_username_account = db.execute(
            select(Account).where(Account.username == normalized_username)
        ).scalar_one_or_none()
        if existing_username_account is None or existing_username_account.id == account.id:
            account.username = normalized_username

    account.full_name = full_name or account.full_name or account.username or normalized_username
    if follower_count is not None:
        account.follower_count = int(follower_count)
    if following_count is not None:
        account.following_count = int(following_count)
    account.metadata_json = metadata
    account.updated_at = now

    if access_token and (
        normalized_username.startswith("instagram-")
        or account.follower_count in (None, 0)
        or account.following_count in (None, 0)
        or int((metadata or {}).get("media_count") or 0) == 0
    ):
        _refresh_connected_account_from_token(
            db,
            account,
            access_token=access_token,
            instagram_user_id=instagram_user_id,
        )

    db.commit()

    return {
        "synced": True,
        "account_id": account.id,
        "username": account.username,
        "follower_count": account.follower_count or 0,
        "following_count": account.following_count or 0,
        "media_count": int((account.metadata_json or {}).get("media_count") or 0),
        "mock_mode": False,
    }


def _find_connected_account(
    db: Session,
    *,
    username: str | None = None,
    instagram_user_id: str | None = None,
) -> Account | None:
    normalized_username = username.strip().lower().lstrip("@") if username else None
    normalized_instagram_user_id = (
        str(instagram_user_id).strip()
        if instagram_user_id is not None and str(instagram_user_id).strip()
        else None
    )
    if normalized_instagram_user_id:
        accounts = (
            db.execute(select(Account).where(Account.metadata_json.is_not(None)))
            .scalars()
            .all()
        )
        for account in accounts:
            metadata = account.metadata_json or {}
            if str(metadata.get("instagram_user_id") or "").strip() == normalized_instagram_user_id:
                return account

    if normalized_username:
        account = db.execute(
            select(Account).where(Account.username == normalized_username)
        ).scalar_one_or_none()
        if account is not None:
            return account

    return None


def build_live_dashboard_payload(
    db: Session,
    days: int,
    username: str | None = None,
    instagram_user_id: str | None = None,
) -> dict:
    normalized_username = username.strip().lower().lstrip("@") if username else None
    connected_account = _find_connected_account(
        db,
        username=normalized_username,
        instagram_user_id=instagram_user_id,
    )
    if connected_account is not None:
        metadata = connected_account.metadata_json or {}
        access_token = metadata.get("instagram_access_token")
        needs_live_refresh = bool(access_token) and (
            connected_account.username.startswith("instagram-")
            or connected_account.follower_count in (None, 0)
            or connected_account.following_count in (None, 0)
            or int(metadata.get("media_count") or 0) == 0
        )
        if needs_live_refresh:
            _refresh_connected_account_from_token(
                db,
                connected_account,
                access_token=str(access_token),
                instagram_user_id=str(metadata.get("instagram_user_id") or instagram_user_id or ""),
            )
            db.commit()

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
            tags.append("mutual")
        elif account_id in follower_ids:
            tags.append("follower")
        elif account_id in following_ids:
            tags.append("following")
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
                "recent_reaction_label": "today activity"
                if latest_comment and latest_comment.created_at >= datetime.utcnow() - timedelta(days=1)
                else "recent activity",
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
    connected_metadata = (connected_account.metadata_json or {}) if connected_account else {}
    connected_media_count_raw = connected_metadata.get("media_count")
    connected_media_count = (
        int(connected_media_count_raw)
        if isinstance(connected_media_count_raw, (int, float, str)) and str(connected_media_count_raw).strip()
        else 0
    )

    fallback_followers = connected_account.follower_count if connected_account and connected_account.follower_count is not None else 0
    fallback_following = connected_account.following_count if connected_account and connected_account.following_count is not None else 0
    connected_profile = None
    if connected_account is not None:
        connected_profile = {
            "username": connected_account.username,
            "display_name": connected_account.full_name or connected_account.username,
            "profile_image": connected_metadata.get("profile_picture_url") or "",
            "follower_count": int(fallback_followers or 0),
            "following_count": int(fallback_following or 0),
            "media_count": int(connected_media_count or 0),
        }

    return {
        "mock_mode": False,
        "days": days,
        "connected_profile": connected_profile,
        "cleanup_summary": {
            "imported_followers": len(follower_accounts) or fallback_followers,
            "imported_following": len(following_accounts) or fallback_following,
            "tracked_posts": connected_media_count,
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
