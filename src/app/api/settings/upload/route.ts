import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile } from "fs/promises";
import { join } from "path";

// POST /api/settings/upload - Upload logo or banner
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string; // "logo" or "banner"

  if (!file || !type) {
    return NextResponse.json({ error: "缺少檔案或類型" }, { status: 400 });
  }

  if (!["logo", "banner"].includes(type)) {
    return NextResponse.json({ error: "類型無效" }, { status: 400 });
  }

  // Get file extension
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const allowed = ["png", "jpg", "jpeg", "svg", "webp"];
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: "僅支援 png, jpg, svg, webp 格式" }, { status: 400 });
  }

  const publicDir = join(process.cwd(), "public");
  const fileName = `${type}.${ext}`;
  const filePath = join(publicDir, fileName);

  // Write file
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  // Also write a metadata file so the app knows the correct extension
  await writeFile(
    join(publicDir, `${type}-meta.json`),
    JSON.stringify({ fileName, ext, updatedAt: new Date().toISOString() })
  );

  return NextResponse.json({ success: true, fileName, path: `/${fileName}` });
}
