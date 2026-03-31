import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/quotations/[id]/submit - Submit for approval
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({ where: { id } });

  if (!quotation) {
    return NextResponse.json({ error: "找不到報價單" }, { status: 404 });
  }

  if (session.user.role === "SALES" && quotation.createdById !== session.user.id) {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  if (quotation.status !== "DRAFT" && quotation.status !== "REJECTED") {
    return NextResponse.json({ error: "此狀態無法送審" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.quotation.update({
      where: { id },
      data: { status: "PENDING_APPROVAL" },
    }),
    prisma.approvalRecord.create({
      data: {
        quotationId: id,
        userId: session.user.id,
        action: "SUBMITTED",
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
