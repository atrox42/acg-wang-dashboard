"use client";

import { useEffect, useMemo, useState } from "react";

import { LogoutButton } from "@/components/logout-button";
import { fetchDashboardData, runRecalculation, saveDiscoverySeeds, saveRecommendationAction, uploadSnapshot } from "@/lib/api";
import type { CleanupAccount, DashboardPayload, RecommendationItem, RelationshipBucket, WindowDays } from "@/lib/types";

type TabKey = "relationship" | "recommendations" | "unfollow";
type SummaryPanel =
  | "followers"
  | "following"
  | "recommendations"
  | RelationshipBucket
  | null;
type CommentWindow = "today" | "yesterday" | "week" | "month";
type DailyActivityPanel = "followers" | "unfollow" | "comments";

const UI = {
  title: "\ub9c8\uc774 \uc778\uc2a4\ud0c0\uadf8\ub7a8 \ub300\uc2dc\ubcf4\ub4dc",
  subtitle:
    "\ub0b4 \uacc4\uc815 \ubc18\uc751 \ud750\ub984\uacfc \ucd94\ucc9c \uacc4\uc815\uc744 \ud55c \ud654\uba74\uc5d0\uc11c \ube60\ub974\uac8c \ud655\uc778\ud558\uace0 \uc815\ub9ac\ud569\ub2c8\ub2e4.",
  profileLabel: "\ub0b4 \uacc4\uc815",
  relationshipTab: "\uad00\uacc4",
  recommendationTab: "\ucd94\ucc9c\uacc4\uc815",
  unfollowTab: "\uc5b8\ud314 \ucd94\uc815 \ubaa9\ub85d",
  searchPlaceholder: "\uacc4\uc815 \uac80\uc0c9",
  categoryPlaceholder: "\ud574\uc2dc\ud0dc\uadf8 \uce74\ud14c\uace0\ub9ac \uc785\ub825",
  categoryLabel: "\ud574\uc2dc\ud0dc\uadf8 \uce74\ud14c\uace0\ub9ac",
  recommendationSearchLabel: "\ucd94\ucc9c \uacc4\uc815 \uac80\uc0c9",
  recent7: "\ucd5c\uadfc 7\uc77c",
  recent30: "\ucd5c\uadfc 30\uc77c",
  recent90: "\ucd5c\uadfc 90\uc77c",
  followers: "\ud314\ub85c\uc6cc",
  following: "\ud314\ub85c\uc789",
  unfollow: "\uc5b8\ud314 \ucd94\uc815",
  todayRecommendations: "\uc624\ub298\uc758 \ucd94\ucc9c \uacc4\uc815",
  dailyFollowers: "\uc624\ub298 \ub298\uc5b4\ub09c \ud314\ub85c\uc6cc",
  dailyUnfollow: "\uc624\ub298 \uc5b8\ud314 \ucd94\uc815",
  dailyComments: "\uc624\ub298 \ub313\uae00",
  operatingSummary: "\uc6b4\uc601 \uc694\uc57d",
  summaryText: "\ubc18\uc751\uc774 \uc88b\uc740 \uacc4\uc815\uacfc \uc815\ub9ac\uac00 \ud544\uc694\ud55c \uacc4\uc815\uc744 \ube60\ub974\uac8c \ud655\uc778\ud574\ubcf4\uc138\uc694.",
  closeFriends: "\uce5c\ud55c \uacc4\uc815",
  needsAttention: "\uad00\uc2ec \ud544\uc694",
  allView: "\uc804\uccb4 \ubcf4\uae30",
  account: "\uacc4\uc815",
  status: "\uad00\uacc4\uc0c1\ud0dc",
  intimacy: "\uce5c\ubc00\ub3c4 \uc810\uc218",
  likes: "\uc88b\uc544\uc694 \uc218",
  comments30d: "30\uc77c \ub313\uae00",
  recentReaction: "\ucd5c\uadfc \ubc18\uc751",
  lastReaction: "\ub9c8\uc9c0\ub9c9 \ubc18\uc751",
  latestCommentTitle: "\ucd5c\uc2e0 \ub313\uae00 \ubc18\uc751",
  latestCommentText: "\uae30\uac04\ubcc4\ub85c \ub313\uae00 \ubc18\uc751\uacfc \ub0b4\uc6a9\uc744 \ud655\uc778\ud558\uace0 \uc791\uc131\uc790 \ud504\ub85c\ud544\ub85c \ubc14\ub85c \uc774\ub3d9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
  relationshipChartTitle: "\uad00\uacc4 \ucc28\ud2b8",
  relationshipChartText: "\uacc4\uc815 \uac80\uc0c9\uacfc \uad00\uacc4 \uc0c1\ud0dc \ud544\ud130\ub85c \uadf8\ub8f9\ubcc4 \uacc4\uc815\uc744 \uc548\uc815\uc801\uc73c\ub85c \ud655\uc778\ud569\ub2c8\ub2e4.",
  closeFriendsHint: "\ucd5c\uadfc \ub313\uae00\uacfc \uc88b\uc544\uc694 \ubc18\uc751\uc774 \uafb8\uc900\ud55c \uacc4\uc815",
  needsAttentionHint: "\uad00\uacc4\ub294 \uc788\uc9c0\ub9cc \ucd5c\uadfc \ubc18\uc751\uc774 \uc904\uc5b4\ub4e0 \uacc4\uc815",
  unfollowHint: "\ucd5c\uadfc \ubc18\uc751\uc774 \uc801\uace0 \uc2a4\ub0c5\uc0f7 \ube44\uad50 \uae30\uc900 \uc815\ub9ac \uac00\ub2a5\uc131\uc774 \ub192\uc740 \uacc4\uc815",
  recommendationIntroTitle: "\uc624\ub298\uc758 \ucd94\ucc9c \uacc4\uc815",
  recommendationIntroText:
    "\ub098\uc640 \ud314\ub85c\uc6b0 \uc131\ud5a5\uc774 \ube44\uc2b7\ud558\uace0, \ud314\ub85c\uc6cc 5,000\uba85 \uc774\ud558, \ucd5c\uadfc \uac8c\uc2dc\ubb3c \ud750\ub984\uc774 \ud65c\ubc1c\ud55c \uc544\uc6c3\ub3c4\uc5b4 \uacc4\uc815 \uc704\uc8fc\ub85c \ucd94\ucc9c\ud569\ub2c8\ub2e4.",
  today: "\uc624\ub298",
  yesterday: "\uc5b4\uc81c",
  weekAgo: "\uc77c\uc8fc\uc77c\uc804",
  monthAgo: "30\uc77c\uc804",
  followButton: "\ud504\ub85c\ud544 \ubcf4\uae30",
  saveAction: "\uc800\uc7a5",
  bookmarkAction: "\ubd81\ub9c8\ud06c",
  hideAction: "\uc228\uae30\uae30",
  actionPending: "\ucc98\ub9ac \uc911...",
  recommendationSaved: "\uc800\uc7a5\ub428",
  recommendationBookmarked: "\ubd81\ub9c8\ud06c\ub428",
  recommendationHidden: "\uc228\uae40 \ucc98\ub9ac\ub428",
  recommendationActionSaved: "\ucd94\ucc9c \uacc4\uc815 \uc0c1\ud0dc\ub97c \uc5c5\ub370\uc774\ud2b8\ud588\uc2b5\ub2c8\ub2e4.",
  recommendationActionFailed: "\ucd94\ucc9c \uacc4\uc815 \uc0c1\ud0dc\ub97c \uc800\uc7a5\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.",
  recentLogin: "\ucd5c\uadfc \ud65c\ub3d9",
  followerCount: "\ud314\ub85c\uc6cc",
  weeklyPosts: "\uc8fc\uac04 \uac8c\uc2dc",
  engagement: "\ubc18\uc751\ub960",
  similarity: "\uc720\uc0ac\ub3c4",
  listFollowers: "\ud314\ub85c\uc6cc \ubaa9\ub85d",
  listFollowing: "\ud314\ub85c\uc789 \ubaa9\ub85d",
  listRecommendations: "\uc624\ub298\uc758 \ucd94\ucc9c \uacc4\uc815",
  listCloseFriends: "\uce5c\ud55c \uacc4\uc815 \ubaa9\ub85d",
  listNeedsAttention: "\uad00\uc2ec \ud544\uc694 \ubaa9\ub85d",
  listUnfollow: "\uc5b8\ud314 \ucd94\uc815 \ubaa9\ub85d",
  listDailyFollowers: "\uc624\ub298 \ub298\uc5b4\ub09c \ud314\ub85c\uc6cc",
  listDailyUnfollow: "\uc624\ub298 \uc5b8\ud314 \ucd94\uc815",
  listDailyComments: "\uc624\ub298 \ub313\uae00 \ubaa9\ub85d",
  dailyActivityTitle: "\uc624\ub298 \ud65c\ub3d9 \ubaa9\ub85d",
  dailyActivityText: "\uc624\ub298 \ubc1c\uc0dd\ud55c \ud314\ub85c\uc6cc, \uc5b8\ud314 \ucd94\uc815, \ub313\uae00 \ud750\ub984\uc744 \uce74\ub4dc\ub85c \ud655\uc778\ud569\ub2c8\ub2e4.",
  toolsTitle: "\ub370\uc774\ud130 \uad00\ub9ac",
  toolsText: "CSV \uc5c5\ub85c\ub4dc, \uc2dc\ub4dc \uc800\uc7a5, \uc810\uc218 \uc7ac\uacc4\uc0b0\uc744 \ud55c \uacf3\uc5d0\uc11c \ucc98\ub9ac\ud569\ub2c8\ub2e4.",
  followersUpload: "\ud314\ub85c\uc6cc CSV",
  followingUpload: "\ud314\ub85c\uc789 CSV",
  chooseFile: "\ud30c\uc77c \uc120\ud0dd",
  uploadFollowers: "\ud314\ub85c\uc6cc \uc5c5\ub85c\ub4dc",
  uploadFollowing: "\ud314\ub85c\uc789 \uc5c5\ub85c\ub4dc",
  seedsLabel: "\uc2dc\ub4dc \uacc4\uc815",
  hashtagsLabel: "\ud574\uc2dc\ud0dc\uadf8",
  seedsPlaceholder: "@trail.run, @mountain.diary",
  hashtagsPlaceholder: "#\ud2b8\ub808\uc77c\ub7ec\ub2dd, #\ub4f1\uc0b0",
  saveSeeds: "\uc2dc\ub4dc \uc800\uc7a5",
  recalculate: "\uc810\uc218 \uc7ac\uacc4\uc0b0",
  uploadDone: "CSV \uc5c5\ub85c\ub4dc\uac00 \uc644\ub8cc\ub410\uc2b5\ub2c8\ub2e4.",
  seedsDone: "\uc2dc\ub4dc \uc800\uc7a5\uc774 \uc644\ub8cc\ub410\uc2b5\ub2c8\ub2e4.",
  recalculateDone: "\uc810\uc218 \uc7ac\uacc4\uc0b0\uc774 \uc644\ub8cc\ub410\uc2b5\ub2c8\ub2e4.",
  fileRequired: "CSV \ud30c\uc77c\uc744 \uba3c\uc800 \uc120\ud0dd\ud574\uc8fc\uc138\uc694.",
  toolsBusy: "\ucc98\ub9ac \uc911...",
  invalidLogin: "\ucc98\ub9ac \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.",
  latestCommentsEmpty: "\ud574\ub2f9 \uae30\uac04\uc5d0 \ud45c\uc2dc\ud560 \ub313\uae00\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.",
  loading: "\ub300\uc2dc\ubcf4\ub4dc\ub97c \ubd88\ub7ec\uc624\ub294 \uc911\uc785\ub2c8\ub2e4...",
  noData: "\ub370\uc774\ud130\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.",
  mockMode: "Mock mode",
  liveMode: "Live mode",
  hideCandidateButton: "\ud6c4\ubcf4 \uc228\uae30\uae30",
  unfollowConfirmTitle: "\uc774 \uc5b8\ud314 \ucd94\uc815 \ud6c4\ubcf4\ub97c \ubaa9\ub85d\uc5d0\uc11c \uc228\uae38\uae4c\uc694?",
  unfollowConfirmText: "\uc774 \ud56d\ubaa9\uc740 \uc624\ub298 \ubcf4\uae30\uc5d0\uc11c\ub9cc \uc228\uaca8\uc9c0\uba70, \ub2e4\uc74c \uc2a4\ub0c5\uc0f7 \ube44\uad50\uc5d0\uc11c \ub2e4\uc2dc \ud655\uc778\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
  confirmYes: "\ub124",
  confirmNo: "\uc544\ub2c8\uc624",
  confirmMuteToday: "\uc624\ub298 \ub354\uc774\uc0c1 \ub744\uc6b0\uc9c0 \uc54a\uae30",
  noRecommendations: "\ud604\uc7ac \ud544\ud130\uc5d0 \ub9de\ub294 \ucd94\ucc9c \uacc4\uc815\uc774 \uc5c6\uc2b5\ub2c8\ub2e4."
} as const;

