from datetime import datetime, timedelta


def get_mock_dashboard(days: int, username: str | None = None) -> dict:
    now = datetime.utcnow()
    cleanup_accounts = [
        {
            "account_id": "acct_001",
            "username": "design.jisu",
            "full_name": "Jisu Design",
            "profile_image": "",
            "profile_bio": "Brand art direction and visual notes.",
            "last_interaction_at": now - timedelta(days=2),
            "comments_last_30_days": 8,
            "likes_last_30_days": 26,
            "repeated_comments": 4,
            "recent_comment_preview": "\uc774\ubc88 \ud3ec\uc2a4\ud2b8 \ub108\ubb34 \uc88b\uc544\uc694. \ub2e4\uc74c \uc791\uc5c5\ub3c4 \uae30\ub300\ud560\uac8c\uc694.",
            "recent_reaction_label": "\uc624\ub298 \ub313\uae00",
            "interaction_score": 92,
            "inactivity_penalty": 0,
            "bucket": "keep",
            "tags": ["recent comments", "repeat replies", "high affinity"],
        },
        {
            "account_id": "acct_002",
            "username": "cafe.min",
            "full_name": "Min Cafe Notes",
            "profile_image": "",
            "profile_bio": "Cafe moods, spaces, and quiet city recommendations.",
            "last_interaction_at": now - timedelta(days=7),
            "comments_last_30_days": 3,
            "likes_last_30_days": 14,
            "repeated_comments": 1,
            "recent_comment_preview": "\uc5ec\uae30 \ubd84\uc704\uae30 \ub108\ubb34 \uc88b\uc544 \ubcf4\uc5ec\uc694. \uc800\uc7a5\ud574\ub458\uac8c\uc694.",
            "recent_reaction_label": "\uc77c\uc8fc\uc77c \uc804",
            "interaction_score": 68,
            "inactivity_penalty": 8,
            "bucket": "review",
            "tags": ["some activity", "needs review"],
        },
        {
            "account_id": "acct_003",
            "username": "old.contact",
            "full_name": "Old Contact",
            "profile_image": "",
            "profile_bio": "Archive account with infrequent updates.",
            "last_interaction_at": now - timedelta(days=90),
            "comments_last_30_days": 0,
            "likes_last_30_days": 1,
            "repeated_comments": 0,
            "recent_comment_preview": "\ucd5c\uadfc \ubc18\uc751\uc774 \uac70\uc758 \uc5c6\uc5b4 \uc815\ub9ac \ud6c4\ubcf4\ub85c \ubcf4\uc785\ub2c8\ub2e4.",
            "recent_reaction_label": "30\uc77c \uc804",
            "interaction_score": 21,
            "inactivity_penalty": 35,
            "bucket": "unfollow",
            "tags": ["inactive", "cleanup candidate"],
        },
    ]

    recommendations = [
        {
            "account_id": "rec_001",
            "username": "smallbrand.seoul",
            "display_name": "Small Brand Seoul",
            "profile_image": "",
            "last_login_at": now - timedelta(hours=4),
            "recent_post_url": "https://instagram.com/smallbrand.seoul/",
            "follower_count": 3200,
            "last_posted_at": now - timedelta(days=1),
            "posts_per_week": 4.2,
            "engagement_proxy": 0.072,
            "category_similarity": 0.89,
            "recommendation_score": 91,
            "categories": ["branding", "small business", "seoul"],
            "action": "saved",
        },
        {
            "account_id": "rec_002",
            "username": "creator.yuna",
            "display_name": "Creator Yuna",
            "profile_image": "",
            "last_login_at": now - timedelta(hours=7),
            "recent_post_url": "https://instagram.com/creator.yuna/",
            "follower_count": 1850,
            "last_posted_at": now - timedelta(days=2),
            "posts_per_week": 5.1,
            "engagement_proxy": 0.065,
            "category_similarity": 0.82,
            "recommendation_score": 88,
            "categories": ["lifestyle", "creator"],
            "action": "bookmarked",
        },
        {
            "account_id": "rec_003",
            "username": "hidden.pick",
            "display_name": "Hidden Pick",
            "profile_image": "",
            "last_login_at": now - timedelta(hours=11),
            "recent_post_url": "https://instagram.com/hidden.pick/",
            "follower_count": 4700,
            "last_posted_at": now - timedelta(days=3),
            "posts_per_week": 3.3,
            "engagement_proxy": 0.044,
            "category_similarity": 0.77,
            "recommendation_score": 79,
            "categories": ["photo", "curation"],
            "action": "hidden",
        },
    ]

    summary = {
        "imported_followers": 1342,
        "imported_following": 981,
        "tracked_posts": 214,
        "tracked_comments": 1487,
        "daily_follower_delta": 3,
        "daily_unfollow_count": 1,
        "daily_comment_count": 2,
        "keep_count": sum(1 for item in cleanup_accounts if item["bucket"] == "keep"),
        "review_count": sum(1 for item in cleanup_accounts if item["bucket"] == "review"),
        "unfollow_count": sum(1 for item in cleanup_accounts if item["bucket"] == "unfollow"),
    }

    recommendation_summary = {
        "daily_top_count": min(50, len(recommendations)),
        "saved_count": sum(1 for item in recommendations if item["action"] == "saved"),
        "hidden_count": sum(1 for item in recommendations if item["action"] == "hidden"),
        "bookmarked_count": sum(1 for item in recommendations if item["action"] == "bookmarked"),
    }

    follower_accounts = [
        item
        for item in cleanup_accounts
        if item["username"] in {"design.jisu", "cafe.min", "old.contact"}
    ]
    following_accounts = [
        item
        for item in cleanup_accounts
        if item["username"] in {"design.jisu", "cafe.min"}
    ]
    daily_follower_accounts = follower_accounts[: summary["daily_follower_delta"]]
    daily_unfollow_accounts = [
        item for item in cleanup_accounts if item["bucket"] == "unfollow"
    ][: summary["daily_unfollow_count"]]
    daily_comment_accounts = [
        item for item in cleanup_accounts if item["recent_reaction_label"] == "\uc624\ub298 \ub313\uae00"
    ][: summary["daily_comment_count"]]

    if username == "admin2":
        summary["imported_followers"] = 2180
        summary["imported_following"] = 642
        summary["daily_follower_delta"] = 5
        summary["daily_unfollow_count"] = 2
        summary["daily_comment_count"] = 4
        recommendations = [
            {
                "account_id": "rec_w_001",
                "username": "mood.haru",
                "display_name": "Haru Mood Studio",
                "profile_image": "",
                "last_login_at": now - timedelta(hours=3),
                "recent_post_url": "https://instagram.com/mood.haru/",
                "follower_count": 4100,
                "last_posted_at": now - timedelta(days=1),
                "posts_per_week": 4.8,
                "engagement_proxy": 0.082,
                "category_similarity": 0.91,
                "recommendation_score": 94,
                "categories": ["nature", "camping"],
                "action": "none",
            },
            {
                "account_id": "rec_w_002",
                "username": "soft.weekend",
                "display_name": "Soft Weekend Edit",
                "profile_image": "",
                "last_login_at": now - timedelta(hours=2),
                "recent_post_url": "https://instagram.com/soft.weekend/",
                "follower_count": 2860,
                "last_posted_at": now - timedelta(days=1),
                "posts_per_week": 5.3,
                "engagement_proxy": 0.079,
                "category_similarity": 0.88,
                "recommendation_score": 90,
                "categories": ["nature", "outdoor"],
                "action": "none",
            },
            {
                "account_id": "rec_w_003",
                "username": "picnic.jane",
                "display_name": "Jane Picnic Mood",
                "profile_image": "",
                "last_login_at": now - timedelta(hours=12),
                "recent_post_url": "https://instagram.com/picnic.jane/",
                "follower_count": 1980,
                "last_posted_at": now - timedelta(days=2),
                "posts_per_week": 4.1,
                "engagement_proxy": 0.071,
                "category_similarity": 0.84,
                "recommendation_score": 86,
                "categories": ["camping", "nature"],
                "action": "none",
            },
        ]
        recommendation_summary = {
            "daily_top_count": min(50, len(recommendations)),
            "saved_count": 0,
            "hidden_count": 0,
            "bookmarked_count": 0,
        }
        follower_accounts = cleanup_accounts[:2]
        following_accounts = cleanup_accounts[:2]
        daily_follower_accounts = cleanup_accounts[: summary["daily_follower_delta"]]
        daily_unfollow_accounts = [
            item for item in cleanup_accounts if item["bucket"] == "unfollow"
        ][: summary["daily_unfollow_count"]]
        daily_comment_accounts = cleanup_accounts[: summary["daily_comment_count"]]

    return {
        "mock_mode": True,
        "days": days,
        "cleanup_summary": summary,
        "cleanup_accounts": cleanup_accounts,
        "follower_accounts": follower_accounts,
        "following_accounts": following_accounts,
        "daily_follower_accounts": daily_follower_accounts,
        "daily_unfollow_accounts": daily_unfollow_accounts,
        "daily_comment_accounts": daily_comment_accounts,
        "recommendation_summary": recommendation_summary,
        "recommendations": recommendations,
    }
