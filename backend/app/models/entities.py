from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    username: Mapped[str] = mapped_column(String, index=True, unique=True)
    full_name: Mapped[str | None] = mapped_column(String, nullable=True)
    follower_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    following_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    category: Mapped[str | None] = mapped_column(String, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class Snapshot(Base):
    __tablename__ = "snapshots"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    snapshot_type: Mapped[str] = mapped_column(String, index=True)
    imported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    source_filename: Mapped[str] = mapped_column(String)
    total_rows: Mapped[int] = mapped_column(Integer, default=0)


class SnapshotEntry(Base):
    __tablename__ = "snapshot_entries"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    snapshot_id: Mapped[str] = mapped_column(ForeignKey("snapshots.id", ondelete="CASCADE"))
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"))
    is_mutual: Mapped[bool] = mapped_column(Boolean, default=False)
    snapshot = relationship("Snapshot")
    account = relationship("Account")


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), index=True
    )
    instagram_media_id: Mapped[str | None] = mapped_column(String, nullable=True)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    like_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comment_count: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    post_id: Mapped[str | None] = mapped_column(
        ForeignKey("posts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    commenter_account_id: Mapped[str] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), index=True
    )
    instagram_comment_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    comment_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    webhook_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class AccountScore(Base):
    __tablename__ = "account_scores"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), index=True
    )
    window_days: Mapped[int] = mapped_column(Integer, default=30)
    comments_last_30_days: Mapped[int] = mapped_column(Integer, default=0)
    repeated_comments: Mapped[int] = mapped_column(Integer, default=0)
    recency_score: Mapped[float] = mapped_column(Float, default=0)
    inactivity_penalty: Mapped[float] = mapped_column(Float, default=0)
    interaction_score: Mapped[float] = mapped_column(Float, default=0)
    bucket: Mapped[str] = mapped_column(String, index=True)
    calculated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DiscoverySeed(Base):
    __tablename__ = "discovery_seeds"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    seed_type: Mapped[str] = mapped_column(String)
    seed_value: Mapped[str] = mapped_column(String, index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), index=True
    )
    recommendation_date: Mapped[date] = mapped_column(Date, index=True)
    follower_band_score: Mapped[float] = mapped_column(Float, default=0)
    posting_recency_score: Mapped[float] = mapped_column(Float, default=0)
    posting_frequency_score: Mapped[float] = mapped_column(Float, default=0)
    engagement_proxy_score: Mapped[float] = mapped_column(Float, default=0)
    category_similarity_score: Mapped[float] = mapped_column(Float, default=0)
    recommendation_score: Mapped[float] = mapped_column(Float, default=0, index=True)
    rank: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="none")


class RecommendationAction(Base):
    __tablename__ = "recommendation_actions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    recommendation_id: Mapped[str] = mapped_column(
        ForeignKey("recommendations.id", ondelete="CASCADE"), index=True
    )
    action: Mapped[str] = mapped_column(String, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    event_type: Mapped[str] = mapped_column(String, index=True)
    payload: Mapped[dict] = mapped_column(JSON)
    received_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