const categoryLabelMap: Record<string, string> = {
  outdoor: "\uc544\uc6c3\ub3c4\uc5b4",
  hiking: "\ud558\uc774\ud0b9",
  camping: "\ucea0\ud551",
  trail: "\ud2b8\ub808\uc77c",
  gear: "\uae30\uc5b4",
  nature: "\uc790\uc5f0"
};

function localizeCategory(category: string) {
  return categoryLabelMap[category] ?? category;
}

function formatScore(value: number) {
  return `${value}\uc810`;
}

function formatPerWeek(value: number) {
  return `${value.toFixed(1)}\ud68c`;
}

function getRecommendationActionLabel(action: RecommendationItem["action"]) {
  if (action === "saved") return UI.recommendationSaved;
  if (action === "bookmarked") return UI.recommendationBookmarked;
  if (action === "hidden") return UI.recommendationHidden;
  return null;
}

function getRecommendationStorageKey(username: string) {
  return `dashboard:${username}:recommendation-actions`;
}

function getHiddenUnfollowStorageKey(username: string) {
  return `dashboard:${username}:hidden-unfollow`;
}

function getInitials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function badgeLabel(bucket: RelationshipBucket) {
  if (bucket === "keep") return UI.closeFriends;
  if (bucket === "review") return UI.needsAttention;
  return UI.unfollow;
}

