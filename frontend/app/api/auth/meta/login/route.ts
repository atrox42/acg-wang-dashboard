import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createOauthState,
  getInstagramAuthConfig,
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

  const authUrl = config.loginUrl
    ? new URL(config.loginUrl)
    : new URL("https://www.instagram.com/oauth/authorize");

  if (!config.loginUrl) {
    authUrl.searchParams.set("client_id", config.appId);
    authUrl.searchParams.set("redirect_uri", config.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", config.scopes.join(","));
    authUrl.searchParams.set("force_reauth", "true");
  }

  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl);
}
