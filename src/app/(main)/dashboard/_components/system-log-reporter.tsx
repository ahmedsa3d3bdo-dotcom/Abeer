"use client";

import { useEffect, useRef } from "react";

export function SystemLogReporter() {
  const lastSentAtRef = useRef<number>(0);

  useEffect(() => {
    const send = async (payload: any) => {
      const now = Date.now();
      if (now - lastSentAtRef.current < 2000) return;
      lastSentAtRef.current = now;
      try {
        await fetch("/api/v1/system/logs/report", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // ignore
      }
    };

    const onError = (event: ErrorEvent) => {
      void send({
        level: "error",
        message: event.message || "Client error",
        stack: (event.error && (event.error as any).stack) || undefined,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    const onUnhandled = (event: PromiseRejectionEvent) => {
      const reason: any = (event as any).reason;
      void send({
        level: "error",
        message: String(reason?.message || reason || "Unhandled rejection"),
        stack: reason?.stack,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        metadata: {
          kind: "unhandledrejection",
        },
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandled);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);

  return null;
}
