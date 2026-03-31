import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Clock, CheckCircle, Plus, Users } from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;
  const role = session.user.role;
  const isAdminOrFinance = role === "ADMIN" || role === "FINANCE";

  const whereClause = isAdminOrFinance ? {} : { createdById: userId };

  const [totalCount, draftCount, pendingCount, approvedCount, recentQuotations] =
    await Promise.all([
      prisma.quotation.count({ where: whereClause }),
      prisma.quotation.count({ where: { ...whereClause, status: "DRAFT" } }),
      prisma.quotation.count({ where: isAdminOrFinance ? { status: "PENDING_APPROVAL" } : { createdById: userId, status: "PENDING_APPROVAL" } }),
      prisma.quotation.count({ where: { ...whereClause, status: "APPROVED" } }),
      prisma.quotation.findMany({
        where: whereClause,
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          createdBy: { select: { name: true } },
          services: { select: { sectionTitle: true } },
        },
      }),
    ]);

  // Per-sales stats for Admin/Finance
  let salesStats: { id: string; name: string; total: number; draft: number; pending: number; approved: number }[] = [];
  if (isAdminOrFinance) {
    const salesUsers = await prisma.user.findMany({
      where: { role: "SALES", active: true },
      select: { id: true, name: true },
    });
    salesStats = await Promise.all(
      salesUsers.map(async (u) => {
        const [total, draft, pending, approved] = await Promise.all([
          prisma.quotation.count({ where: { createdById: u.id } }),
          prisma.quotation.count({ where: { createdById: u.id, status: "DRAFT" } }),
          prisma.quotation.count({ where: { createdById: u.id, status: "PENDING_APPROVAL" } }),
          prisma.quotation.count({ where: { createdById: u.id, status: "APPROVED" } }),
        ]);
        return { id: u.id, name: u.name, total, draft, pending, approved };
      })
    );
  }

  const stats = [
    { label: "全部報價單", value: totalCount, icon: FileText, color: "bg-gray-50 text-gray-600" },
    { label: "草稿", value: draftCount, icon: FileText, color: "bg-gray-50 text-gray-600" },
    { label: "待審核", value: pendingCount, icon: Clock, color: "bg-yellow-50 text-yellow-600" },
    { label: "已核准", value: approvedCount, icon: CheckCircle, color: "bg-green-50 text-green-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">儀表板</h1>
          <p className="mt-1 text-sm text-gray-500">歡迎回來，{session.user.name}</p>
        </div>
        <Link href="/quotations/new" className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
          <Plus className="h-4 w-4" />建立報價單
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2.5 ${stat.color}`}><stat.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Per-Sales Stats (Admin/Finance only) */}
      {isAdminOrFinance && salesStats.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center gap-2 border-b border-gray-200 px-6 py-4">
            <Users className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">各業務報價單狀態</h2>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">業務</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-gray-500">全部</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-gray-500">草稿</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-gray-500">待審核</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-gray-500">已核准</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {salesStats.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                    <td className="px-6 py-3 text-center text-sm text-gray-700">{s.total}</td>
                    <td className="px-6 py-3 text-center text-sm text-gray-500">{s.draft}</td>
                    <td className="px-6 py-3 text-center"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.pending > 0 ? "bg-yellow-100 text-yellow-700" : "text-gray-400"}`}>{s.pending}</span></td>
                    <td className="px-6 py-3 text-center"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.approved > 0 ? "bg-green-100 text-green-700" : "text-gray-400"}`}>{s.approved}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Quotations */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">最近的報價單</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentQuotations.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">尚未建立報價單</div>
          ) : (
            recentQuotations.map((q) => (
              <Link key={q.id} href={`/quotations/${q.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{q.quotationNumber}</span>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${q.status === "DRAFT" ? "bg-gray-100 text-gray-700" : q.status === "PENDING_APPROVAL" ? "bg-yellow-100 text-yellow-700" : q.status === "APPROVED" ? "bg-green-100 text-green-700" : q.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>{STATUS_LABELS[q.status]}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{q.projectName} - {q.companyName}
                    {isAdminOrFinance && <span className="ml-2 text-xs text-gray-400">({q.createdBy.name})</span>}
                  </p>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(q.totalAmount)}</p>
                  <p className="mt-1 text-xs text-gray-400">{formatDate(q.updatedAt)}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
