"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AppUserProfile } from "@/lib/types";

const DASHBOARD_ENTRY_TITLE = String.fromCharCode(
  0xb0b4,
  0x20,
  0xacc4,
  0xc815,
  0xc73c,
  0xb85c,
  0x20,
  0xb300,
  0xc2dc,
  0xbcf4,
  0xb4dc,
  0x20,
  0xc5f4,
  0xae30
);

const UI = {
  badge: "\ub300\uc2dc\ubcf4\ub4dc \ub85c\uadf8\uc778",
  title: "\ub9c8\uc774 \uc778\uc2a4\ud0c0\uadf8\ub7a8 \ub300\uc2dc\ubcf4\ub4dc",
  selectedAccount: "\uc120\ud0dd\ub41c \uacc4\uc815",
  passwordPlaceholder: "\ube44\ubc00\ubc88\ud638",
  login: "\ub85c\uadf8\uc778",
  loggingIn: "\ub85c\uadf8\uc778 \uc911...",
  invalidLogin: "\ub85c\uadf8\uc778\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.",
  selectedAccountLabel: "\uc120\ud0dd \uacc4\uc815",
  accountHintPrefix: "\ud14c\uc2a4\ud2b8 \uacc4\uc815",
  dashboardEntryTitle: DASHBOARD_ENTRY_TITLE,
  instagramLogin: "\ub300\uc2dc\ubcf4\ub4dc \uc2dc\uc791\ud558\uae30",
  instagramLoginText:
    "\ucc98\uc74c 1\ud68c\ub9cc Instagram \uad8c\ud55c\uc744 \uc2b9\uc778\ud558\uba74 \ubc14\ub85c \ub300\uc2dc\ubcf4\ub4dc\uac00 \uc5f4\ub9bd\ub2c8\ub2e4.",
  configMissing:
    "\uc544\uc9c1 Instagram \ub85c\uadf8\uc778 \ud658\uacbd\ubcc0\uc218\uac00 \uc5c6\uc2b5\ub2c8\ub2e4. `.env`\uc5d0 APP ID, APP SECRET, REDIRECT URI\ub97c \ub123\uc5b4\uc8fc\uc138\uc694.",
  loginNote:
    "\ud604\uc7ac\ub294 \uc784\uc2dc \uacf5\uac1c \uc8fc\uc18c\ub97c \ucf5c\ubc31\uc73c\ub85c \uc0ac\uc6a9 \uc911\uc774\ub77c \ub85c\uadf8\uc778 \uc2dc \uac19\uc740 \uc8fc\uc18c\uc5d0\uc11c \uc2dc\uc791\ud574\uc57c \uc138\uc158\uc774 \uc815\uc0c1 \uc720\uc9c0\ub429\ub2c8\ub2e4.",
  legacyTitle: "\uae30\uc874 \ud14c\uc2a4\ud2b8 \ub85c\uadf8\uc778",
  errors: {
    config: "\uc778\uc2a4\ud0c0 \ub85c\uadf8\uc778 \uc124\uc815\uc774 \ube44\uc5b4\uc788\uc2b5\ub2c8\ub2e4.",
    state: "\ub85c\uadf8\uc778 \uc694\uccad\uc744 \ub2e4\uc2dc \uc2dc\uc791\ud574\uc8fc\uc138\uc694.",
    access_denied: "\uc778\uc2a4\ud0c0 \ub85c\uadf8\uc778\uc774 \ucde8\uc18c\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
    oauth: "\uc778\uc2a4\ud0c0 \uc778\uc99d \ucc98\ub9ac \uc911 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.",
    profile: "\uc778\uc2a4\ud0c0 \ud504\ub85c\ud544 \uc815\ubcf4\ub97c \uac00\uc838\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4."
  }
} as const;

function getErrorMessage(errorCode?: string) {
  if (!errorCode) return null;
  return UI.errors[errorCode as keyof typeof UI.errors] ?? UI.invalidLogin;
}

export function LoginForm({
  users,
  instagramEnabled,
  legacyEnabled,
  errorCode,
  errorDetail
}: {
  users: AppUserProfile[];
  instagramEnabled: boolean;
  legacyEnabled: boolean;
  errorCode?: string;
  errorDetail?: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(users[0]?.username ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(getErrorMessage(errorCode));
  const [loading, setLoading] = useState(false);

  const selectedUser = users.find((user) => user.username === username) ?? users[0];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      setError(payload.message || UI.invalidLogin);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="shell loginShell">
      <section className="heroCard loginCard">
        <p className="badge keep">{UI.badge}</p>
        <h1 className="heroTitle loginTitle">{UI.title}</h1>

        <div className="panel" style={{ marginTop: 20 }}>
          <h2 className="sectionTitle">{UI.dashboardEntryTitle}</h2>
          <p className="muted">{instagramEnabled ? UI.instagramLoginText : UI.configMissing}</p>
          {instagramEnabled ? (
            <p className="muted" style={{ marginTop: 10 }}>
              {UI.loginNote}
            </p>
          ) : null}
          <div style={{ marginTop: 16 }}>
            <a
              className="button primary"
              href={instagramEnabled ? "/api/auth/meta/login" : undefined}
              aria-disabled={!instagramEnabled}
              style={!instagramEnabled ? { pointerEvents: "none", opacity: 0.5 } : undefined}
            >
              {UI.instagramLogin}
            </a>
          </div>
        </div>

        {error ? (
          <p className="muted" style={{ color: "#b91c1c", marginTop: 16 }}>
            {error}
          </p>
        ) : null}
        {errorDetail ? (
          <p className="muted" style={{ color: "#b91c1c", marginTop: 8, wordBreak: "break-word" }}>
            {errorDetail}
          </p>
        ) : null}

        {legacyEnabled ? (
          <>
            <div style={{ marginTop: 24 }}>
              <h2 className="sectionTitle">{UI.legacyTitle}</h2>
            </div>

            <div className="loginUserGrid">
              {users.map((user) => (
                <button
                  key={user.username}
                  type="button"
                  className={`loginUserCard ${username === user.username ? "active" : ""}`}
                  onClick={() => {
                    setUsername(user.username);
                    setPassword("");
                    setError(null);
                  }}
                >
                  <strong>{user.displayName}</strong>
                  <span className="muted">{user.instagramHandle}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="loginForm">
              <label className="filterField">
                <span className="fieldLabel">{UI.selectedAccount}</span>
                <input
                  className="input"
                  value={selectedUser?.username ?? username}
                  readOnly
                  aria-label={UI.selectedAccountLabel}
                />
              </label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={UI.passwordPlaceholder}
                autoComplete="current-password"
              />
              <button className="button primary" type="submit" disabled={loading}>
                {loading ? UI.loggingIn : UI.login}
              </button>
            </form>

            <div className="loginHint">
              {users.map((user) => (
                <span key={user.username} className="metricPill">
                  {UI.accountHintPrefix} {user.displayName}: {user.username}
                </span>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
