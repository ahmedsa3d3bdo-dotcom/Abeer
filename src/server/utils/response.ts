import { NextResponse } from "next/server";
import { type ApiResponse, AppError } from "../types";
import { auth } from "@/auth";
import { writeSystemLog } from "./system-logs";

function normalizeIp(v: string | null) {
  if (!v) return undefined;
  const first = v.split(",")[0]?.trim();
  return first || undefined;
}

function forwardedIp(v: string | null) {
  if (!v) return undefined;
  const m = v.match(/for=(?:"?)(\[?[a-fA-F0-9:.]+\]?)(?:"?)/);
  if (!m?.[1]) return undefined;
  return m[1];
}

function requestContext(request?: Request) {
  if (!request) return {} as const;
  let url: URL | null = null;
  try {
    url = new URL((request as any).url);
  } catch {
    url = null;
  }

  const requestId =
    request.headers.get("x-request-id") ||
    request.headers.get("x-vercel-id") ||
    request.headers.get("cf-ray") ||
    undefined;

  const ip =
    normalizeIp(request.headers.get("x-forwarded-for")) ||
    normalizeIp(request.headers.get("x-real-ip")) ||
    normalizeIp(request.headers.get("cf-connecting-ip")) ||
    forwardedIp(request.headers.get("forwarded"));
  const userAgent = request.headers.get("user-agent") || undefined;

  return {
    requestId,
    path: url ? `${url.pathname}${url.search}` : undefined,
    method: (request as any).method ? String((request as any).method) : undefined,
    ipAddress: ip,
    userAgent,
  } as const;
}

/**
 * Create a successful API response
 */
export function successResponse<T>(data: T, status: number = 200, meta?: ApiResponse<T>["meta"]): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        ...meta,
        timestamp: new Date().toISOString(),
      },
    },
    { status },
  );
}

/**
 * Create an error API response
 */
export function errorResponse(error: AppError | Error, status?: number): NextResponse<ApiResponse> {
  const isAppError = error instanceof AppError;

  return NextResponse.json(
    {
      success: false,
      error: {
        code: isAppError ? error.code : "INTERNAL_ERROR",
        message: error.message,
        details: isAppError ? error.details : undefined,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status: isAppError ? error.statusCode : status || 500 },
  );
}

/**
 * Handle async route errors
 */
export function handleRouteError(error: unknown, request?: Request): NextResponse<ApiResponse> {
  console.error("Route error:", error);

  const ctx = requestContext(request);

  try {
    const err = error instanceof Error ? error : new Error("Unknown error");
    const appErr = error instanceof AppError ? error : null;
    void (async () => {
      let userId: string | undefined;
      let userEmail: string | undefined;
      try {
        const session = await auth();
        userId = (session?.user as any)?.id;
        userEmail = (session?.user as any)?.email;
      } catch {
        // ignore
      }

      const level = appErr?.statusCode && [401, 403].includes(appErr.statusCode) ? "warn" : "error";

      await writeSystemLog({
        level,
        source: "server",
        message: err.message || "Unknown error",
        stack: err.stack,
        requestId: ctx.requestId,
        path: ctx.path,
        method: ctx.method,
        statusCode: appErr?.statusCode,
        userId,
        userEmail,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        metadata: appErr ? { code: appErr.code, details: appErr.details } : { name: err.name },
      });
    })();
  } catch {
    // ignore
  }

  if (error instanceof AppError) {
    return errorResponse(error);
  }

  if (error instanceof Error) {
    if (process.env.NODE_ENV === "production") {
      return errorResponse(new AppError("Internal server error"));
    }
    return errorResponse(new AppError(error.message));
  }

  return errorResponse(new AppError("An unexpected error occurred"));
}

export function handleRouteErrorWithRequest(error: unknown, request?: Request): NextResponse<ApiResponse> {
  return handleRouteError(error, request);
}
