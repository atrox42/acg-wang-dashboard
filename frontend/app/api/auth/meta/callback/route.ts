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
}

function redirectToLogin(error: string, redirectUri?: string, detail?: string) {
  const fallbackOrigin = redirectUri ? new URL(redirectUri).origin : "http://localhost:3000";
  const target = new URL(`/login?error=${error}`, fallbackOrigin);
  if (detail) {
    target.searchParams.set("detail", detail.slice(0, 240));
  }
  return NextResponse.redirect(target);
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
  let profile: InstagramProfileResponse | null = null;
  try {
    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set("fields", "user_id,username");
    profileUrl.searchParams.set("access_token", tokenPayload.access_token);

    const profileResponse = await fetch(profileUrl.toString(), {
      cache: "no-store"
    });

    if (profileResponse.ok) {
      profile = (await profileResponse.json()) as InstagramProfileResponse;
    } else {
      const body = await profileResponse.text();
      console.error("Instagram profile fetch failed", {
        status: profileResponse.status,
        statusText: profileResponse.statusText,
        body
      });
    }
  } catch (error) {
    console.error("Instagram profile request threw", error);
  }

  const resolvedUsername = profile?.username || `instagram-${fallbackInstagramId}`;

  const sessionUser = createInstagramSessionUser({
    id: String(profile?.user_id || profile?.id || fallbackInstagramId),
    username: resolvedUsername,
    name: profile?.username || "Instagram Connected"
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
