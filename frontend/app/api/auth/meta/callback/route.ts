import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createInstagramSessionUser,
  createSessionToken,
  getInstagramAuthConfig,
  getOauthRedirectUriCookieName,
  getOauthStateCookieName,
  getSessionCookieName,
  getSessionTtlSeconds
} from "@/lib/auth";

interface InstagramTokenResponse {
  access_token?: string;
  user_id?: number | string;
  error_message?: string;
}

interface InstagramProfileResponse {
  id?: string;
  user_id?: string | number;
  username?: string;
  account_type?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}

function redirectToLogin(error: string, redirectUri?: string, detail?: string) {
  const fallbackOrigin = redirectUri ? new URL(redirectUri).origin : "http://localhost:3000";
  const target = new URL(`/login?error=${error}`, fallbackOrigin);
  if (detail) {
    target.searchParams.set("detail", detail.slice(0, 240));
  }
  return NextResponse.redirect(target);
}

function getBackendApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.API_BASE_URL?.trim() ||
    "http://localhost:8000"
  ).replace(/\/$/, "");
}

async function tryFetchInstagramProfile(url: URL): Promise<InstagramProfileResponse | null> {
  try {
    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) {
      const body = await response.text();
      console.error("Instagram profile candidate failed", {
        url: url.toString(),
        status: response.status,
        statusText: response.statusText,
        body
      });
      return null;
    }

    const profile = (await response.json()) as InstagramProfileResponse;
    if (profile && Object.keys(profile).length > 0) {
      return profile;
    }
  } catch (error) {
    console.error("Instagram profile candidate threw", { url: url.toString(), error });
  }

  return null;
}

