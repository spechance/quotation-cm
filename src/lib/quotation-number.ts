import { prisma } from "./prisma";

export async function generateQuotationNumber(): Promise<string> {
  const year = new Date().getFullYear();

  // Use Prisma upsert for SQLite compatibility
  const result = await prisma.quotationSequence.upsert({
    where: { year },
    update: { lastSeq: { increment: 1 } },
    create: { year, lastSeq: 1 },
  });

  return `QT-${year}-${String(result.lastSeq).padStart(4, "0")}`;
}
