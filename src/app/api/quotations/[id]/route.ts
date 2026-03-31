import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createQuotationSchema } from "@/lib/validators/quotation";
import { toJsonString, fromJsonString } from "@/lib/json-helpers";

function serializeQuotation(q: Record<string, unknown>) {
  const services = (q.services as Record<string, unknown>[])?.map((s) => ({
    ...s,
    terms: fromJsonString(s.terms as string),
  }));
  return {
    ...q,
    generalTerms: fromJsonString(q.generalTerms as string),
    services,
  };
}

// GET /api/quotations/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      services: {
        orderBy: { sortOrder: "asc" },
        include: {
          quotationType: { select: { name: true, code: true } },
          items: { orderBy: { sortOrder: "asc" } },
        },
      },
      approvals: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!quotation) {
    return NextResponse.json({ error: "找不到報價單" }, { status: 404 });
  }

  if (session.user.role === "SALES" && quotation.createdById !== session.user.id) {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  return NextResponse.json(serializeQuotation(quotation as unknown as Record<string, unknown>));
}

// PUT /api/quotations/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.quotation.findUnique({
    where: { id },
    include: { services: { include: { items: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "找不到報價單" }, { status: 404 });
  }

  if (session.user.role === "SALES" && existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }
  if (session.user.role !== "ADMIN" && existing.status !== "DRAFT" && existing.status !== "REJECTED") {
    return NextResponse.json({ error: "此狀態無法編輯" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = createQuotationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "資料驗證失敗", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Save version snapshot
  await prisma.quotationVersion.create({
    data: {
      quotationId: id,
      version: existing.version,
      snapshot: JSON.stringify(existing),
      changedById: session.user.id,
      changeNote: "更新前的版本",
    },
  });

  let subtotal = 0;
  for (const service of data.services) {
    let serviceSubtotal = 0;
    for (const item of service.items) {
      serviceSubtotal += item.quantity * item.unitPrice;
    }
    service.subtotal = serviceSubtotal;
    subtotal += serviceSubtotal;
  }
  const taxAmount = Math.round(subtotal * 0.05);
  const totalAmount = subtotal + taxAmount;

  await prisma.quotationService.deleteMany({ where: { quotationId: id } });

  const quotation = await prisma.quotation.update({
    where: { id },
    data: {
      projectName: data.projectName,
      companyName: data.companyName,
      contactAddress: data.contactAddress,
      primaryContact: data.primaryContact,
      projectPeriod: data.projectPeriod,
      companyTaxId: data.companyTaxId,
      companyPhone: data.companyPhone,
      contactPhone: data.contactPhone,
      subtotal,
      taxAmount,
      totalAmount,
      generalTerms: toJsonString(data.generalTerms),
      notes: data.notes,
      version: existing.version + 1,
      status: existing.status === "REJECTED" ? "DRAFT" : existing.status,
      services: {
        create: data.services.map((service, idx) => ({
          quotationTypeId: service.quotationTypeId,
          sectionLabel: service.sectionLabel,
          sectionTitle: service.sectionTitle,
          period: service.period,
          quantity: service.quantity,
          subtotal: service.subtotal,
          terms: toJsonString(service.terms),
          sortOrder: idx,
          items: {
            create: service.items.map((item, itemIdx) => ({
              itemNumber: item.itemNumber,
              description: item.description,
              specification: item.specification,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              amount: item.quantity * item.unitPrice,
              sortOrder: itemIdx,
            })),
          },
        })),
      },
    },
    include: { services: { include: { items: true } } },
  });

  return NextResponse.json(serializeQuotation(quotation as unknown as Record<string, unknown>));
}

// DELETE /api/quotations/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.quotation.findUnique({ where: { id } });

  if (!existing) return NextResponse.json({ error: "找不到報價單" }, { status: 404 });
  if (session.user.role === "SALES" && existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  await prisma.quotation.update({ where: { id }, data: { status: "CANCELLED" } });
  return NextResponse.json({ success: true });
}