async function resolveInstagramProfile(accessToken: string, fallbackInstagramId: string) {
  const candidates: Array<{ endpoint: string; fields: string }> = [
    {
      endpoint: "https://graph.instagram.com/me",
      fields: "id,username,account_type,media_count"
    },
    {
      endpoint: "https://graph.instagram.com/v23.0/me",
      fields: "id,username,account_type,media_count"
    },
    {
      endpoint: `https://graph.instagram.com/${fallbackInstagramId}`,
      fields: "id,username,account_type,media_count"
    },
    {
      endpoint: `https://graph.instagram.com/v23.0/${fallbackInstagramId}`,
      fields: "id,username,account_type,media_count"
    },
    {
      endpoint: `https://graph.facebook.com/${fallbackInstagramId}`,
      fields: "id,username"
    },
    {
      endpoint: `https://graph.facebook.com/v23.0/${fallbackInstagramId}`,
      fields: "id,username"
    }
  ];

  let merged: InstagramProfileResponse = {};

  for (const candidate of candidates) {
    const url = new URL(candidate.endpoint);
    url.searchParams.set("fields", candidate.fields);
    url.searchParams.set("access_token", accessToken);
    const profile = await tryFetchInstagramProfile(url);
    if (!profile) continue;

    merged = {
      ...merged,
      ...profile
    };

    if (merged.username && (merged.user_id || merged.id)) {
      return merged;
    }
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

async function resolveInstagramMetrics(
  accessToken: string,
  profileId: string
): Promise<Pick<InstagramProfileResponse, "followers_count" | "follows_count" | "media_count"> | null> {
  const metricCandidates = [
    "https://graph.instagram.com/me",
    "https://graph.instagram.com/v23.0/me",
    `https://graph.instagram.com/${profileId}`,
    `https://graph.instagram.com/v23.0/${profileId}`,
    `https://graph.facebook.com/${profileId}`,
    `https://graph.facebook.com/v23.0/${profileId}`
  ];
  const metricFields = [
    "followers_count,follows_count,media_count",
    "media_count",
    "followers_count,follows_count"
  ];

  for (const endpoint of metricCandidates) {
    for (const fields of metricFields) {
      const url = new URL(endpoint);
      url.searchParams.set("fields", fields);
      url.searchParams.set("access_token", accessToken);
      const profile = await tryFetchInstagramProfile(url);
      if (
        profile &&
        (typeof profile.followers_count === "number" ||
          typeof profile.follows_count === "number" ||
          typeof profile.media_count === "number")
      ) {
        return {
          followers_count: profile.followers_count,
          follows_count: profile.follows_count,
          media_count: profile.media_count
        };
      }
    }
  }

  return null;
}

async function syncConnectedProfileToBackend(input: {
  username: string;
  fullName?: string;
  instagramUserId?: string;
  followerCount?: number;
  followingCount?: number;
  mediaCount?: number;
}) {
  const apiBase = getBackendApiBaseUrl();

  try {
    const response = await fetch(`${apiBase}/api/live/profile-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: input.username,
        full_name: input.fullName,
        instagram_user_id: input.instagramUserId,
        follower_count: input.followerCount,
        following_count: input.followingCount,
        media_count: input.mediaCount
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Connected profile sync failed", {
        status: response.status,
        statusText: response.statusText,
        body
      });
    }
  } catch (error) {
    console.error("Connected profile sync threw", error);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorReason = url.searchParams.get("error_reason");

  const config = getInstagramAuthConfig();
  if (!config) {
    return redirectToLogin("config");
  }

  if (errorReason) {
    return redirectToLogin("access_denied", config.redirectUri);
  }

  const cookieState = cookies().get(getOauthStateCookieName())?.value;
  const cookieRedirectUri = cookies().get(getOauthRedirectUriCookieName())?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectToLogin("state", config.redirectUri);
  }

  const redirectUriForExchange = cookieRedirectUri || config.redirectUri;

  const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: config.appId,
      client_secret: config.appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUriForExchange,
      code
    })
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    console.error("Instagram token exchange failed", {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      body
    });
    return redirectToLogin("oauth", config.redirectUri, body);
  }

  const tokenPayload = (await tokenResponse.json()) as InstagramTokenResponse;
  if (!tokenPayload.access_token) {
    return redirectToLogin("oauth", config.redirectUri);
  }

  const fallbackInstagramId = String(tokenPayload.user_id || "");
  if (!fallbackInstagramId) {
    return redirectToLogin("profile", config.redirectUri, "Missing Instagram user id in token response");
  }

  // Instagram Login is already proving account ownership here. If profile lookup
  // fails for a given token shape, still let the user into the dashboard with a
  // stable placeholder handle derived from the Instagram user id.
  const profile = await resolveInstagramProfile(tokenPayload.access_token, fallbackInstagramId);
  const profileId = String(profile?.id || profile?.user_id || fallbackInstagramId);
  const metrics = await resolveInstagramMetrics(tokenPayload.access_token, profileId);

  const resolvedUsername = profile?.username || `instagram-${fallbackInstagramId}`;

  const sessionUser = createInstagramSessionUser({
    id: profileId,
    username: resolvedUsername,
    name: profile?.name || profile?.username || "Instagram Connected",
    profile_picture_url: profile?.profile_picture_url,
    follower_count: metrics?.followers_count,
    following_count: metrics?.follows_count,
    media_count: metrics?.media_count ?? profile?.media_count
  });

  await syncConnectedProfileToBackend({
    username: resolvedUsername,
    fullName: profile?.name || profile?.username || resolvedUsername,
    instagramUserId: profileId,
    followerCount: metrics?.followers_count,
    followingCount: metrics?.follows_count,
    mediaCount: metrics?.media_count ?? profile?.media_count
  });

  cookies().set({
    name: getSessionCookieName(),
    value: createSessionToken(sessionUser),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionTtlSeconds()
  });

  cookies().set({
    name: getOauthStateCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  cookies().set({
    name: getOauthRedirectUriCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return NextResponse.redirect(new URL("/", new URL(config.redirectUri).origin));
}
