import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "FINANCE", "SALES"]).optional(),
  active: z.boolean().optional(),
});

// PUT /api/users/[id]
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
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "資料驗證失敗" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name) data.name = parsed.data.name;
  if (parsed.data.email) data.email = parsed.data.email;
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
  if (parsed.data.role) data.role = parsed.data.role;
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.password) {
    data.passwordHash = await hash(parsed.data.password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  return NextResponse.json(user);
}

// DELETE /api/users/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "無法刪除自己的帳號" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "找不到使用者" }, { status: 404 });
  }

  // Check for pending/draft quotations (need transfer)
  const pendingQuotations = await prisma.quotation.count({
    where: { createdById: id, status: { in: ["DRAFT", "PENDING_APPROVAL"] } },
  });
  if (pendingQuotations > 0) {
    return NextResponse.json({
      error: "NEED_TRANSFER",
      message: `此人員有 ${pendingQuotations} 筆未完成報價單（草稿/待審核），請先轉移至其他人員。`,
      pendingCount: pendingQuotations,
    }, { status: 400 });
  }

  // For completed quotations (APPROVED/REJECTED/CANCELLED), keep records
  // Mark original creator name on all their quotations before deleting
  const allQuotations = await prisma.quotation.findMany({
    where: { createdById: id },
    select: { id: true },
  });

  if (allQuotations.length > 0) {
    // Need a transferTo user to reassign
    const body = await req.json().catch(() => ({}));
    const transferToId = body.transferToId;

    if (!transferToId) {
      return NextResponse.json({
        error: "NEED_TRANSFER_COMPLETED",
        message: `此人員有 ${allQuotations.length} 筆已完成報價單需留檔，請選擇接管人員。`,
        completedCount: allQuotations.length,
      }, { status: 400 });
    }

    const transferTo = await prisma.user.findUnique({ where: { id: transferToId } });
    if (!transferTo) {
      return NextResponse.json({ error: "接管人員不存在" }, { status: 400 });
    }

    // Transfer all quotations: record original creator, set new owner
    await prisma.quotation.updateMany({
      where: { createdById: id },
      data: {
        originalCreatorName: user.name,
        transferNote: `由 ${user.name} 轉移至 ${transferTo.name}`,
        createdById: transferToId,
      },
    });
  }

  // Delete related records then delete user
  await prisma.templateVisibility.deleteMany({ where: { userId: id } });
  await prisma.approvalRecord.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
