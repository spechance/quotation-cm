import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateQuotationNumber } from "@/lib/quotation-number";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "請上傳檔案" }, { status: 400 });

  // Validate file type
  if (!file.name.endsWith(".docx") && !file.name.endsWith(".doc")) {
    return NextResponse.json({ error: "僅支援 Word 檔案 (.docx, .doc)" }, { status: 400 });
  }

  // Save file
  const uploadsDir = join(process.cwd(), "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = join(uploadsDir, fileName);
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  const quotationNumber = await generateQuotationNumber();
  const submitForApproval = formData.get("submitForApproval") === "true";

  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber,
      quotationType: "UPLOAD",
      projectName: (formData.get("projectName") as string) || "",
      companyName: (formData.get("companyName") as string) || "",
      contactAddress: (formData.get("contactAddress") as string) || "",
      primaryContact: (formData.get("primaryContact") as string) || "",
      projectPeriod: "",
      periodStart: formData.get("periodStart") ? new Date(formData.get("periodStart") as string) : null,
      periodEnd: formData.get("periodEnd") ? new Date(formData.get("periodEnd") as string) : null,
      companyTaxId: (formData.get("companyTaxId") as string) || "",
      companyPhone: (formData.get("companyPhone") as string) || "",
      contactPhone: (formData.get("contactPhone") as string) || "",
      uploadedFilePath: filePath,
      uploadedFileName: file.name,
      status: submitForApproval ? "PENDING_APPROVAL" : "DRAFT",
      createdById: session.user.id,
    },
  });

  if (submitForApproval) {
    await prisma.approvalRecord.create({
      data: { quotationId: quotation.id, userId: session.user.id, action: "SUBMITTED" },
    });
  }

  return NextResponse.json(quotation, { status: 201 });
}