function badgeClass(bucket: RelationshipBucket) {
  if (bucket === "keep") return "badge keep";
  if (bucket === "review") return "badge review";
  return "badge unfollow";
}

function formatDate(value: string) {
  return new Date(value)
    .toLocaleDateString("ko-KR")
    .replace(/\.\s*$/, "");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR");
}

function daysSince(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function matchesCommentWindow(account: CleanupAccount, windowKey: CommentWindow) {
  const diff = daysSince(account.lastInteractionAt);
  if (windowKey === "today") return diff <= 0;
  if (windowKey === "yesterday") return diff === 1;
  if (windowKey === "week") return diff <= 7;
  return diff <= 30;
}

function Avatar({ name, image, size = "md" }: { name: string; image?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div className={`avatar avatar-${size}`} aria-hidden="true">
      {image ? <img src={image} alt="" /> : <span>{getInitials(name)}</span>}
    </div>
  );
}

function SummaryList({
  title,
  items,
  mode,
  onRemoveUnfollow,
  onOpenProfile
}: {
  title: string;
  items: CleanupAccount[] | RecommendationItem[];
  mode: "accounts" | "recommendations" | "comments";
  onRemoveUnfollow?: (accountId: string) => void;
  onOpenProfile: (usernameValue: string) => void;
}) {
  return (
    <section className="panel summaryPanel">
      <div className="sectionHeader">
        <h2 className="sectionTitle">{title}</h2>
      </div>
      <div className="summaryList">
        {mode === "recommendations"
          ? (items as RecommendationItem[]).map((item) => (
              <button key={item.accountId} className="summaryListCard summaryActionCard" onClick={() => onOpenProfile(item.username)}>
                <Avatar name={item.displayName} image={item.profileImage} size="sm" />
                <div className="summaryListMeta">
                  <strong>@{item.username}</strong>
                  <span className="muted">{item.displayName}</span>
                </div>
                <span className="metricPill">{formatScore(item.recommendationScore)}</span>
              </button>
            ))
          : (items as CleanupAccount[]).map((item) => (
              <div key={item.accountId} className="summaryListCard">
                <button className="summaryProfileButton" onClick={() => onOpenProfile(item.username)}>
                  <Avatar name={item.fullName} image={item.profileImage} size="sm" />
                </button>
                <div className="summaryListMeta">
                  <strong>@{item.username}</strong>
                  <span className="muted">{item.fullName}</span>
                  {mode === "comments" ? <span className="muted">{item.recentCommentPreview}</span> : null}
                </div>
                {mode === "comments" ? (
                  <span className="metricPill">{item.recentReactionLabel ?? UI.today}</span>
                ) : item.bucket === "unfollow" && onRemoveUnfollow ? (
                  <button className="miniDangerButton" onClick={() => onRemoveUnfollow(item.accountId)}>
                    X
                  </button>
                ) : (
                  <span className="metricPill">{formatScore(item.interactionScore)}</span>
                )}
              </div>
            ))}
      </div>
    </section>
  );
}

function RankedList({
  items,
  showRank = true,
  onOpenProfile
}: {
  items: CleanupAccount[];
  showRank?: boolean;
  onOpenProfile: (usernameValue: string) => void;
}) {
  return (
    <div className="rankList">
      {items.map((item, index) => (
        <div key={item.accountId} className="rankItem">
          {showRank ? <span className="rankNumber">{index + 1}</span> : <span className="rankDot" />}
          <button type="button" className="rankProfileButton" onClick={() => onOpenProfile(item.username)}>
            <Avatar name={item.fullName} image={item.profileImage} size="sm" />
            <span className="rankName">@{item.username}</span>
          </button>
        </div>
      ))}
    </div>
  );
}

function DailyAvatarRow({
  items,
  onOpenProfile
}: {
  items: CleanupAccount[];
  onOpenProfile: (usernameValue: string) => void;
}) {
  return (
    <div className="dailyAvatarRow">
      {items.slice(0, 3).map((item) => (
        <span
          key={item.accountId}
          className="dailyAvatarButton"
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            onOpenProfile(item.username);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onOpenProfile(item.username);
            }
          }}
          aria-label={`@${item.username}`}
        >
          <Avatar name={item.fullName} image={item.profileImage} size="sm" />
        </span>
      ))}
    </div>
  );
}

function DailyActivityCard({
  account,
  kind,
  onOpenProfile
}: {
  account: CleanupAccount;
  kind: DailyActivityPanel;
  onOpenProfile: (usernameValue: string) => void;
}) {
  const metaLabel =
    kind === "followers"
      ? "\uc624\ub298 \ud314\ub85c\uc6cc"
      : kind === "unfollow"
        ? "\uc624\ub298 \uc5b8\ud314 \ucd94\uc815"
        : account.recentReactionLabel ?? UI.dailyComments;
  const content =
    kind === "followers"
      ? account.profileBio || account.fullName
      : account.recentCommentPreview || UI.latestCommentsEmpty;

  return (
    <button type="button" className="dailyActivityCard" onClick={() => onOpenProfile(account.username)}>
      <div className="commentTop">
        <div className="tableAccount">
          <Avatar name={account.fullName} image={account.profileImage} size="sm" />
          <div>
            <strong>@{account.username}</strong>
            <div className="muted">{account.fullName}</div>
          </div>
        </div>
        <span className="metricPill">{metaLabel}</span>
      </div>
      <p className="commentText">{content}</p>
    </button>
  );
}

