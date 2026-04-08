import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createOauthState,
  getInstagramAuthConfig,
  getOauthRedirectUriCookieName,
  getOauthStateCookieName
} from "@/lib/auth";

export async function GET() {
  const config = getInstagramAuthConfig();

  if (!config) {
    return NextResponse.redirect(new URL("/login?error=config", process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:3000"));
  }

  const state = createOauthState();
  cookies().set({
    name: getOauthStateCookieName(),
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });

  const authUrl = new URL("https://www.instagram.com/oauth/authorize");
  authUrl.searchParams.set("client_id", config.appId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scopes.join(","));
  authUrl.searchParams.set("force_reauth", "true");

  const redirectUriUsed = config.redirectUri;

  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set({
    name: getOauthRedirectUriCookieName(),
    value: redirectUriUsed,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });

  return response;
}
