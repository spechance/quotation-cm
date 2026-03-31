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

  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber,
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
      generalTerms: toJsonString(generalTerms),
      notes: data.notes,
      createdById: session.user.id,
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
