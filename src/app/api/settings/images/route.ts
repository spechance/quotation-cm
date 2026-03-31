import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

// GET /api/settings/images - Get current logo/banner info
export async function GET() {
  const publicDir = join(process.cwd(), "public");
  const result: Record<string, string | null> = { logo: null, banner: null };

  for (const type of ["logo", "banner"] as const) {
    try {
      const meta = JSON.parse(
        await readFile(join(publicDir, `${type}-meta.json`), "utf-8")
      );
      result[type] = `/${meta.fileName}?t=${Date.now()}`;
    } catch {
      // Check common extensions
      const exts = ["png", "jpg", "jpeg", "svg", "webp"];
      for (const ext of exts) {
        try {
          await readFile(join(publicDir, `${type}.${ext}`));
          result[type] = `/${type}.${ext}?t=${Date.now()}`;
          break;
        } catch {
          // continue
        }
      }
    }
  }

  return NextResponse.json(result);
}