export function Dashboard({
  username,
  displayName,
  preferenceSummary,
  recommendationKeywords
}: {
  username: string;
  displayName: string;
  preferenceSummary: string;
  recommendationKeywords: string[];
}) {
  const [tab, setTab] = useState<TabKey>("relationship");
  const [days, setDays] = useState<WindowDays>(30);
  const [relationshipQuery, setRelationshipQuery] = useState("");
  const [recommendationQuery, setRecommendationQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [recommendationActionLoadingId, setRecommendationActionLoadingId] = useState<string | null>(null);
  const [followersFile, setFollowersFile] = useState<File | null>(null);
  const [followingFile, setFollowingFile] = useState<File | null>(null);
  const [seedAccountsInput, setSeedAccountsInput] = useState("");
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [toolsLoading, setToolsLoading] = useState(false);
  const [summaryPanel, setSummaryPanel] = useState<SummaryPanel>(null);
  const [relationshipFilter, setRelationshipFilter] = useState<RelationshipBucket | "all">("all");
  const [commentWindow, setCommentWindow] = useState<CommentWindow>("month");
  const [dailyActivityPanel, setDailyActivityPanel] = useState<DailyActivityPanel>("followers");
  const [hiddenUnfollowIds, setHiddenUnfollowIds] = useState<string[]>([]);
  const [pendingUnfollowId, setPendingUnfollowId] = useState<string | null>(null);
  const [muteUnfollowPromptToday, setMuteUnfollowPromptToday] = useState(false);

  async function refreshDashboard() {
    const data = await fetchDashboardData(days, username);
    setPayload(data);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDashboardData(days, username);
        if (!cancelled) setPayload(data);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unexpected error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [days, username]);

  useEffect(() => {
    if (!payload) {
      setRecommendations([]);
      return;
    }

    const storedActions =
      typeof window === "undefined"
        ? {}
        : JSON.parse(window.localStorage.getItem(getRecommendationStorageKey(username)) ?? "{}") as Record<
            string,
            RecommendationItem["action"]
          >;

    setRecommendations(
      payload.recommendations.map((item) => ({
        ...item,
        action: storedActions[item.accountId] ?? item.action
      }))
    );
  }, [payload, username]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedHiddenIds = JSON.parse(
      window.localStorage.getItem(getHiddenUnfollowStorageKey(username)) ?? "[]"
    ) as string[];
    setHiddenUnfollowIds(storedHiddenIds);
  }, [username]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(getHiddenUnfollowStorageKey(username), JSON.stringify(hiddenUnfollowIds));
  }, [hiddenUnfollowIds, username]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const actionMap = recommendations.reduce<Record<string, RecommendationItem["action"]>>((accumulator, item) => {
      if (item.action !== "none") {
        accumulator[item.accountId] = item.action;
      }
      return accumulator;
    }, {});
    window.localStorage.setItem(getRecommendationStorageKey(username), JSON.stringify(actionMap));
  }, [recommendations, username]);

  const cleanupAccounts = useMemo(() => {
    if (!payload) return [];
    return payload.cleanupAccounts.filter((account) => !hiddenUnfollowIds.includes(account.accountId));
  }, [payload, hiddenUnfollowIds]);

  const filteredRelationshipAccounts = useMemo(() => {
    const loweredQuery = relationshipQuery.trim().toLowerCase();
    return cleanupAccounts
      .filter((account) => (relationshipFilter === "all" ? true : account.bucket === relationshipFilter))
      .filter((account) =>
        loweredQuery
          ? account.username.toLowerCase().includes(loweredQuery) || account.fullName.toLowerCase().includes(loweredQuery)
          : true
      );
  }, [cleanupAccounts, relationshipQuery, relationshipFilter]);

  const latestCommentAccounts = useMemo(() => {
    return cleanupAccounts
      .filter((account) => matchesCommentWindow(account, commentWindow))
      .sort((left, right) => new Date(right.lastInteractionAt).getTime() - new Date(left.lastInteractionAt).getTime());
  }, [cleanupAccounts, commentWindow]);

  const unfollowAccounts = useMemo(() => cleanupAccounts.filter((account) => account.bucket === "unfollow"), [cleanupAccounts]);

  const recommendationItems = useMemo(() => {
    if (!recommendations.length) return [];
    const loweredQuery = recommendationQuery.trim().toLowerCase();
    const loweredCategory = categoryQuery.trim().toLowerCase();
    return recommendations
      .filter((item) => item.action !== "hidden")
      .filter((item) => {
        const matchesQuery =
          !loweredQuery || item.username.toLowerCase().includes(loweredQuery) || item.displayName.toLowerCase().includes(loweredQuery);
        const matchesCategory =
          !loweredCategory || item.categories.some((category) => localizeCategory(category).toLowerCase().includes(loweredCategory));
        return matchesQuery && matchesCategory;
      });
  }, [recommendations, recommendationQuery, categoryQuery]);

  const closeFriendsAccounts = cleanupAccounts
    .filter((account) => account.bucket === "keep")
    .sort((left, right) => right.interactionScore - left.interactionScore);
  const needsAttentionAccounts = cleanupAccounts
    .filter((account) => account.bucket === "review")
    .sort((left, right) => right.interactionScore - left.interactionScore);
  const topCloseFriends = closeFriendsAccounts.slice(0, 5);
  const topNeedsAttention = needsAttentionAccounts.slice(0, 5);
  const topUnfollowAccounts = unfollowAccounts.slice(0, 5);

  const closeFriendsCount = closeFriendsAccounts.length;
  const needsAttentionCount = needsAttentionAccounts.length;
  const todayCommentAccounts =
    payload?.dailyCommentAccounts.length
      ? payload.dailyCommentAccounts.filter((account) => !hiddenUnfollowIds.includes(account.accountId))
      : cleanupAccounts.filter((account) => matchesCommentWindow(account, "today"));
  const todayFollowerAccounts =
    payload?.dailyFollowerAccounts.length
      ? payload.dailyFollowerAccounts.filter((account) => !hiddenUnfollowIds.includes(account.accountId))
      : cleanupAccounts.slice(0, payload?.cleanupSummary.dailyFollowerDelta ?? 0);
  const todayUnfollowAccounts =
    payload?.dailyUnfollowAccounts.length
      ? payload.dailyUnfollowAccounts.filter((account) => !hiddenUnfollowIds.includes(account.accountId))
      : unfollowAccounts.slice(0, payload?.cleanupSummary.dailyUnfollowCount ?? 0);
  const activeDailyItems =
    dailyActivityPanel === "followers"
      ? todayFollowerAccounts
      : dailyActivityPanel === "unfollow"
        ? todayUnfollowAccounts
        : todayCommentAccounts;

  const followerAccounts =
    payload?.followerAccounts.length
      ? payload.followerAccounts.filter((account) => !hiddenUnfollowIds.includes(account.accountId))
      : cleanupAccounts;
  const followingAccounts =
    payload?.followingAccounts.length
      ? payload.followingAccounts.filter((account) => !hiddenUnfollowIds.includes(account.accountId))
      : cleanupAccounts.slice().reverse();

  const recommendationSummary = useMemo(() => {
    return {
      dailyTopCount: recommendations.filter((item) => item.action !== "hidden").length,
      savedCount: recommendations.filter((item) => item.action === "saved").length,
      hiddenCount: recommendations.filter((item) => item.action === "hidden").length,
      bookmarkedCount: recommendations.filter((item) => item.action === "bookmarked").length
    };
  }, [recommendations]);

  const summaryPanelConfig = useMemo(() => {
    if (!summaryPanel || !payload) return null;
    if (summaryPanel === "followers") return { title: UI.listFollowers, mode: "accounts" as const, items: followerAccounts };
    if (summaryPanel === "following") return { title: UI.listFollowing, mode: "accounts" as const, items: followingAccounts };
    if (summaryPanel === "recommendations") return { title: UI.listRecommendations, mode: "recommendations" as const, items: recommendationItems };
    if (summaryPanel === "keep") return { title: UI.listCloseFriends, mode: "accounts" as const, items: closeFriendsAccounts };
    if (summaryPanel === "review") return { title: UI.listNeedsAttention, mode: "accounts" as const, items: needsAttentionAccounts };
    return { title: UI.listUnfollow, mode: "accounts" as const, items: unfollowAccounts };
  }, [
    closeFriendsAccounts,
    followerAccounts,
    followingAccounts,
    needsAttentionAccounts,
    payload,
    recommendationItems,
    summaryPanel,
    unfollowAccounts
  ]);

  function handleOpenInstagramProfile(usernameValue: string) {
    window.open(`https://www.instagram.com/${usernameValue}/`, "_blank", "noopener,noreferrer");
  }

  async function handleRecommendationAction(
    recommendationId: string,
    action: "saved" | "hidden" | "bookmarked"
  ) {
    const previousRecommendations = recommendations;
    setRecommendationActionLoadingId(recommendationId);
    setRecommendations((current) =>
      current.map((item) =>
        item.accountId === recommendationId
          ? {
              ...item,
              action
            }
          : item
      )
    );

    try {
      await saveRecommendationAction(recommendationId, action);
      setStatusMessage(UI.recommendationActionSaved);
    } catch (actionError) {
      setRecommendations(previousRecommendations);
      setStatusMessage(actionError instanceof Error ? actionError.message : UI.recommendationActionFailed);
    } finally {
      setRecommendationActionLoadingId(null);
    }
  }

  async function handleSnapshotUpload(snapshotType: "followers" | "following") {
    const file = snapshotType === "followers" ? followersFile : followingFile;
    if (!file) {
      setStatusMessage(UI.fileRequired);
      return;
    }

    setToolsLoading(true);
    try {
      await uploadSnapshot(snapshotType, file);
      await runRecalculation();
      await refreshDashboard();
      if (snapshotType === "followers") {
        setFollowersFile(null);
      } else {
        setFollowingFile(null);
      }
      setStatusMessage(UI.uploadDone);
    } catch (toolError) {
      setStatusMessage(toolError instanceof Error ? toolError.message : UI.invalidLogin);
    } finally {
      setToolsLoading(false);
    }
  }

  async function handleSaveSeeds() {
    const seedAccounts = seedAccountsInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const hashtags = hashtagsInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    setToolsLoading(true);
    try {
      await saveDiscoverySeeds(seedAccounts, hashtags);
      await runRecalculation();
      await refreshDashboard();
      setStatusMessage(UI.seedsDone);
    } catch (toolError) {
      setStatusMessage(toolError instanceof Error ? toolError.message : UI.invalidLogin);
    } finally {
      setToolsLoading(false);
    }
  }

  async function handleRecalculate() {
    setToolsLoading(true);
    try {
      await runRecalculation();
      await refreshDashboard();
      setStatusMessage(UI.recalculateDone);
    } catch (toolError) {
      setStatusMessage(toolError instanceof Error ? toolError.message : UI.invalidLogin);
    } finally {
      setToolsLoading(false);
    }
  }

  function commitRemoveUnfollow(accountId: string) {
    setHiddenUnfollowIds((current) => [...current, accountId]);
    setPendingUnfollowId(null);
    setStatusMessage("\uc5b8\ud314\ub85c\uc6b0 \ubaa9\ub85d\uc5d0\uc11c \uc815\ub9ac\ud588\uc2b5\ub2c8\ub2e4.");
  }

  function handleRemoveUnfollow(accountId: string) {
    if (muteUnfollowPromptToday) {
      commitRemoveUnfollow(accountId);
      return;
    }
    setPendingUnfollowId(accountId);
  }

  function handleOpenSummaryPanel(nextPanel: SummaryPanel) {
    setSummaryPanel(nextPanel);
    if (nextPanel === "recommendations") {
      setTab("recommendations");
      return;
    }
    if (nextPanel === "unfollow") {
      setTab("unfollow");
      return;
    }
    setTab("relationship");
  }

  const pendingUnfollowAccount = unfollowAccounts.find((account) => account.accountId === pendingUnfollowId) ?? null;

  if (loading) return <div className="shell">{UI.loading}</div>;
  if (error || !payload) return <div className="shell">Error: {error ?? UI.noData}</div>;

  return (
    <div className="shell">
      <section className="hero heroLayout">
        <div className="heroCard heroMain">
          <div className="heroTopRow">
            <span className="modeBadge">{payload.mockMode ? UI.mockMode : UI.liveMode}</span>
            <div className="logoutAnchor">
              <LogoutButton />
            </div>
          </div>
          <h1 className="heroTitle">{UI.title}</h1>
          <div className="profileRow">
            <Avatar name={username} size="lg" />
            <div>
              <div className="profileLabel">{displayName}</div>
              <div className="profileName">@{username}</div>
            </div>
          </div>
          <p className="heroText">{preferenceSummary}</p>

          <div className="ctaGrid">
            <button className="ctaCard" onClick={() => handleOpenSummaryPanel("followers")}>
              <span className="ctaLabel">{UI.followers}</span>
              <strong className="ctaValue">{followerAccounts.length || payload.cleanupSummary.importedFollowers}</strong>
            </button>
            <button className="ctaCard" onClick={() => handleOpenSummaryPanel("following")}>
              <span className="ctaLabel">{UI.following}</span>
              <strong className="ctaValue">{followingAccounts.length || payload.cleanupSummary.importedFollowing}</strong>
            </button>
            <button className="ctaCard" onClick={() => handleOpenSummaryPanel("unfollow")}>
              <span className="ctaLabel">{UI.unfollow}</span>
              <strong className="ctaValue">{unfollowAccounts.length}</strong>
            </button>
            <button className="ctaCard" onClick={() => handleOpenSummaryPanel("recommendations")}>
              <span className="ctaLabel">{UI.todayRecommendations}</span>
              <strong className="ctaValue">{recommendationSummary.dailyTopCount}</strong>
            </button>
          </div>
        </div>

        <div className="heroCard heroSide">
          <div>
            <h2 className="sectionTitle">{UI.operatingSummary}</h2>
            <p className="muted">{UI.summaryText}</p>
          </div>
          <div className="dailyMetricGrid">
            <button className={`miniStat miniStatButton ${dailyActivityPanel === "followers" ? "selected" : ""}`} onClick={() => setDailyActivityPanel("followers")}>
              <div className="miniStatBody">
                <span className="miniStatLabel">{UI.dailyFollowers}</span>
                <DailyAvatarRow items={todayFollowerAccounts} onOpenProfile={handleOpenInstagramProfile} />
              </div>
              <strong>+{todayFollowerAccounts.length || payload.cleanupSummary.dailyFollowerDelta}</strong>
            </button>
            <button className={`miniStat miniStatButton ${dailyActivityPanel === "unfollow" ? "selected" : ""}`} onClick={() => setDailyActivityPanel("unfollow")}>
              <div className="miniStatBody">
                <span className="miniStatLabel">{UI.dailyUnfollow}</span>
                <DailyAvatarRow items={todayUnfollowAccounts} onOpenProfile={handleOpenInstagramProfile} />
              </div>
              <strong>{todayUnfollowAccounts.length || payload.cleanupSummary.dailyUnfollowCount}</strong>
            </button>
            <button className={`miniStat miniStatButton ${dailyActivityPanel === "comments" ? "selected" : ""}`} onClick={() => setDailyActivityPanel("comments")}>
              <div className="miniStatBody">
                <span className="miniStatLabel">{UI.dailyComments}</span>
                <DailyAvatarRow items={todayCommentAccounts} onOpenProfile={handleOpenInstagramProfile} />
              </div>
              <strong>{todayCommentAccounts.length || payload.cleanupSummary.dailyCommentCount}</strong>
            </button>
          </div>
          <div className="chipRow">
            <button className="summaryChip keep" onClick={() => handleOpenSummaryPanel("keep")}>
              {UI.closeFriends} {closeFriendsCount}
            </button>
            <button className="summaryChip review" onClick={() => handleOpenSummaryPanel("review")}>
              {UI.needsAttention} {needsAttentionCount}
            </button>
            <button className="summaryChip unfollow" onClick={() => handleOpenSummaryPanel("unfollow")}>
              {UI.unfollow} {unfollowAccounts.length}
            </button>
          </div>
        </div>
      </section>

      {summaryPanelConfig ? (
        <SummaryList
          title={summaryPanelConfig.title}
          items={summaryPanelConfig.items}
          mode={summaryPanelConfig.mode}
          onRemoveUnfollow={handleRemoveUnfollow}
          onOpenProfile={handleOpenInstagramProfile}
        />
      ) : null}

      <section className="panel toolPanel">
        <div className="sectionHeader">
          <div>
            <h2 className="sectionTitle">{UI.toolsTitle}</h2>
            <p className="muted">{UI.toolsText}</p>
          </div>
          <button className="button" onClick={handleRecalculate} disabled={toolsLoading}>
            {toolsLoading ? UI.toolsBusy : UI.recalculate}
          </button>
        </div>
        <div className="toolGrid">
          <div className="toolCard">
            <h3 className="sectionTitle">{UI.followersUpload}</h3>
            <input
              className="input"
              type="file"
              accept=".csv"
              onChange={(event) => setFollowersFile(event.target.files?.[0] ?? null)}
            />
            <div className="muted">{followersFile?.name ?? UI.chooseFile}</div>
            <button className="button primary" onClick={() => handleSnapshotUpload("followers")} disabled={toolsLoading}>
              {toolsLoading ? UI.toolsBusy : UI.uploadFollowers}
            </button>
          </div>
          <div className="toolCard">
            <h3 className="sectionTitle">{UI.followingUpload}</h3>
            <input
              className="input"
              type="file"
              accept=".csv"
              onChange={(event) => setFollowingFile(event.target.files?.[0] ?? null)}
            />
            <div className="muted">{followingFile?.name ?? UI.chooseFile}</div>
            <button className="button primary" onClick={() => handleSnapshotUpload("following")} disabled={toolsLoading}>
              {toolsLoading ? UI.toolsBusy : UI.uploadFollowing}
            </button>
          </div>
          <div className="toolCard toolCardWide">
            <div className="filterField">
              <label className="fieldLabel">{UI.seedsLabel}</label>
              <input
                className="input"
                value={seedAccountsInput}
                onChange={(event) => setSeedAccountsInput(event.target.value)}
                placeholder={UI.seedsPlaceholder}
              />
            </div>
            <div className="filterField">
              <label className="fieldLabel">{UI.hashtagsLabel}</label>
              <input
                className="input"
                value={hashtagsInput}
                onChange={(event) => setHashtagsInput(event.target.value)}
                placeholder={UI.hashtagsPlaceholder}
              />
            </div>
            <button className="button primary" onClick={handleSaveSeeds} disabled={toolsLoading}>
              {toolsLoading ? UI.toolsBusy : UI.saveSeeds}
            </button>
          </div>
        </div>
      </section>

      <section className="panel dailyActivitySection">
        <div className="sectionHeader">
          <div>
            <h2 className="sectionTitle">{UI.dailyActivityTitle}</h2>
            <p className="muted">{UI.dailyActivityText}</p>
          </div>
          <div className="segmentedFilters">
            <button
              className={`segmentButton ${dailyActivityPanel === "followers" ? "active" : ""}`}
              onClick={() => setDailyActivityPanel("followers")}
            >
              {UI.dailyFollowers}
            </button>
            <button
              className={`segmentButton ${dailyActivityPanel === "unfollow" ? "active" : ""}`}
              onClick={() => setDailyActivityPanel("unfollow")}
            >
              {UI.dailyUnfollow}
            </button>
            <button
              className={`segmentButton ${dailyActivityPanel === "comments" ? "active" : ""}`}
              onClick={() => setDailyActivityPanel("comments")}
            >
              {UI.dailyComments}
            </button>
          </div>
        </div>
        <div className="dailyActivityGrid">
          {activeDailyItems.length ? (
            activeDailyItems.map((account) => (
              <DailyActivityCard
                key={`${dailyActivityPanel}-${account.accountId}`}
                account={account}
                kind={dailyActivityPanel}
                onOpenProfile={handleOpenInstagramProfile}
              />
            ))
          ) : (
            <div className="commentEmpty">{UI.latestCommentsEmpty}</div>
          )}
        </div>
      </section>

      <div className="tabs">
        <button className={`tabButton ${tab === "relationship" ? "active" : ""}`} onClick={() => setTab("relationship")}>
          {UI.relationshipTab}
        </button>
        <button className={`tabButton ${tab === "recommendations" ? "active" : ""}`} onClick={() => setTab("recommendations")}>
          {UI.recommendationTab}
        </button>
        <button className={`tabButton ${tab === "unfollow" ? "active" : ""}`} onClick={() => setTab("unfollow")}>
          {UI.unfollowTab}
        </button>
      </div>

      {statusMessage ? <p className="statusBanner">{statusMessage}</p> : null}

      {tab === "relationship" ? (
        <section className="panel dashboardPanel">
          <div className="insightCards">
            <div className="insightCard keep">
              <span className="insightLabel">{UI.closeFriends}</span>
              <strong>{closeFriendsCount}</strong>
              <p className="muted">{UI.closeFriendsHint}</p>
              <RankedList items={topCloseFriends} onOpenProfile={handleOpenInstagramProfile} />
            </div>
            <div className="insightCard review">
              <span className="insightLabel">{UI.needsAttention}</span>
              <strong>{needsAttentionCount}</strong>
              <p className="muted">{UI.needsAttentionHint}</p>
              <RankedList items={topNeedsAttention} onOpenProfile={handleOpenInstagramProfile} />
            </div>
            <div className="insightCard unfollow">
              <span className="insightLabel">{UI.unfollow}</span>
              <strong>{unfollowAccounts.length}</strong>
              <p className="muted">{UI.unfollowHint}</p>
              <RankedList items={topUnfollowAccounts} showRank={false} onOpenProfile={handleOpenInstagramProfile} />
            </div>
          </div>

          <div className="commentsPanel">
            <div className="sectionHeader commentsHeader">
              <div>
                <h2 className="sectionTitle">{UI.latestCommentTitle}</h2>
                <p className="muted">{UI.latestCommentText}</p>
              </div>
              <div className="miniTabs">
                <button className={`miniTab ${commentWindow === "today" ? "active" : ""}`} onClick={() => setCommentWindow("today")}>
                  {UI.today}
                </button>
                <button className={`miniTab ${commentWindow === "yesterday" ? "active" : ""}`} onClick={() => setCommentWindow("yesterday")}>
                  {UI.yesterday}
                </button>
                <button className={`miniTab ${commentWindow === "week" ? "active" : ""}`} onClick={() => setCommentWindow("week")}>
                  {UI.weekAgo}
                </button>
                <button className={`miniTab ${commentWindow === "month" ? "active" : ""}`} onClick={() => setCommentWindow("month")}>
                  {UI.monthAgo}
                </button>
              </div>
            </div>
            <div className="commentFeedGrid">
              {latestCommentAccounts.length ? (
                latestCommentAccounts.map((account) => (
                  <button
                    key={account.accountId}
                    type="button"
                    className="commentItem commentLinkCard"
                    onClick={() => handleOpenInstagramProfile(account.username)}
                  >
                    <div className="commentTop">
                      <div className="tableAccount">
                        <Avatar name={account.fullName} image={account.profileImage} size="sm" />
                        <div>
                          <strong>@{account.username}</strong>
                          <div className="muted">{account.fullName}</div>
                        </div>
                      </div>
                      <span className="metricPill">{account.recentReactionLabel ?? UI.monthAgo}</span>
                    </div>
                    <p className="commentText">{account.recentCommentPreview || UI.latestCommentsEmpty}</p>
                  </button>
                ))
              ) : (
                <div className="commentEmpty">{UI.latestCommentsEmpty}</div>
              )}
            </div>
          </div>

          <div className="tablePanel">
            <div className="tableHeaderBlock">
              <div>
                <h3 className="sectionTitle">{UI.relationshipChartTitle}</h3>
                <p className="muted">{UI.relationshipChartText}</p>
              </div>
              <div className="timeFilterGroup">
                {[7, 30, 90].map((value) => (
                  <button
                    key={value}
                    className={`filterButton ${days === value ? "active" : ""}`}
                    onClick={() => setDays(value as WindowDays)}
                  >
                    {value === 7 ? UI.recent7 : value === 30 ? UI.recent30 : UI.recent90}
                  </button>
                ))}
              </div>
            </div>

            <div className="tableToolbar chartToolbar">
              <input
                className="input chartSearch compactSearch"
                placeholder={UI.searchPlaceholder}
                value={relationshipQuery}
                onChange={(event) => setRelationshipQuery(event.target.value)}
              />
              <div className="segmentedFilters">
                <button className={`segmentButton ${relationshipFilter === "all" ? "active" : ""}`} onClick={() => setRelationshipFilter("all")}>
                  {UI.allView}
                </button>
                <button
                  className={`segmentButton keep ${relationshipFilter === "keep" ? "active" : ""}`}
                  onClick={() => setRelationshipFilter("keep")}
                >
                  {UI.closeFriends}
                </button>
                <button
                  className={`segmentButton review ${relationshipFilter === "review" ? "active" : ""}`}
                  onClick={() => setRelationshipFilter("review")}
                >
                  {UI.needsAttention}
                </button>
                <button
                  className={`segmentButton unfollow ${relationshipFilter === "unfollow" ? "active" : ""}`}
                  onClick={() => setRelationshipFilter("unfollow")}
                >
                  {UI.unfollow}
                </button>
              </div>
            </div>

            <div className="tableWrap stableTableWrap">
              <table className="relationshipTable">
                <colgroup>
                  <col className="col-account" />
                  <col className="col-status" />
                  <col className="col-metric" />
                  <col className="col-metric" />
                  <col className="col-metric" />
                  <col className="col-recent" />
                  <col className="col-date" />
                </colgroup>
                <thead>
                  <tr>
                    <th>{UI.account}</th>
                    <th>{UI.status}</th>
                    <th>{UI.intimacy}</th>
                    <th>{UI.likes}</th>
                    <th>{UI.comments30d}</th>
                    <th>{UI.recentReaction}</th>
                    <th>{UI.lastReaction}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRelationshipAccounts.map((account) => (
                    <tr key={account.accountId}>
                      <td>
                        <div className="tableAccount">
                          <button type="button" className="tableProfileButton" onClick={() => handleOpenInstagramProfile(account.username)}>
                            <Avatar name={account.fullName} image={account.profileImage} size="sm" />
                          </button>
                          <button type="button" className="tableProfileButton tableProfileMeta" onClick={() => handleOpenInstagramProfile(account.username)}>
                            <div>
                              <strong>@{account.username}</strong>
                              <div className="muted">{account.fullName}</div>
                            </div>
                          </button>
                        </div>
                      </td>
                      <td><span className={badgeClass(account.bucket)}>{badgeLabel(account.bucket)}</span></td>
                      <td>{account.interactionScore}</td>
                      <td>{account.likesLast30Days}</td>
                      <td>{account.commentsLast30Days}</td>
                      <td>{account.recentReactionLabel ?? "-"}</td>
                      <td>{formatDate(account.lastInteractionAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "recommendations" ? (
        <section className="panel dashboardPanel">
          <div className="commentsPanel recommendationIntroPanel">
            <h2 className="sectionTitle">{UI.recommendationIntroTitle}</h2>
            <p className="muted">{UI.recommendationIntroText}</p>
            <div className="pillRow recommendationTags" style={{ marginTop: 12 }}>
              {recommendationKeywords.map((keyword) => (
                <span key={keyword} className="tag">
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          <div className="recommendationFilterPanel">
            <div className="filterField">
              <label className="fieldLabel">{UI.categoryLabel}</label>
              <input
                className="input recommendationInput"
                placeholder={UI.categoryPlaceholder}
                value={categoryQuery}
                onChange={(event) => setCategoryQuery(event.target.value)}
              />
            </div>
            <div className="filterField">
              <label className="fieldLabel">{UI.recommendationSearchLabel}</label>
              <input
                className="input recommendationInput"
                placeholder={UI.searchPlaceholder}
                value={recommendationQuery}
                onChange={(event) => setRecommendationQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="recommendationList">
            {recommendationItems.length ? (
              recommendationItems.map((item) => (
                <div key={item.accountId} className="recommendationCard cleanCard">
                  <div className="recommendationHeader">
                    <div className="profileBlock">
                      <Avatar name={item.displayName} image={item.profileImage} />
                      <div>
                        <strong>@{item.username}</strong>
                        <div className="muted">{item.displayName}</div>
                        <div className="muted">
                          {UI.recentLogin} {formatDateTime(item.lastLoginAt)}
                        </div>
                      </div>
                    </div>
                    <div className="recommendationActions">
                      <button className="button primary wideButton" onClick={() => handleOpenInstagramProfile(item.username)}>
                        {UI.followButton}
                      </button>
                    </div>
                  </div>
                  {getRecommendationActionLabel(item.action) ? (
                    <div className="pillRow recommendationStatusRow">
                      <span className="metricPill">{getRecommendationActionLabel(item.action)}</span>
                    </div>
                  ) : null}
                  <div className="pillRow recommendationTags">
                    {item.categories.map((category) => (
                      <span key={category} className="tag">
                        {localizeCategory(category)}
                      </span>
                    ))}
                  </div>
                  <div className="recommendationMetrics">
                    <div className="metricCard">
                      <span className="muted">{UI.followerCount}</span>
                      <strong>{item.followerCount.toLocaleString()}</strong>
                    </div>
                    <div className="metricCard">
                      <span className="muted">{UI.weeklyPosts}</span>
                      <strong>{formatPerWeek(item.postsPerWeek)}</strong>
                    </div>
                    <div className="metricCard">
                      <span className="muted">{UI.engagement}</span>
                      <strong>{Math.round(item.engagementProxy * 1000) / 10}%</strong>
                    </div>
                    <div className="metricCard">
                      <span className="muted">{UI.similarity}</span>
                      <strong>{Math.round(item.categorySimilarity * 100)}%</strong>
                    </div>
                  </div>
                  <div className="recommendationActions secondaryActions">
                    <button
                      className="button"
                      onClick={() => handleRecommendationAction(item.accountId, "saved")}
                      disabled={recommendationActionLoadingId === item.accountId}
                    >
                      {recommendationActionLoadingId === item.accountId ? UI.actionPending : UI.saveAction}
                    </button>
                    <button
                      className="button"
                      onClick={() => handleRecommendationAction(item.accountId, "bookmarked")}
                      disabled={recommendationActionLoadingId === item.accountId}
                    >
                      {recommendationActionLoadingId === item.accountId ? UI.actionPending : UI.bookmarkAction}
                    </button>
                    <button
                      className="button"
                      onClick={() => handleRecommendationAction(item.accountId, "hidden")}
                      disabled={recommendationActionLoadingId === item.accountId}
                    >
                      {recommendationActionLoadingId === item.accountId ? UI.actionPending : UI.hideAction}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="commentEmpty">{UI.noRecommendations}</div>
            )}
          </div>
        </section>
      ) : null}

      {tab === "unfollow" ? (
        <section className="panel dashboardPanel">
          <div className="sectionHeader">
            <h2 className="sectionTitle">{UI.unfollowTab}</h2>
          </div>
          <div className="unfollowGrid">
            {unfollowAccounts.map((account) => (
              <div key={account.accountId} className="unfollowCard cleanCard">
                <div className="unfollowHeader">
                  <div className="tableAccount">
                    <Avatar name={account.fullName} image={account.profileImage} />
                    <div>
                      <strong>@{account.username}</strong>
                      <div className="muted">{account.fullName}</div>
                    </div>
                  </div>
                </div>
                <div className="unfollowMeta">
                  <span className={badgeClass(account.bucket)}>{badgeLabel(account.bucket)}</span>
                  <span className="metricPill">
                    {UI.intimacy} {account.interactionScore}
                  </span>
                  <span className="metricPill">
                    {UI.comments30d} {account.commentsLast30Days}
                  </span>
                </div>
                <p className="commentText">{account.recentCommentPreview || UI.latestCommentsEmpty}</p>
                <div className="muted">
                  {UI.lastReaction} {formatDate(account.lastInteractionAt)}
                </div>
                <div className="unfollowActions">
                  <button className="button" onClick={() => handleOpenInstagramProfile(account.username)}>
                    {UI.followButton}
                  </button>
                  <button className="button" onClick={() => handleRemoveUnfollow(account.accountId)}>
                    {UI.hideCandidateButton}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {pendingUnfollowAccount ? (
        <div className="modalOverlay" role="presentation">
          <div className="confirmModal" role="dialog" aria-modal="true" aria-labelledby="unfollow-confirm-title">
            <h2 id="unfollow-confirm-title" className="sectionTitle">
              {UI.unfollowConfirmTitle}
            </h2>
            <div className="modalProfileRow">
              <Avatar name={pendingUnfollowAccount.fullName} image={pendingUnfollowAccount.profileImage} />
              <div>
                <strong>@{pendingUnfollowAccount.username}</strong>
                <div className="muted">{pendingUnfollowAccount.fullName}</div>
              </div>
            </div>
            <p className="muted">{UI.unfollowConfirmText}</p>
            <div className="modalActions">
              <button className="button primary" onClick={() => commitRemoveUnfollow(pendingUnfollowAccount.accountId)}>
                {UI.confirmYes}
              </button>
              <button className="button" onClick={() => setPendingUnfollowId(null)}>
                {UI.confirmNo}
              </button>
              <button
                className="button"
                onClick={() => {
                  setMuteUnfollowPromptToday(true);
                  commitRemoveUnfollow(pendingUnfollowAccount.accountId);
                }}
              >
                {UI.confirmMuteToday}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
