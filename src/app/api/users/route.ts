import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().default(""),
  role: z.enum(["ADMIN", "FINANCE", "SALES"]),
});

function generateRandomPassword(): string {
  return randomBytes(6).toString("base64url").slice(0, 10);
}

// GET /api/users
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, phone: true,
      role: true, active: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

// POST /api/users
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "沒有權限" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "資料驗證失敗", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, phone, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "此信箱已被使用" }, { status: 409 });
  }

  // Generate random password
  const tempPassword = generateRandomPassword();
  const passwordHash = await hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, phone, role, mustChangePassword: true },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });

  // Return the temp password so admin can copy it
  return NextResponse.json({ ...user, tempPassword }, { status: 201 });
}
