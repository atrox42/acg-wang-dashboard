import { getMockDashboardData } from "@/lib/mock-data";
import type { DashboardPayload, WindowDays } from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_DATA_MODE === "true";

function normalizeCleanupAccount(account: Record<string, unknown>): DashboardPayload["cleanupAccounts"][number] {
  return {
    accountId: String(account.account_id),
    username: String(account.username),
    fullName: String(account.full_name),
    profileImage: String(account.profile_image ?? ""),
    profileBio: String(account.profile_bio ?? ""),
    lastInteractionAt: String(account.last_interaction_at),
    commentsLast30Days: Number(account.comments_last_30_days),
    likesLast30Days: Number(account.likes_last_30_days ?? 0),
    repeatedComments: Number(account.repeated_comments),
    recentCommentPreview: String(account.recent_comment_preview ?? ""),
    recentReactionLabel: String(account.recent_reaction_label ?? ""),
    interactionScore: Number(account.interaction_score),
    inactivityPenalty: Number(account.inactivity_penalty),
    bucket: account.bucket as DashboardPayload["cleanupAccounts"][number]["bucket"],
    tags: (account.tags as string[]) ?? []
  };
}

function normalizeCleanupList(payload: Record<string, unknown>, key: string) {
  const value = payload[key] as Array<Record<string, unknown>> | undefined;
  return value?.map(normalizeCleanupAccount) ?? [];
}

function normalizeDashboardPayload(payload: Record<string, unknown>): DashboardPayload {
  const cleanupSummary = payload.cleanup_summary as Record<string, number>;
  const recommendationSummary = payload.recommendation_summary as Record<string, number>;

  return {
    mockMode: Boolean(payload.mock_mode),
    cleanupSummary: {
      importedFollowers: cleanupSummary.imported_followers,
      importedFollowing: cleanupSummary.imported_following,
      trackedPosts: cleanupSummary.tracked_posts,
      trackedComments: cleanupSummary.tracked_comments,
      dailyFollowerDelta: cleanupSummary.daily_follower_delta ?? 0,
      dailyUnfollowCount: cleanupSummary.daily_unfollow_count ?? 0,
      dailyCommentCount: cleanupSummary.daily_comment_count ?? 0,
      keepCount: cleanupSummary.keep_count,
      reviewCount: cleanupSummary.review_count,
      unfollowCount: cleanupSummary.unfollow_count
    },
    cleanupAccounts: normalizeCleanupList(payload, "cleanup_accounts"),
    followerAccounts: normalizeCleanupList(payload, "follower_accounts"),
    followingAccounts: normalizeCleanupList(payload, "following_accounts"),
    dailyFollowerAccounts: normalizeCleanupList(payload, "daily_follower_accounts"),
    dailyUnfollowAccounts: normalizeCleanupList(payload, "daily_unfollow_accounts"),
    dailyCommentAccounts: normalizeCleanupList(payload, "daily_comment_accounts"),
    recommendationSummary: {
      dailyTopCount: recommendationSummary.daily_top_count,
      savedCount: recommendationSummary.saved_count,
      hiddenCount: recommendationSummary.hidden_count,
      bookmarkedCount: recommendationSummary.bookmarked_count
    },
    recommendations: (payload.recommendations as Array<Record<string, unknown>>).map((item) => ({
      accountId: String(item.account_id),
      username: String(item.username),
      displayName: String(item.display_name ?? item.username),
      profileImage: String(item.profile_image ?? ""),
      lastLoginAt: String(item.last_login_at ?? item.last_posted_at ?? ""),
      recentPostUrl: String(item.recent_post_url ?? ""),
      followerCount: Number(item.follower_count),
      lastPostedAt: String(item.last_posted_at),
      postsPerWeek: Number(item.posts_per_week),
      engagementProxy: Number(item.engagement_proxy),
      categorySimilarity: Number(item.category_similarity),
      recommendationScore: Number(item.recommendation_score),
      categories: (item.categories as string[]) ?? [],
      action: item.action as DashboardPayload["recommendations"][number]["action"]
    }))
  };
}

export async function fetchDashboardData(
  days: WindowDays,
  username?: string,
  instagramUserId?: string
): Promise<DashboardPayload> {
  if (MOCK_MODE) {
    return getMockDashboardData(username);
  }

  const searchParams = new URLSearchParams({ days: String(days) });
  if (username) {
    searchParams.set("username", username);
  }
  if (instagramUserId) {
    searchParams.set("instagram_user_id", instagramUserId);
  }

  const response = await fetch(`${API_BASE_URL}/api/dashboard?${searchParams.toString()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to load dashboard data.");
  }

  return normalizeDashboardPayload((await response.json()) as Record<string, unknown>);
}

export async function uploadSnapshot(snapshotType: "followers" | "following", file: File) {
  if (MOCK_MODE) {
    return {
      snapshotId: `mock-${snapshotType}`,
      snapshotType,
      importedRows: 3,
      filename: file.name,
      mockMode: true
    };
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/api/cleanup/import-snapshot?snapshot_type=${snapshotType}`,
    {
      method: "POST",
      body: formData
    }
  );

  if (!response.ok) {
    throw new Error("Failed to upload CSV.");
  }

  return (await response.json()) as {
    snapshot_id: string;
    snapshot_type: string;
    imported_rows: number;
    filename: string;
    mock_mode: boolean;
  };
}

export async function saveDiscoverySeeds(seedAccounts: string[], hashtags: string[]) {
  if (MOCK_MODE) {
    return { savedSeedAccounts: seedAccounts.length, savedHashtags: hashtags.length, mockMode: true };
  }

  const response = await fetch(`${API_BASE_URL}/api/recommendations/seeds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      seed_accounts: seedAccounts,
      hashtags
    })
  });

  if (!response.ok) {
    throw new Error("Failed to save seeds.");
  }

  return response.json();
}

export async function saveRecommendationAction(
  recommendationId: string,
  action: "saved" | "hidden" | "bookmarked"
) {
  if (MOCK_MODE) {
    return { recommendationId, action, saved: true };
  }

  const response = await fetch(`${API_BASE_URL}/api/recommendations/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recommendation_id: recommendationId,
      action
    })
  });

  if (!response.ok) {
    throw new Error("Failed to save recommendation action.");
  }

  return response.json();
}

export async function runRecalculation() {
  if (MOCK_MODE) {
    return { ranAt: new Date().toISOString(), mockMode: true };
  }

  const response = await fetch(`${API_BASE_URL}/api/jobs/recalculate`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Failed to recalculate dashboard data.");
  }

  return response.json();
}
