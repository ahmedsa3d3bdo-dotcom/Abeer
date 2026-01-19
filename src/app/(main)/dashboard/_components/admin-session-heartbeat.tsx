"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export function AdminSessionHeartbeat() {
  useEffect(() => {
    let alive = true;
    let timer: any = null;

    async function ping() {
      try {
        const res = await fetch("/api/v1/security/sessions/ping", { method: "POST" });
        if (!alive) return;
        if (res.status === 409) {
          await signOut({ callbackUrl: "/login-v2" });
          return;
        }
      } catch {
      }
    }

    void ping();
    timer = setInterval(() => void ping(), 30000);

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  return null;
}
