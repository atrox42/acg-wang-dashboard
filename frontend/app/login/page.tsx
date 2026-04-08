import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getAppUsers,
  getSessionCookieName,
  isInstagramAuthConfigured,
  isLegacyLoginEnabled,
  verifySessionToken
} from "@/lib/auth";
import { LoginForm } from "./ui";

export default function LoginPage({
  searchParams
}: {
  searchParams?: { error?: string; detail?: string };
}) {
  const token = cookies().get(getSessionCookieName())?.value;
  const session = verifySessionToken(token);

  if (session) {
    redirect("/");
  }

  return (
    <LoginForm
      users={getAppUsers()}
      instagramEnabled={isInstagramAuthConfigured()}
      legacyEnabled={isLegacyLoginEnabled()}
      errorCode={searchParams?.error}
      errorDetail={searchParams?.detail}
    />
  );
}
