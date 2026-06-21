"use client";

import { useEffect } from "react";

type Props = {
  message: string | null;
  kind?: "info" | "warn";
  onClose: () => void;
  durationMs?: number;
};

export default function Toast({ message, kind = "info", onClose, durationMs = 5000 }: Props) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onClose]);

  if (!message) return null;

  const styles =
    kind === "info"
      ? "border-cyan-500/40 bg-cyan-950/90 text-cyan-100"
      : "border-amber-500/40 bg-amber-950/90 text-amber-100";

  return (
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 z-[100] w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border px-4 py-3 text-sm leading-relaxed shadow-2xl backdrop-blur-sm ${styles}`}
    >
      <div className="flex items-start gap-2">
        <span className="shrink-0 mt-0.5">{kind === "info" ? "⏳" : "💡"}</span>
        <p>{message}</p>
      </div>
    </div>
  );
}
