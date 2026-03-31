"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, FileText, Pencil } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Quotation {
  id: string;
  quotationNumber: string;
  projectName: string;
  companyName: string;
  status: string;
  totalAmount: number;
  referrer: string;
  updatedAt: string;
  createdBy: { name: string };
  services: { sectionTitle: string; quotationType: { name: string } }[];
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function fetchQuotations() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/quotations?${params}`);
    const data = await res.json();
    setQuotations(data.quotations || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchQuotations();
  }, [statusFilter]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchQuotations();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">報價單列表</h1>
        <Link
          href="/quotations/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          建立報價單
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋專案名稱、公司名稱、報價單編號..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
          />
        </form>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
        >
          <option value="">全部狀態</option>
          <option value="DRAFT">草稿</option>
          <option value="PENDING_APPROVAL">待審核</option>
          <option value="APPROVED">已核准</option>
          <option value="REJECTED">已退回</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                報價單編號
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                專案 / 客戶
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                服務項目
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                狀態
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                金額
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                引薦廠商
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                建立者
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                更新日期
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">
                  載入中...
                </td>
              </tr>
            ) : quotations.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <FileText className="mx-auto h-10 w-10 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">尚無報價單</p>
                </td>
              </tr>
            ) : (
              quotations.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/quotations/${q.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {q.quotationNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">
                      {q.projectName}
                    </p>
                    <p className="text-xs text-gray-500">{q.companyName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {q.services.map((s, i) => (
                        <span
                          key={i}
                          className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                        >
                          {s.sectionTitle}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[q.status] || ""}`}
                    >
                      {STATUS_LABELS[q.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(q.totalAmount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {q.referrer || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {q.createdBy.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(q.updatedAt)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {(q.status === "DRAFT" || q.status === "REJECTED") && (
                      <Link
                        href={`/quotations/${q.id}/edit`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        編輯
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
