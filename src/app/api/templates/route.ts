import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fromJsonString } from "@/lib/json-helpers";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  defaultTerms: z.array(z.string()).default([]),
  defaultSections: z.any().optional(),
  stampTextA: z.string().default("發票章用印"),
  stampTextB: z.string().default("發票章用印"),
  generalTermsSetId: z.string().optional().nullable(),
  visibility: z.enum(["ALL", "SPECIFIC"]).default("ALL"),
  visibleUserIds: z.array(z.string()).default([]),
});

// GET /api/templates
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授權" }, { status: 401 });

  let templates;
  if (session.user.role === "ADMIN" || session.user.role === "FINANCE") {
    // Admin/Finance see all templates
    templates = await prisma.quotationType.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { generalTermsSet: true },
    });
  } else {
    templates = await prisma.quotationType.findMany({
      where: {
        active: true,
        OR: [
          { visibility: "ALL" },
          { visibleToUsers: { some: { userId: session.user.id } } },
        ],
      },
      orderBy: { sortOrder: "asc" },
      include: { generalTermsSet: true },
    });
  }

  const parsed = templates.map((t) => ({
    ...t,
    defaultTerms: fromJsonString(t.defaultTerms),
    defaultSections: t.defaultSections ? JSON.parse(t.defaultSections) : null,
    generalTermsSet: t.generalTermsSet
      ? { ...t.generalTermsSet, terms: fromJsonString(t.generalTermsSet.terms) }
      : null,
  }));

  return NextResponse.json(parsed);
}

// POST /api/templates
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "資料驗證失敗" }, { status: 400 });
  }

  const template = await prisma.quotationType.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      description: parsed.data.description,
      defaultTerms: JSON.stringify(parsed.data.defaultTerms),
      defaultSections: parsed.data.defaultSections ? JSON.stringify(parsed.data.defaultSections) : null,
      stampTextA: parsed.data.stampTextA,
      stampTextB: parsed.data.stampTextB,
      generalTermsSetId: parsed.data.generalTermsSetId || null,
      visibility: parsed.data.visibility,
      visibleToUsers: parsed.data.visibility === "SPECIFIC" && parsed.data.visibleUserIds.length > 0
        ? { create: parsed.data.visibleUserIds.map((userId) => ({ userId })) }
        : undefined,
    },
  });

  return NextResponse.json({
    ...template,
    defaultTerms: fromJsonString(template.defaultTerms),
    defaultSections: template.defaultSections ? JSON.parse(template.defaultSections) : null,
  }, { status: 201 });
}
