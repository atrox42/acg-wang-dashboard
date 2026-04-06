import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createSessionToken,
  createLegacySessionUser,
  findAppUser,
  getSessionCookieName,
  getSessionTtlSeconds
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };

  const user = body.username ? findAppUser(body.username) : null;

  if (!user || body.password !== user.password) {
    return NextResponse.json(
      { ok: false, message: "\uc544\uc774\ub514 \ub610\ub294 \ube44\ubc00\ubc88\ud638\ub97c \ud655\uc778\ud574\uc8fc\uc138\uc694." },
      { status: 401 }
    );
  }

  const token = createSessionToken(createLegacySessionUser(user));

  cookies().set({
    name: getSessionCookieName(),
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionTtlSeconds()
  });

  return NextResponse.json({ ok: true });
}
