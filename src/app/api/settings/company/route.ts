import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const COMPANY_KEYS = [
  "company_name",
  "company_name_en",
  "company_address",
  "company_tax_id",
  "company_phone",
];

const DEFAULTS: Record<string, string> = {
  company_name: "全偲行銷有限公司",
  company_name_en: "Chance Marketing Co., Ltd.",
  company_address: "114台北市內湖區瑞湖街158號2樓",
  company_tax_id: "82810393",
  company_phone: "02-2368-1518",
};

// GET /api/settings/company
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: COMPANY_KEYS } },
  });

  const result: Record<string, string> = { ...DEFAULTS };
  for (const s of settings) {
    result[s.key] = s.value;
  }

  return NextResponse.json(result);
}

// PUT /api/settings/company
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const body = await req.json();

  for (const key of COMPANY_KEYS) {
    if (body[key] !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: body[key] },
        create: { key, value: body[key] },
      });
    }
  }

  return NextResponse.json({ success: true });
}
