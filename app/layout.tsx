import type { ReactNode } from "react";

export const metadata = {
  title: "LoopRR",
  description:
    "Project-Manager-as-a-Service coordinating an autonomous multi-agent Claude Code dev team.",
};

// Root layout (required by the App Router). The public surface is intentionally minimal in P1.4 —
// LoopRR is an API service; the operator HUD is a later phase.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
