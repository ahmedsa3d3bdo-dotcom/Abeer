import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files");
    if (!files.length) {
      return NextResponse.json({ success: false, error: { code: "NO_FILES", message: "No files uploaded" } }, { status: 400 });
    }

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const baseDir = path.join(process.cwd(), "storage", "uploads", "products", year, month);
    await fs.mkdir(baseDir, { recursive: true });

    const saved: Array<{ url: string; path: string; filename: string; size: number; type: string }> = [];

    for (const f of files) {
      if (!(f instanceof File)) continue;
      const type = f.type || "";
      if (!ALLOWED_MIME.has(type)) {
        return NextResponse.json(
          { success: false, error: { code: "UNSUPPORTED_TYPE", message: `Unsupported file type: ${type}` } },
          { status: 400 },
        );
      }
      const size = (f as any).size as number;
      if (typeof size === "number" && size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: { code: "FILE_TOO_LARGE", message: `Max file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` } },
          { status: 400 },
        );
      }

      const origName = (f as any).name as string | undefined;
      const ext = (origName && path.extname(origName)) || extFromMime(type) || ".bin";
      const filename = `${randomUUID()}${ext}`;
      const filePath = path.join(baseDir, filename);

      // Write buffer to disk
      const arrayBuffer = await f.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(arrayBuffer));

      const publicUrl = path.posix.join("/uploads", "products", year, month, filename);
      saved.push({ url: publicUrl, path: filePath, filename, size: size ?? Buffer.byteLength(Buffer.from(arrayBuffer)), type });
    }

    return NextResponse.json({ success: true, data: { items: saved } });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_FAILED", message: e?.message || "Failed to upload files" } },
      { status: 500 },
    );
  }
}
