import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Dashboard } from "@/components/dashboard";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";

export default function Page() {
  const token = cookies().get(getSessionCookieName())?.value;
  const session = verifySessionToken(token);

  if (!session) {
    redirect("/login");
  }

  return (
    <Dashboard
      username={session.user.username}
      instagramUserId={session.user.instagramUserId}
      displayName={session.user.displayName}
      preferenceSummary={session.user.preferenceSummary}
      recommendationKeywords={session.user.recommendationKeywords}
      followerCount={session.user.followerCount}
      followingCount={session.user.followingCount}
    />
  );
}
