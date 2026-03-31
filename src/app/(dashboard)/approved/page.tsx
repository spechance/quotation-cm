import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatNumber, formatDate } from "@/lib/utils";

export default async function ApprovedPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "SALES") redirect("/dashboard");

  const quotations = await prisma.quotation.findMany({
    where: { status: "APPROVED" },
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      services: { select: { sectionTitle: true } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">已核准報價單</h1>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">報價單編號</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">專案 / 客戶</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">服務項目</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">金額</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">建立者</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">核准日期</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {quotations.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">目前沒有已核准的報價單</td></tr>
            ) : (
              quotations.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><Link href={`/quotations/${q.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">{q.quotationNumber}</Link></td>
                  <td className="px-6 py-4"><p className="text-sm font-medium text-gray-900">{q.projectName}</p><p className="text-xs text-gray-500">{q.companyName}</p></td>
                  <td className="px-6 py-4"><div className="flex flex-wrap gap-1">{q.services.map((s, i) => (<span key={i} className="inline-flex rounded-md bg-green-50 px-2 py-0.5 text-xs text-green-700">{s.sectionTitle}</span>))}</div></td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">${formatNumber(q.totalAmount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{q.createdBy.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(q.updatedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
