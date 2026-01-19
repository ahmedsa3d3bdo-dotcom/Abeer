import { handlers } from "@/auth";

/**
 * NextAuth.js v5 API Route Handler
 * Handles all authentication routes: /api/auth/*
 */
export const { GET, POST } = handlers;

// Force Node.js runtime to avoid Edge crypto/module limitations
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
