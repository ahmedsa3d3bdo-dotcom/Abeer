import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { notificationsEmitter } from "@/server/events/notifications.events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const session = await auth();
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Initial hello and recommended retry
      controller.enqueue(encoder.encode(`retry: 2000\n`));
      controller.enqueue(encoder.encode(`: connected\n\n`));

      const unsubscribe = notificationsEmitter.subscribe(userId, (evt) => {
        try {
          send(evt);
        } catch {}
      });

      // Heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {}
      }, 25000);

      const abort = () => {
        try { unsubscribe(); } catch {}
        clearInterval(heartbeat);
        try { controller.close(); } catch {}
      };

      // Close when client disconnects
      (request as any).signal?.addEventListener?.("abort", abort);
    },
    cancel() {},
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
