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
  username?: string;
  name?: string;
  profile_picture_url?: string;
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

  const profileUrl = new URL("https://graph.instagram.com/me");
  profileUrl.searchParams.set("fields", "id,username");
  profileUrl.searchParams.set("access_token", tokenPayload.access_token);

  const profileResponse = await fetch(profileUrl.toString(), {
    cache: "no-store"
  });

  if (!profileResponse.ok) {
    const body = await profileResponse.text();
    console.error("Instagram profile fetch failed", {
      status: profileResponse.status,
      statusText: profileResponse.statusText,
      body
    });
    return redirectToLogin("profile", config.redirectUri, body);
  }

  const profile = (await profileResponse.json()) as InstagramProfileResponse;
  if (!profile.username) {
    return redirectToLogin("profile", config.redirectUri);
  }

  const sessionUser = createInstagramSessionUser({
    id: profile.id || String(tokenPayload.user_id || ""),
    username: profile.username,
    name: profile.name,
    profile_picture_url: profile.profile_picture_url
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
