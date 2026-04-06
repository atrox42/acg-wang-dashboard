"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="button" onClick={() => void handleLogout()} disabled={loading}>
      {loading ? "\ub85c\uadf8\uc544\uc6c3 \uc911..." : "\ub85c\uadf8\uc544\uc6c3"}
    </button>
  );
}
