from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CleanupAccountOut(BaseModel):
    account_id: str
    username: str
    full_name: str
    profile_image: str | None = None
    profile_bio: str | None = None
    last_interaction_at: datetime
    comments_last_30_days: int
    likes_last_30_days: int = 0
    repeated_comments: int
    recent_comment_preview: str | None = None
    recent_reaction_label: str | None = None
    interaction_score: float
    inactivity_penalty: float
    bucket: Literal["keep", "review", "unfollow"]
    tags: list[str] = Field(default_factory=list)


class CleanupSummaryOut(BaseModel):
    imported_followers: int
    imported_following: int
    tracked_posts: int
    tracked_comments: int
    daily_follower_delta: int = 0
    daily_unfollow_count: int = 0
    daily_comment_count: int = 0
    keep_count: int
    review_count: int
    unfollow_count: int


class RecommendationOut(BaseModel):
    account_id: str
    username: str
    display_name: str | None = None
    profile_image: str | None = None
    last_login_at: datetime | None = None
    recent_post_url: str | None = None
    follower_count: int
    last_posted_at: datetime
    posts_per_week: float
    engagement_proxy: float
    category_similarity: float
    recommendation_score: float
    categories: list[str] = Field(default_factory=list)
    action: Literal["saved", "hidden", "bookmarked", "none"]


class RecommendationSummaryOut(BaseModel):
    daily_top_count: int
    saved_count: int
    hidden_count: int
    bookmarked_count: int


class ConnectedProfileOut(BaseModel):
    username: str | None = None
    display_name: str | None = None
    profile_image: str | None = None
    follower_count: int = 0
    following_count: int = 0
    media_count: int = 0


class DashboardOut(BaseModel):
    mock_mode: bool
    connected_profile: ConnectedProfileOut | None = None
    cleanup_summary: CleanupSummaryOut
    cleanup_accounts: list[CleanupAccountOut]
    follower_accounts: list[CleanupAccountOut] = Field(default_factory=list)
    following_accounts: list[CleanupAccountOut] = Field(default_factory=list)
    daily_follower_accounts: list[CleanupAccountOut] = Field(default_factory=list)
    daily_unfollow_accounts: list[CleanupAccountOut] = Field(default_factory=list)
    daily_comment_accounts: list[CleanupAccountOut] = Field(default_factory=list)
    recommendation_summary: RecommendationSummaryOut
    recommendations: list[RecommendationOut]


class SeedInput(BaseModel):
    seed_accounts: list[str] = Field(default_factory=list)
    hashtags: list[str] = Field(default_factory=list)


class RecommendationActionInput(BaseModel):
    recommendation_id: str
    action: Literal["saved", "hidden", "bookmarked"]
