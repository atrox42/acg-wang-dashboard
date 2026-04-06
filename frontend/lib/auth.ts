import crypto from "crypto";

import type { AppUserProfile } from "@/lib/types";

const SESSION_COOKIE_NAME = "ig_cleanup_session";
const OAUTH_STATE_COOKIE_NAME = "ig_cleanup_oauth_state";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export interface SessionUser {
  username: string;
  displayName: string;
  instagramHandle: string;
  profileImage?: string;
  preferenceSummary: string;
  recommendationKeywords: string[];
  provider: "legacy" | "instagram";
  instagramUserId?: string;
}

export interface InstagramAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  scopes: string[];
  loginUrl?: string;
}

function getSessionSecret() {
  return process.env.SESSION_SECRET || "change-this-secret-in-production";
}

const DEFAULT_USERS: AppUserProfile[] = [
  {
    username: process.env.APP_LOGIN_USERNAME_YOU || process.env.APP_LOGIN_USERNAME || "admin",
    password: process.env.APP_LOGIN_PASSWORD_YOU || process.env.APP_LOGIN_PASSWORD || "admin1234",
    displayName: process.env.APP_DISPLAY_NAME_YOU || "\uaddc\uc11d",
    instagramHandle: process.env.APP_INSTAGRAM_HANDLE_YOU || "@admin",
    profileImage: "",
    preferenceSummary:
      "\ud2b8\ub808\uc77c\ub7ec\ub2dd, \ub4f1\uc0b0, \ud2b8\ub798\ud0b9, \uc544\uc6c3\ub3c4\uc5b4 \ud328\uc158 \uac10\ub3c4\uac00 \uc788\ub294 \uacc4\uc815 \uc704\uc8fc\ub85c \ucd94\ucc9c\uc744 \ubcf4\ub294 \ud504\ub85c\ud544",
    recommendationKeywords: ["\ud2b8\ub808\uc77c\ub7ec\ub2dd", "\ub4f1\uc0b0", "\ud2b8\ub798\ud0b9", "\uc544\uc6c3\ub3c4\uc5b4", "\ud328\uc158"]
  },
  {
    username: process.env.APP_LOGIN_USERNAME_WIFE || "admin2",
    password: process.env.APP_LOGIN_PASSWORD_WIFE || "admin1234",
    displayName: process.env.APP_DISPLAY_NAME_WIFE || "\ub2e4\ud61c",
    instagramHandle: process.env.APP_INSTAGRAM_HANDLE_WIFE || "@admin2",
    profileImage: "",
    preferenceSummary:
      "\uc544\ub0b4 \uacc4\uc815 \ucee8\uc149\uc5d0 \ub9de\ub294 \ud0a4\uc6cc\ub4dc\uc640 \ud53c\ub4dc \ubb34\ub4dc\ub97c \uae30\uc900\uc73c\ub85c \ucd94\ucc9c\uc744 \ubcf4\ub294 \ud504\ub85c\ud544",
    recommendationKeywords: ["\ub77c\uc774\ud504\uc2a4\ud0c0\uc77c", "\uac10\ub3c4", "\ud53c\ub4dc", "\ubb34\ub4dc", "\ucee8\ud149\uce20"]
  }
];

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf-8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function createSignature(payload: string) {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

export function getAppUsers() {
  return DEFAULT_USERS;
}

export function findAppUser(username: string) {
  return getAppUsers().find((user) => user.username === username) ?? null;
}

export function createLegacySessionUser(user: AppUserProfile): SessionUser {
  return {
    username: user.username,
    displayName: user.displayName,
    instagramHandle: user.instagramHandle,
    profileImage: user.profileImage,
    preferenceSummary: user.preferenceSummary,
    recommendationKeywords: user.recommendationKeywords,
    provider: "legacy"
  };
}

export function createInstagramSessionUser(profile: {
  id?: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
}): SessionUser {
  const username = profile.username.replace(/^@/, "");
  return {
    username,
    displayName: profile.name || username,
    instagramHandle: `@${username}`,
    profileImage: profile.profile_picture_url || "",
    preferenceSummary:
      "\uc2e4\uc81c \uc778\uc2a4\ud0c0 \uacc4\uc815\uc73c\ub85c \uc5f0\uacb0\ub41c \ub300\uc2dc\ubcf4\ub4dc\uc785\ub2c8\ub2e4. \uc2e4\uc81c \ub370\uc774\ud130 \uae30\ubc18 \ud750\ub984\uc73c\ub85c \uc804\ud658 \uc911\uc785\ub2c8\ub2e4.",
    recommendationKeywords: ["instagram", "creator", "dashboard"],
    provider: "instagram",
    instagramUserId: profile.id
  };
}

export function createSessionToken(user: SessionUser) {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    user
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createSignature(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifyStructuredToken(token: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  if (createSignature(encodedPayload) !== signature) return null;

  const decoded = JSON.parse(base64UrlDecode(encodedPayload)) as {
    exp?: number;
    user?: SessionUser;
  };

  if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000) || !decoded.user) {
    return null;
  }

  return { expiresAt: decoded.exp, user: decoded.user, username: decoded.user.username };
}

function verifyLegacyToken(token: string) {
  const [username, expiresAtRaw, signature] = token.split(":");
  if (!username || !expiresAtRaw || !signature) return null;

  const payload = `${username}:${expiresAtRaw}`;
  const expectedSignature = createSignature(payload);

  if (signature !== expectedSignature) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return null;
  }

  const user = findAppUser(username);
  if (!user) return null;

  return {
    username,
    expiresAt,
    user: createLegacySessionUser(user)
  };
}

export function verifySessionToken(token: string | undefined | null) {
  if (!token) return null;
  if (token.includes(".")) {
    return verifyStructuredToken(token);
  }
  return verifyLegacyToken(token);
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getOauthStateCookieName() {
  return OAUTH_STATE_COOKIE_NAME;
}

export function getSessionTtlSeconds() {
  return SESSION_TTL_SECONDS;
}

export function isLegacyLoginEnabled() {
  return process.env.ENABLE_LEGACY_LOGIN === "true";
}

export function getInstagramAuthConfig(): InstagramAuthConfig | null {
  const rawAppId = process.env.INSTAGRAM_CLIENT_ID?.trim();
  const appSecret = process.env.INSTAGRAM_CLIENT_SECRET?.trim();
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI?.trim();
  const loginUrl = process.env.INSTAGRAM_LOGIN_URL?.trim();
  const appId =
    rawAppId ||
    (loginUrl ? new URL(loginUrl).searchParams.get("client_id")?.trim() || "" : "");

  if (!appId || !appSecret || !redirectUri) {
    return null;
  }

  const scopes = (process.env.INSTAGRAM_APP_SCOPES || "instagram_business_basic")
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);

  return {
    appId,
    appSecret,
    redirectUri,
    scopes,
    loginUrl
  };
}

export function isInstagramAuthConfigured() {
  return getInstagramAuthConfig() !== null;
}

export function createOauthState() {
  return crypto.randomBytes(24).toString("hex");
}
