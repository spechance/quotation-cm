import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fromJsonString } from "@/lib/json-helpers";

// PUT /api/general-terms/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const set = await prisma.generalTermsSet.update({
    where: { id },
    data: {
      name: body.name,
      terms: Array.isArray(body.terms) ? JSON.stringify(body.terms) : body.terms,
    },
  });

  return NextResponse.json({ ...set, terms: fromJsonString(set.terms) });
}

// DELETE /api/general-terms/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const { id } = await params;

  // Check if any template is using this set
  const inUse = await prisma.quotationType.count({ where: { generalTermsSetId: id } });
  if (inUse > 0) {
    return NextResponse.json({ error: "此條款組正被版型使用中，無法刪除" }, { status: 400 });
  }

  await prisma.generalTermsSet.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
