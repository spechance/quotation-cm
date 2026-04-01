"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Send,
  CheckCircle,
  XCircle,
  Download,
  Clock,
  Trash2,
} from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, ROLE_LABELS } from "@/lib/constants";
import { formatNumber, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface Quotation {
  id: string;
  quotationNumber: string;
  version: number;
  status: string;
  projectName: string;
  companyName: string;
  contactAddress: string;
  primaryContact: string;
  projectPeriod: string;
  companyTaxId: string;
  companyPhone: string;
  contactPhone: string;
  originalCreatorName: string | null;
  transferNote: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  generalTerms: string[];
  quotationDate: string;
  createdBy: { id: string; name: string; email: string };
  services: {
    id: string;
    sectionLabel: string;
    sectionTitle: string;
    period: string;
    quantity: string;
    subtotal: number;
    terms: string[];
    quotationType: { name: string; code: string };
    items: {
      id: string;
      itemNumber: number;
      description: string;
      specification: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      amount: number;
      isCustom: boolean;
    }[];
  }[];
  approvals: {
    id: string;
    action: string;
    comment: string;
    createdAt: string;
    user: { name: string };
  }[];
}

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"APPROVED" | "REJECTED">(
    "APPROVED"
  );
  const [approvalComment, setApprovalComment] = useState("");

  async function fetchQuotation() {
    const res = await fetch(`/api/quotations/${params.id}`);
    if (res.ok) {
      setQuotation(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchQuotation();
  }, [params.id]);

  async function handleSubmit() {
    if (!confirm("確定要送出審核？")) return;
    setActionLoading(true);
    await fetch(`/api/quotations/${params.id}/submit`, { method: "POST" });
    fetchQuotation();
    setActionLoading(false);
  }

  async function handleApproval() {
    setActionLoading(true);
    await fetch(`/api/quotations/${params.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: approvalAction,
        comment: approvalComment,
      }),
    });
    setShowApproveDialog(false);
    setApprovalComment("");
    fetchQuotation();
    setActionLoading(false);
  }

  async function handleDelete() {
    if (!confirm("確定要刪除此報價單？此操作無法復原。")) return;
    setActionLoading(true);
    await fetch(`/api/quotations/${params.id}`, { method: "DELETE" });
    router.push("/quotations");
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        載入中...
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        找不到報價單
      </div>
    );
  }

  const userRole = session?.user?.role;
  const userId = session?.user?.id;
  const isOwner = quotation.createdBy.id === userId;
  const canEdit =
    (isOwner && (quotation.status === "DRAFT" || quotation.status === "REJECTED")) ||
    userRole === "ADMIN";
  const canSubmit =
    (isOwner || userRole === "ADMIN" || userRole === "FINANCE") &&
    (quotation.status === "DRAFT" || quotation.status === "REJECTED");
  const canApprove =
    (userRole === "ADMIN" || userRole === "FINANCE") &&
    quotation.status === "PENDING_APPROVAL";
  const canExport = quotation.status === "APPROVED" || userRole === "ADMIN";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-blue-600">
                {quotation.quotationNumber}
              </h1>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[quotation.status]}`}
              >
                {STATUS_LABELS[quotation.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              版本 {quotation.version} | 報價日期{" "}
              {formatDate(quotation.quotationDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <Link
              href={`/quotations/${quotation.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
              編輯
            </Link>
          )}
          {canSubmit && (
            <button
              onClick={handleSubmit}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-yellow-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              送出審核
            </button>
          )}
          {canApprove && (
            <>
              <button
                onClick={() => {
                  setApprovalAction("APPROVED");
                  setShowApproveDialog(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                核准
              </button>
              <button
                onClick={() => {
                  setApprovalAction("REJECTED");
                  setShowApproveDialog(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                <XCircle className="h-4 w-4" />
                退回
              </button>
            </>
          )}
          {canExport && (
            <a
              href={`/api/quotations/${quotation.id}/pdf`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <Download className="h-4 w-4" />
              匯出 PDF
            </a>
          )}
          {canEdit && (
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              刪除
            </button>
          )}
        </div>
      </div>

      {/* Client Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">客戶資訊</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">專案名稱：</span>
            <span className="font-medium text-gray-900">
              {quotation.projectName}
            </span>
          </div>
          <div>
            <span className="text-gray-500">專案走期：</span>
            <span className="font-medium text-gray-900">
              {quotation.projectPeriod || "-"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">公司名稱：</span>
            <span className="font-medium text-gray-900">
              {quotation.companyName}
            </span>
          </div>
          <div>
            <span className="text-gray-500">公司統編：</span>
            <span className="font-medium text-gray-900">
              {quotation.companyTaxId || "-"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">聯絡地址：</span>
            <span className="font-medium text-gray-900">
              {quotation.contactAddress || "-"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">公司電話：</span>
            <span className="font-medium text-gray-900">
              {quotation.companyPhone || "-"}
            </span>
          </div>
          <div>
            <span className="text-gray-500">主要窗口：</span>
            <span className="font-medium text-gray-900">
              {quotation.primaryContact}
            </span>
          </div>
          <div>
            <span className="text-gray-500">窗口電話：</span>
            <span className="font-medium text-gray-900">
              {quotation.contactPhone || "-"}
            </span>
          </div>
        </div>
        {quotation.transferNote && (
          <div className="mt-3 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
            <span className="font-medium">轉移紀錄：</span>{quotation.transferNote}
            {quotation.originalCreatorName && <span className="ml-2 text-xs text-yellow-500">（原業務：{quotation.originalCreatorName}）</span>}
          </div>
        )}
      </div>

      {/* Services */}
      {quotation.services.map((service) => (
        <div
          key={service.id}
          className="rounded-xl border border-gray-200 bg-white"
        >
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {service.sectionLabel}、{service.sectionTitle}
              </h3>
              <span className="text-sm font-medium text-gray-600">
                小計: ${formatNumber(service.subtotal)}
              </span>
            </div>
            {(service.period || service.quantity) && (
              <p className="mt-1 text-sm text-gray-500">
                {service.period && `走期: ${service.period}`}
                {service.period && service.quantity && " | "}
                {service.quantity && `數量: ${service.quantity}`}
              </p>
            )}
          </div>
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">
                    #
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">
                    項目
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">
                    規格說明
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500">
                    數量
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">
                    單位
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500">
                    單價
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500">
                    小計
                  </th>
                </tr>
              </thead>
              <tbody>
                {service.items.filter((item) => item.quantity > 0).map((item) => (
                  <tr key={item.id} className={`border-b border-gray-100 ${item.isCustom && quotation.status === "PENDING_APPROVAL" ? "bg-blue-50" : ""}`}
                    title={item.isCustom && quotation.status === "PENDING_APPROVAL" ? "業務新增項目" : ""}>
                    <td className="px-2 py-2 text-sm text-gray-500">
                      {item.itemNumber}
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-500">
                      {item.specification}
                    </td>
                    <td className="px-2 py-2 text-right text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-2 py-2 text-sm text-gray-500">
                      {item.unit}
                    </td>
                    <td className="px-2 py-2 text-right text-sm text-gray-900">
                      ${formatNumber(item.unitPrice)}
                    </td>
                    <td className="px-2 py-2 text-right text-sm font-medium text-gray-900">
                      ${formatNumber(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Service terms */}
            {service.terms.length > 0 && (
              <div className="mt-4 rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 text-xs font-semibold text-gray-500 uppercase">
                  服務條款
                </h4>
                <div className="space-y-1 text-xs text-gray-600">
                  {service.terms.map((term, i) => (
                    <p key={i}>{term}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Financial Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="ml-auto w-72 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">小計</span>
            <span className="font-medium">${formatNumber(quotation.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">營業稅 5%</span>
            <span className="font-medium">
              ${formatNumber(quotation.taxAmount)}
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-lg">
            <span className="font-bold text-gray-900">含稅總價</span>
            <span className="font-bold text-primary-600">
              ${formatNumber(quotation.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* General Terms */}
      {quotation.generalTerms.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            一般條款
          </h2>
          <div className="space-y-1 text-xs text-gray-600">
            {quotation.generalTerms.map((term, i) => (
              <p key={i} className="whitespace-pre-line">{term}</p>
            ))}
          </div>
        </div>
      )}

      {/* Approval History */}
      {quotation.approvals.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            審核紀錄
          </h2>
          <div className="space-y-3">
            {quotation.approvals.map((approval) => (
              <div
                key={approval.id}
                className="flex items-start gap-3 rounded-lg bg-gray-50 p-3"
              >
                <Clock className="mt-0.5 h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{approval.user.name}</span>
                    {" "}
                    {approval.action === "SUBMITTED"
                      ? "送出審核"
                      : approval.action === "APPROVED"
                        ? "核准"
                        : "退回"}
                  </p>
                  {approval.comment && (
                    <p className="mt-1 text-sm text-gray-600">
                      {approval.comment}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDate(approval.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approval Dialog */}
      {showApproveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">
              {approvalAction === "APPROVED" ? "核准報價單" : "退回報價單"}
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                備註（選填）
              </label>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                placeholder="輸入審核備註..."
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowApproveDialog(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleApproval}
                disabled={actionLoading}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  approvalAction === "APPROVED"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                確認{approvalAction === "APPROVED" ? "核准" : "退回"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
