import type { DashboardPayload } from "@/lib/types";

const baseData: DashboardPayload = {
  mockMode: true,
  cleanupSummary: {
    importedFollowers: 1342,
    importedFollowing: 981,
    trackedPosts: 214,
    trackedComments: 1487,
    dailyFollowerDelta: 3,
    dailyUnfollowCount: 3,
    dailyCommentCount: 3,
    keepCount: 46,
    reviewCount: 31,
    unfollowCount: 18
  },
  cleanupAccounts: [
    {
      accountId: "acct_001",
      username: "design.jisu",
      fullName: "Jisu Design",
      profileImage: "",
      profileBio: "\ube0c\ub79c\ub4dc \uc544\ud2b8\ub514\ub809\uc158\uacfc \ud3b8\uc9d1 \uae30\ub85d\uc744 \uc62c\ub9ac\ub294 \ub514\uc790\uc774\ub108",
      lastInteractionAt: "2026-03-23T08:30:00Z",
      commentsLast30Days: 8,
      likesLast30Days: 26,
      repeatedComments: 4,
      recentCommentPreview: "\uc774\ubc88 \ud3ec\uc2a4\ud2b8 \ub108\ubb34 \uc88b\uc544\uc694. \ub2e4\uc74c \uc791\uc5c5\ub3c4 \uae30\ub300\ud560\uac8c\uc694.",
      recentReactionLabel: "\uc624\ub298 \ub313\uae00",
      interactionScore: 92,
      inactivityPenalty: 0,
      bucket: "keep",
      tags: ["\ucd5c\uadfc \ub313\uae00"]
    },
    {
      accountId: "acct_002",
      username: "trail.harin",
      fullName: "Harin Trail Journal",
      profileImage: "",
      profileBio: "\ud2b8\ub808\uc77c \ub7ec\ub2dd\uacfc \uc0b0 \ucf54\uc2a4 \uae30\ub85d\uc744 \ub098\ub204\ub294 \uc544\uc6c3\ub3c4\uc5b4 \uc800\ub110",
      lastInteractionAt: "2026-03-23T06:10:00Z",
      commentsLast30Days: 7,
      likesLast30Days: 24,
      repeatedComments: 3,
      recentCommentPreview: "\uc0b0 \ucf54\uc2a4 \uc815\ub9ac\uac00 \ub108\ubb34 \uc88b\uc544\uc694. \ub2e4\uc74c\uc5d0 \uac19\uc774 \uac00\uace0 \uc2f6\uc5b4\uc694.",
      recentReactionLabel: "\uc624\ub298 \ub313\uae00",
      interactionScore: 88,
      inactivityPenalty: 1,
      bucket: "keep",
      tags: ["\ud558\uc774\ud0b9"]
    },
    {
      accountId: "acct_003",
      username: "photo.sena",
      fullName: "Sena Photo",
      profileImage: "",
      profileBio: "\uc790\uc5f0\uacfc \uc0ac\ub78c\uc758 \uc21c\uac04\uc744 \ub2f4\ub294 \ub77c\uc774\ud504\uc2a4\ud0c0\uc77c \ud3ec\ud1a0\uadf8\ub798\ud37c",
      lastInteractionAt: "2026-03-22T09:15:00Z",
      commentsLast30Days: 6,
      likesLast30Days: 22,
      repeatedComments: 2,
      recentCommentPreview: "\uc0c9\uac10 \uc9c4\uc9dc \uc88b\ub2e4. \uc774\ubc88 \ucef7 \ub290\ub08c \ub108\ubb34 \uc608\ube68\uc694.",
      recentReactionLabel: "\uc5b4\uc81c \ub313\uae00",
      interactionScore: 83,
      inactivityPenalty: 2,
      bucket: "keep",
      tags: ["\ud06c\ub9ac\uc5d0\uc774\ud130"]
    },
    {
      accountId: "acct_004",
      username: "camp.minji",
      fullName: "Minji Camp Notes",
      profileImage: "",
      profileBio: "\ucea0\ud551 \uc7a5\ube44\uc640 \uc8fc\ub9d0 \ucc28\ubc15 \uae30\ub85d\uc744 \uc815\ub9ac\ud558\ub294 \uc544\uc774\ube0c",
      lastInteractionAt: "2026-03-21T07:40:00Z",
      commentsLast30Days: 5,
      likesLast30Days: 18,
      repeatedComments: 2,
      recentCommentPreview: "\ucea0\ud551 \uc7a5\ube44 \uc870\ud569 \ucc38 \uc88b\uc544\uc694. \ub098\uc911\uc5d0 \ucc38\uace0\ud560\uac8c\uc694.",
      recentReactionLabel: "2\uc77c \uc804",
      interactionScore: 79,
      inactivityPenalty: 4,
      bucket: "keep",
      tags: ["\ucea0\ud551"]
    },
    {
      accountId: "acct_005",
      username: "mountain.ora",
      fullName: "Ora Mountain Diary",
      profileImage: "",
      profileBio: "\ub4f1\uc0b0 \ub8e8\ud2b8\uc640 \uc0b0 \ud48d\uacbd\uc744 \uae30\ub85d\ud558\ub294 \ub9c8\uc6b4\ud2f4 \ub2e4\uc774\uc5b4\ub9ac",
      lastInteractionAt: "2026-03-20T10:05:00Z",
      commentsLast30Days: 4,
      likesLast30Days: 15,
      repeatedComments: 1,
      recentCommentPreview: "\uc0ac\uc9c4\uc774 \uc2dc\uc6d0\ud574\uc11c \ubcf4\ub294 \ub0b4\ub0b4 \uc88b\uc558\uc5b4\uc694.",
      recentReactionLabel: "3\uc77c \uc804",
      interactionScore: 74,
      inactivityPenalty: 7,
      bucket: "keep",
      tags: ["\uc544\uc6c3\ub3c4\uc5b4"]
    },
    {
      accountId: "acct_006",
      username: "cafe.min",
      fullName: "Min Cafe Notes",
      profileImage: "",
      profileBio: "\uc88b\uc740 \uacf5\uac04\uacfc \uce74\ud398 \ubb34\ub4dc\ub97c \uae30\ub85d\ud558\ub294 \ub178\ud2b8",
      lastInteractionAt: "2026-03-22T11:00:00Z",
      commentsLast30Days: 3,
      likesLast30Days: 14,
      repeatedComments: 1,
      recentCommentPreview: "\uc5ec\uae30 \ubd84\uc704\uae30 \ub108\ubb34 \uc88b\uc544 \ubcf4\uc5ec\uc694. \uc800\uc7a5\ud574\ub458\uac8c\uc694.",
      recentReactionLabel: "\uc5b4\uc81c \ub313\uae00",
      interactionScore: 68,
      inactivityPenalty: 8,
      bucket: "review",
      tags: ["\uad00\uc2ec \ud544\uc694"]
    },
    {
      accountId: "acct_007",
      username: "startup.jay",
      fullName: "Jay Startup",
      profileImage: "",
      profileBio: "\ube0c\ub79c\ub4dc \ube4c\ub529\uacfc \ucc3d\uc5c5 \uc77c\uc0c1\uc744 \ub098\ub204\ub294 \ud30c\uc6b4\ub354",
      lastInteractionAt: "2026-03-17T09:15:00Z",
      commentsLast30Days: 1,
      likesLast30Days: 7,
      repeatedComments: 0,
      recentCommentPreview: "\uc694\uc998 \uc5b4\ub5bb\uac8c \uc9c0\ub0b4\uc138\uc694?",
      recentReactionLabel: "\uc77c\uc8fc\uc77c \uc804",
      interactionScore: 48,
      inactivityPenalty: 18,
      bucket: "review",
      tags: ["\ubc18\uc751 \ube48\ub3c4 \ub0ae\uc74c"]
    },
    {
      accountId: "acct_008",
      username: "forest.soo",
      fullName: "Soo Forest Mood",
      profileImage: "",
      profileBio: "\uc232 \uc0b0\ucc45\uacfc \ud53c\ub4dc \ubb34\ub4dc\ub97c \uae30\ub85d\ud558\ub294 \ub77c\uc774\ud504\uc2a4\ud0c0\uc77c \uacc4\uc815",
      lastInteractionAt: "2026-03-16T13:05:00Z",
      commentsLast30Days: 2,
      likesLast30Days: 9,
      repeatedComments: 1,
      recentCommentPreview: "\uc694\uc998 \uac8c\uc2dc\ubb3c\uc740 \uc88b\uc9c0\ub9cc \uc18c\ud1b5\uc740 \uc870\uae08 \uc904\uc5c8\ub124\uc694.",
      recentReactionLabel: "\uc77c\uc8fc\uc77c \uc804",
      interactionScore: 44,
      inactivityPenalty: 19,
      bucket: "review",
      tags: ["\uc18c\ud1b5 \uc904\uc5b4\ub4ec"]
    },
    {
      accountId: "acct_009",
      username: "river.dae",
      fullName: "Dae River Walk",
      profileImage: "",
      profileBio: "\uac15\ubcc0 \uc0b0\ucc45\uacfc \uc5ec\ud589 \ud750\ub984\uc744 \uac00\ubccd\uac8c \uae30\ub85d\ud558\ub294 \ud53c\ub4dc",
      lastInteractionAt: "2026-03-14T05:30:00Z",
      commentsLast30Days: 1,
      likesLast30Days: 6,
      repeatedComments: 0,
      recentCommentPreview: "\uc5ec\ud589 \ud750\ub984\uc740 \uc88b\uc740\ub370 \ucd5c\uadfc \ubc18\uc751\uc740 \uc870\uc6a9\ud574\uc694.",
      recentReactionLabel: "9\uc77c \uc804",
      interactionScore: 41,
      inactivityPenalty: 21,
      bucket: "review",
      tags: ["\uc870\uc6a9\ud55c \uad00\uacc4"]
    },
    {
      accountId: "acct_010",
      username: "gear.noah",
      fullName: "Noah Gear Memo",
      profileImage: "",
      profileBio: "\ub4f1\uc0b0 \uae30\uc5b4\uc640 \uc57c\uc678 \uc7a5\ube44 \ub9ac\ubdf0\ub97c \ubaa8\uc544\ubcf4\ub294 \uba54\ubaa8",
      lastInteractionAt: "2026-03-12T12:20:00Z",
      commentsLast30Days: 1,
      likesLast30Days: 4,
      repeatedComments: 0,
      recentCommentPreview: "\uc5d0\uc804\uc5d4 \uc790\uc8fc \ubd24\ub294\ub370 \uc694\uc998\uc740 \uc870\uae08 \uba40\uc5b4\uc9c4 \ub290\ub08c\uc774\uc5d0\uc694.",
      recentReactionLabel: "11\uc77c \uc804",
      interactionScore: 40,
      inactivityPenalty: 23,
      bucket: "review",
      tags: ["\uad00\uacc4 \uacbd\uacc4"]
    },
    {
      accountId: "acct_011",
      username: "old.contact",
      fullName: "Old Contact",
      profileImage: "",
      profileBio: "\uc608\uc804 \uc5f0\uacb0 \uacc4\uc815",
      lastInteractionAt: "2026-02-19T05:00:00Z",
      commentsLast30Days: 0,
      likesLast30Days: 1,
      repeatedComments: 0,
      recentCommentPreview: "\ucd5c\uadfc \ub313\uae00 \uc5c6\uc74c",
      recentReactionLabel: "30\uc77c \uc804",
      interactionScore: 21,
      inactivityPenalty: 35,
      bucket: "unfollow",
      tags: ["\ube44\ud65c\uc131"]
    },
    {
      accountId: "acct_012",
      username: "random.market",
      fullName: "Market Curation",
      profileImage: "",
      profileBio: "\uc18c\uc18c\ud55c \ub9c8\ucf13 \uc18c\uc2dd\uacfc \uc2e0\uc0c1 \uae30\ub85d",
      lastInteractionAt: "2026-02-11T09:15:00Z",
      commentsLast30Days: 0,
      likesLast30Days: 0,
      repeatedComments: 0,
      recentCommentPreview: "\ucd5c\uadfc \ub313\uae00 \uc5c6\uc74c",
      recentReactionLabel: "30\uc77c \uc804",
      interactionScore: 12,
      inactivityPenalty: 44,
      bucket: "unfollow",
      tags: ["\uc624\ub798\ub41c \uc5f0\uacb0"]
    },
    {
      accountId: "acct_013",
      username: "unused.memo",
      fullName: "Unused Memo",
      profileImage: "",
      profileBio: "\uae30\ub85d\uc6a9 \uc11c\ube0c \uacc4\uc815",
      lastInteractionAt: "2026-02-09T07:40:00Z",
      commentsLast30Days: 0,
      likesLast30Days: 0,
      repeatedComments: 0,
      recentCommentPreview: "\ubd80\ub2f4 \uc5c6\uc774 \uc815\ub9ac\ud574\ub3c4 \ub418\ub294 \uacc4\uc815\uc73c\ub85c \ubcf4\uc5ec\uc694.",
      recentReactionLabel: "30\uc77c \uc804",
      interactionScore: 10,
      inactivityPenalty: 46,
      bucket: "unfollow",
      tags: ["\uc815\ub9ac \ud6c4\ubcf4"]
    },
    {
      accountId: "acct_014",
      username: "stale.ping",
      fullName: "Stale Ping",
      profileImage: "",
      profileBio: "\uc18c\uc2dd \uc5c5\ub370\uc774\ud2b8\uac00 \ub4dc\ubb38 \uacc4\uc815",
      lastInteractionAt: "2026-02-05T07:10:00Z",
      commentsLast30Days: 0,
      likesLast30Days: 1,
      repeatedComments: 0,
      recentCommentPreview: "\ub9c8\uc9c0\ub9c9 \uc18c\ud1b5 \uc774\ud6c4 \uc624\ub798 \uc9c0\ub0ac\uc2b5\ub2c8\ub2e4.",
      recentReactionLabel: "30\uc77c \uc804",
      interactionScore: 8,
      inactivityPenalty: 49,
      bucket: "unfollow",
      tags: ["\uc7a5\uae30 \ube44\ud65c\uc131"]
    },
    {
      accountId: "acct_015",
      username: "silent.loop",
      fullName: "Silent Loop",
      profileImage: "",
      profileBio: "\uc9e7\uc740 \uba54\ubaa8\uc640 \uae30\ub85d \uc704\uc8fc \uacc4\uc815",
      lastInteractionAt: "2026-01-28T03:40:00Z",
      commentsLast30Days: 0,
      likesLast30Days: 0,
      repeatedComments: 0,
      recentCommentPreview: "\ucd5c\uadfc \ud65c\ub3d9 \ud750\ub984\uc774 \uac70\uc758 \uc5c6\uc2b5\ub2c8\ub2e4.",
      recentReactionLabel: "30\uc77c \uc804",
      interactionScore: 5,
      inactivityPenalty: 52,
      bucket: "unfollow",
      tags: ["\ud750\ub984 \uc5c6\uc74c"]
    }
  ],
  followerAccounts: [],
  followingAccounts: [],
  dailyFollowerAccounts: [],
  dailyUnfollowAccounts: [],
  dailyCommentAccounts: [],
  recommendationSummary: {
    dailyTopCount: 50,
    savedCount: 9,
    hiddenCount: 6,
    bookmarkedCount: 13
  },
  recommendations: [
    {
      accountId: "rec_001",
      username: "outdoor.jina",
      displayName: "Outdoor Jina",
      profileImage: "",
      lastLoginAt: "2026-03-23T07:45:00Z",
      recentPostUrl: "https://instagram.com/outdoor.jina/",
      followerCount: 3200,
      lastPostedAt: "2026-03-22T07:00:00Z",
      postsPerWeek: 4.2,
      engagementProxy: 0.072,
      categorySimilarity: 0.89,
      recommendationScore: 91,
      categories: ["outdoor", "hiking", "trail"],
      action: "saved"
    },
    {
      accountId: "rec_002",
      username: "camping.mira",
      displayName: "Camping Mira",
      profileImage: "",
      lastLoginAt: "2026-03-23T08:20:00Z",
      recentPostUrl: "https://instagram.com/camping.mira/",
      followerCount: 1850,
      lastPostedAt: "2026-03-21T12:10:00Z",
      postsPerWeek: 5.1,
      engagementProxy: 0.065,
      categorySimilarity: 0.82,
      recommendationScore: 88,
      categories: ["outdoor", "camping", "nature"],
      action: "bookmarked"
    },
    {
      accountId: "rec_003",
      username: "gear.trail",
      displayName: "Gear Trail",
      profileImage: "",
      lastLoginAt: "2026-03-22T19:05:00Z",
      recentPostUrl: "https://instagram.com/gear.trail/",
      followerCount: 4700,
      lastPostedAt: "2026-03-20T14:50:00Z",
      postsPerWeek: 3.3,
      engagementProxy: 0.044,
      categorySimilarity: 0.77,
      recommendationScore: 79,
      categories: ["outdoor", "gear", "camping"],
      action: "hidden"
    },
    {
      accountId: "rec_004",
      username: "ridge.eun",
      displayName: "Eun Ridge Log",
      profileImage: "",
      lastLoginAt: "2026-03-23T05:30:00Z",
      recentPostUrl: "https://instagram.com/ridge.eun/",
      followerCount: 2510,
      lastPostedAt: "2026-03-23T03:10:00Z",
      postsPerWeek: 4.7,
      engagementProxy: 0.069,
      categorySimilarity: 0.84,
      recommendationScore: 86,
      categories: ["outdoor", "trail", "nature"],
      action: "none"
    },
    {
      accountId: "rec_005",
      username: "hike.bomi",
      displayName: "Bomi Hike Mood",
      profileImage: "",
      lastLoginAt: "2026-03-22T23:40:00Z",
      recentPostUrl: "https://instagram.com/hike.bomi/",
      followerCount: 1420,
      lastPostedAt: "2026-03-22T08:50:00Z",
      postsPerWeek: 5.4,
      engagementProxy: 0.074,
      categorySimilarity: 0.9,
      recommendationScore: 93,
      categories: ["outdoor", "hiking", "nature"],
      action: "none"
    }
  ]
};

