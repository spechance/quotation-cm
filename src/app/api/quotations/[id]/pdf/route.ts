import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderQuotationHtml } from "@/lib/pdf/template";
import { fromJsonString } from "@/lib/json-helpers";

async function getCompanyInfo() {
  const defaults: Record<string, string> = {
    company_name: "全偲行銷有限公司",
    company_name_en: "Chance Marketing Co., Ltd.",
    company_address: "114台北市內湖區瑞湖街158號2樓",
    company_tax_id: "82810393",
    company_phone: "02-2368-1518",
  };
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: Object.keys(defaults) } },
  });
  for (const s of settings) defaults[s.key] = s.value;
  return {
    name: defaults.company_name,
    nameEn: defaults.company_name_en,
    address: defaults.company_address,
    taxId: defaults.company_tax_id,
    phone: defaults.company_phone,
  };
}

// GET /api/quotations/[id]/pdf
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const { id } = await params;
  const [quotation, companyInfo] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true, phone: true } },
        services: {
          orderBy: { sortOrder: "asc" },
          include: { items: { orderBy: { sortOrder: "asc" } } },
        },
      },
    }),
    getCompanyInfo(),
  ]);

  if (!quotation) return NextResponse.json({ error: "找不到報價單" }, { status: 404 });

  if (session.user.role === "SALES" && quotation.createdById !== session.user.id) {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const html = renderQuotationHtml({
    quotationNumber: quotation.quotationNumber,
    quotationDate: quotation.quotationDate,
    projectName: quotation.projectName,
    companyName: quotation.companyName,
    contactAddress: quotation.contactAddress || "",
    primaryContact: quotation.primaryContact,
    projectPeriod: quotation.projectPeriod || "",
    companyTaxId: quotation.companyTaxId || "",
    companyPhone: quotation.companyPhone || "",
    contactPhone: quotation.contactPhone || "",
    subtotal: quotation.subtotal,
    taxAmount: quotation.taxAmount,
    totalAmount: quotation.totalAmount,
    generalTerms: fromJsonString(quotation.generalTerms),
    services: quotation.services.map((s) => ({
      sectionLabel: s.sectionLabel,
      sectionTitle: s.sectionTitle,
      period: s.period || "",
      quantity: s.quantity || "",
      subtotal: s.subtotal,
      terms: fromJsonString(s.terms),
      items: s.items.map((item) => ({
        itemNumber: item.itemNumber,
        description: item.description,
        specification: item.specification || "",
        quantity: item.quantity,
        unit: item.unit || "",
        unitPrice: item.unitPrice,
        amount: item.amount,
      })),
    })),
    salesName: quotation.createdBy.name,
    salesPhone: quotation.createdBy.phone || "",
    stampTextA: quotation.stampTextA,
    stampTextB: quotation.stampTextB,
    companyInfo,
  });

  const printHtml = html.replace(
    "</body>",
    `<script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script></body>`
  );

  return new NextResponse(printHtml, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
