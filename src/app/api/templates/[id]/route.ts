import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fromJsonString } from "@/lib/json-helpers";

// GET /api/templates/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const { id } = await params;
  const template = await prisma.quotationType.findUnique({ where: { id } });
  if (!template) return NextResponse.json({ error: "找不到版型" }, { status: 404 });

  return NextResponse.json({
    ...template,
    defaultTerms: fromJsonString(template.defaultTerms),
    defaultSections: template.defaultSections ? JSON.parse(template.defaultSections) : null,
  });
}

// PUT /api/templates/[id]
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

  const template = await prisma.quotationType.update({
    where: { id },
    data: {
      name: body.name,
      code: body.code,
      description: body.description,
      defaultTerms: Array.isArray(body.defaultTerms)
        ? JSON.stringify(body.defaultTerms)
        : body.defaultTerms,
      defaultSections: body.defaultSections
        ? JSON.stringify(body.defaultSections)
        : null,
      active: body.active,
    },
  });

  return NextResponse.json({
    ...template,
    defaultTerms: fromJsonString(template.defaultTerms),
    defaultSections: template.defaultSections ? JSON.parse(template.defaultSections) : null,
  });
}
