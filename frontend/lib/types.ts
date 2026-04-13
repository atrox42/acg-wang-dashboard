export type WindowDays = 7 | 30 | 90;

export type RelationshipBucket = "keep" | "review" | "unfollow";

export interface AppUserProfile {
  username: string;
  password: string;
  displayName: string;
  instagramHandle: string;
  profileImage?: string;
  preferenceSummary: string;
  recommendationKeywords: string[];
}

export interface CleanupAccount {
  accountId: string;
  username: string;
  fullName: string;
  profileImage?: string;
  profileBio?: string;
  lastInteractionAt: string;
  commentsLast30Days: number;
  likesLast30Days: number;
  repeatedComments: number;
  recentCommentPreview?: string;
  recentReactionLabel?: string;
  interactionScore: number;
  inactivityPenalty: number;
  bucket: RelationshipBucket;
  tags: string[];
}

export interface CleanupSummary {
  importedFollowers: number;
  importedFollowing: number;
  trackedPosts: number;
  trackedComments: number;
  dailyFollowerDelta: number;
  dailyUnfollowCount: number;
  dailyCommentCount: number;
  keepCount: number;
  reviewCount: number;
  unfollowCount: number;
}

export interface RecommendationItem {
  accountId: string;
  username: string;
  displayName: string;
  profileImage?: string;
  lastLoginAt: string;
  recentPostUrl?: string;
  followerCount: number;
  lastPostedAt: string;
  postsPerWeek: number;
  engagementProxy: number;
  categorySimilarity: number;
  recommendationScore: number;
  categories: string[];
  action: "saved" | "hidden" | "bookmarked" | "none";
}

export interface RecommendationSummary {
  dailyTopCount: number;
  savedCount: number;
  hiddenCount: number;
  bookmarkedCount: number;
}

export interface ConnectedProfile {
  username?: string;
  displayName?: string;
  profileImage?: string;
  followerCount: number;
  followingCount: number;
  mediaCount: number;
}

export interface DashboardPayload {
  mockMode: boolean;
  connectedProfile?: ConnectedProfile | null;
  cleanupSummary: CleanupSummary;
  cleanupAccounts: CleanupAccount[];
  followerAccounts: CleanupAccount[];
  followingAccounts: CleanupAccount[];
  dailyFollowerAccounts: CleanupAccount[];
  dailyUnfollowAccounts: CleanupAccount[];
  dailyCommentAccounts: CleanupAccount[];
  recommendationSummary: RecommendationSummary;
  recommendations: RecommendationItem[];
}
