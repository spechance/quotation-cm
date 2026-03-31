import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createQuotationSchema } from "@/lib/validators/quotation";
import { generateQuotationNumber } from "@/lib/quotation-number";
import { GENERAL_TERMS } from "@/lib/constants";
import { toJsonString, fromJsonString } from "@/lib/json-helpers";

// GET /api/quotations - List quotations
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};

  if (session.user.role === "SALES") {
    where.createdById = session.user.id;
  }

  if (status) where.status = status;
  if (search) {
    where.OR = [
      { projectName: { contains: search } },
      { companyName: { contains: search } },
      { quotationNumber: { contains: search } },
    ];
  }

  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        createdBy: { select: { name: true } },
        services: { select: { sectionTitle: true, quotationType: { select: { name: true } } } },
      },
    }),
    prisma.quotation.count({ where }),
  ]);

  return NextResponse.json({ quotations, total, page, limit });
}

// POST /api/quotations - Create quotation
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const body = await req.json();
  const parsed = createQuotationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "資料驗證失敗", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const quotationNumber = await generateQuotationNumber();

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

  const generalTerms = data.generalTerms.length > 0 ? data.generalTerms : [...GENERAL_TERMS];

  // Verify user exists
  const userExists = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!userExists) {
    return NextResponse.json({ error: "使用者不存在，請重新登入" }, { status: 400 });
  }

  // Verify all quotationTypeIds exist
  for (const service of data.services) {
    const typeExists = await prisma.quotationType.findUnique({ where: { id: service.quotationTypeId } });
    if (!typeExists) {
      return NextResponse.json({ error: `版型 ID ${service.quotationTypeId} 不存在，請重新整理頁面` }, { status: 400 });
    }
  }

  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber,
      projectName: data.projectName,
      companyName: data.companyName,
      contactAddress: data.contactAddress,
      primaryContact: data.primaryContact,
      projectPeriod: data.projectPeriod,
      periodStart: data.periodStart ? new Date(data.periodStart) : null,
      periodEnd: data.periodEnd ? new Date(data.periodEnd) : null,
      companyTaxId: data.companyTaxId,
      companyPhone: data.companyPhone,
      contactPhone: data.contactPhone,
      referrer: data.referrer,
      subtotal,
      taxAmount,
      totalAmount,
      generalTerms: toJsonString(generalTerms),
      stampTextA: data.stampTextA || "發票章用印",
      stampTextB: data.stampTextB || "發票章用印",
      notes: data.notes,
      createdById: session.user.id,
      services: {
        create: data.services.map((service, idx) => ({
          quotationTypeId: service.quotationTypeId,
          sectionLabel: service.sectionLabel,
          sectionTitle: service.sectionTitle,
          periodStart: service.periodStart ? new Date(service.periodStart) : null,
          periodEnd: service.periodEnd ? new Date(service.periodEnd) : null,
          period: service.period,
          quantity: service.quantity,
          months: service.months || 0,
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
              isCustom: item.isCustom || false,
              sortOrder: itemIdx,
            })),
          },
        })),
      },
    },
    include: {
      services: { include: { items: true } },
    },
  });

  // Parse JSON strings back to arrays for response
  return NextResponse.json({
    ...quotation,
    generalTerms: fromJsonString(quotation.generalTerms),
    services: quotation.services.map((s) => ({
      ...s,
      terms: fromJsonString(s.terms),
    })),
  }, { status: 201 });
}
