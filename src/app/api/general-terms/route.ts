import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fromJsonString } from "@/lib/json-helpers";

// GET /api/general-terms
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const sets = await prisma.generalTermsSet.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    sets.map((s) => ({ ...s, terms: fromJsonString(s.terms) }))
  );
}

// POST /api/general-terms
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.name || !Array.isArray(body.terms)) {
    return NextResponse.json({ error: "請輸入名稱與條款" }, { status: 400 });
  }

  const set = await prisma.generalTermsSet.create({
    data: { name: body.name, terms: JSON.stringify(body.terms) },
  });

  return NextResponse.json(
    { ...set, terms: fromJsonString(set.terms) },
    { status: 201 }
  );
}
