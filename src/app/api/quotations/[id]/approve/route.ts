import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const approveSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().optional(),
});

// POST /api/quotations/[id]/approve - Approve or reject
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授權" }, { status: 401 });

  // Only FINANCE and ADMIN can approve
  if (session.user.role === "SALES") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({ where: { id } });

  if (!quotation) {
    return NextResponse.json({ error: "找不到報價單" }, { status: 404 });
  }

  if (quotation.status !== "PENDING_APPROVAL") {
    return NextResponse.json({ error: "此狀態無法審核" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "資料錯誤" }, { status: 400 });
  }

  const { action, comment } = parsed.data;

  await prisma.$transaction([
    prisma.quotation.update({
      where: { id },
      data: { status: action },
    }),
    prisma.approvalRecord.create({
      data: {
        quotationId: id,
        userId: session.user.id,
        action,
        comment,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