function cloneData(): DashboardPayload {
  return JSON.parse(JSON.stringify(baseData)) as DashboardPayload;
}

export function getMockDashboardData(username?: string): DashboardPayload {
  const data = cloneData();

  data.followerAccounts = data.cleanupAccounts.filter((account) =>
    ["trail.harin", "mountain.ora", "photo.sena", "design.jisu", "camp.minji"].includes(account.username)
  );
  data.followingAccounts = data.cleanupAccounts.filter((account) =>
    ["design.jisu", "photo.sena", "camp.minji", "cafe.min", "gear.noah"].includes(account.username)
  );
  data.dailyFollowerAccounts = data.cleanupAccounts.filter((account) =>
    ["trail.harin", "mountain.ora", "design.jisu"].includes(account.username)
  );
  data.dailyUnfollowAccounts = data.cleanupAccounts.filter((account) =>
    ["old.contact", "random.market", "unused.memo"].includes(account.username)
  );
  data.dailyCommentAccounts = data.cleanupAccounts.filter((account) =>
    ["design.jisu", "trail.harin", "photo.sena"].includes(account.username)
  );

  if (username === "admin2") {
    data.cleanupSummary.importedFollowers = 2180;
    data.cleanupSummary.importedFollowing = 642;
    data.cleanupSummary.dailyFollowerDelta = 5;
    data.cleanupSummary.dailyCommentCount = 4;
    data.recommendations = [
      {
        accountId: "rec_w_001",
        username: "mood.haru",
        displayName: "Haru Mood Studio",
        profileImage: "",
        lastLoginAt: "2026-03-23T07:20:00Z",
        recentPostUrl: "https://instagram.com/mood.haru/",
        followerCount: 4100,
        lastPostedAt: "2026-03-22T12:00:00Z",
        postsPerWeek: 4.8,
        engagementProxy: 0.082,
        categorySimilarity: 0.91,
        recommendationScore: 94,
        categories: ["nature", "camping"],
        action: "none"
      },
      {
        accountId: "rec_w_002",
        username: "soft.weekend",
        displayName: "Soft Weekend Edit",
        profileImage: "",
        lastLoginAt: "2026-03-23T09:10:00Z",
        recentPostUrl: "https://instagram.com/soft.weekend/",
        followerCount: 2860,
        lastPostedAt: "2026-03-22T09:35:00Z",
        postsPerWeek: 5.3,
        engagementProxy: 0.079,
        categorySimilarity: 0.88,
        recommendationScore: 90,
        categories: ["nature", "outdoor"],
        action: "none"
      },
      {
        accountId: "rec_w_003",
        username: "picnic.jane",
        displayName: "Jane Picnic Mood",
        profileImage: "",
        lastLoginAt: "2026-03-22T18:40:00Z",
        recentPostUrl: "https://instagram.com/picnic.jane/",
        followerCount: 1980,
        lastPostedAt: "2026-03-21T14:20:00Z",
        postsPerWeek: 4.1,
        engagementProxy: 0.071,
        categorySimilarity: 0.84,
        recommendationScore: 86,
        categories: ["camping", "nature"],
        action: "none"
      }
    ];
    data.followerAccounts = data.cleanupAccounts.filter((account) =>
      ["design.jisu", "photo.sena", "forest.soo", "mountain.ora", "camp.minji"].includes(account.username)
    );
    data.followingAccounts = data.cleanupAccounts.filter((account) =>
      ["design.jisu", "cafe.min", "forest.soo", "river.dae", "startup.jay"].includes(account.username)
    );
    data.dailyFollowerAccounts = data.cleanupAccounts.filter((account) =>
      ["design.jisu", "photo.sena", "forest.soo", "camp.minji", "mountain.ora"].includes(account.username)
    );
    data.dailyUnfollowAccounts = data.cleanupAccounts.filter((account) =>
      ["old.contact", "random.market"].includes(account.username)
    );
    data.dailyCommentAccounts = data.cleanupAccounts.filter((account) =>
      ["design.jisu", "photo.sena", "cafe.min", "forest.soo"].includes(account.username)
    );
  }

  data.cleanupSummary.dailyFollowerDelta = data.dailyFollowerAccounts.length;
  data.cleanupSummary.dailyUnfollowCount = data.dailyUnfollowAccounts.length;
  data.cleanupSummary.dailyCommentCount = data.dailyCommentAccounts.length;

  return data;
}
