import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function contentTypeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

export async function GET(_request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: segments } = await ctx.params;

    const rel = path.join(...(segments || []));
    const storageRoot = path.join(process.cwd(), "storage", "uploads");
    const publicRoot = path.join(process.cwd(), "public", "uploads");

    const storageAbs = path.normalize(path.join(storageRoot, rel));
    if (!storageAbs.startsWith(storageRoot)) {
      return new NextResponse("Invalid path", { status: 400 });
    }

    let file: Buffer;
    let ext: string;
    try {
      file = await fs.readFile(storageAbs);
      ext = path.extname(storageAbs);
    } catch {
      const publicAbs = path.normalize(path.join(publicRoot, rel));
      if (!publicAbs.startsWith(publicRoot)) {
        return new NextResponse("Invalid path", { status: 400 });
      }
      file = await fs.readFile(publicAbs);
      ext = path.extname(publicAbs);
    }

    const body = new Uint8Array(file);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFromExt(ext),
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
}
