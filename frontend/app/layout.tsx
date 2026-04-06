import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "\uc778\uc2a4\ud0c0\uadf8\ub7a8 \uad00\uacc4 \uc815\ub9ac \ub300\uc2dc\ubcf4\ub4dc",
  description: "Instagram account relationship cleanup and account discovery dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
