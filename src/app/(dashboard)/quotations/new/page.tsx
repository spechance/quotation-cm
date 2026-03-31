"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Send, Upload } from "lucide-react";
import { getChineseNumeral, formatNumber } from "@/lib/utils";
import { calculateMonths, formatDateRange } from "@/lib/date-utils";

interface TemplateSection {
  title: string;
  items: { description: string; specification?: string; unit?: string; unitPrice: number }[];
}

interface QuotationType {
  id: string; name: string; code: string;
  defaultTerms: string[];
  defaultSections: TemplateSection[] | null;
  stampTextA: string; stampTextB: string;
  generalTermsSet: { id: string; name: string; terms: string[] } | null;
}

interface ItemForm {
  itemNumber: number; description: string; specification: string;
  quantity: number; unit: string; unitPrice: number;
  isCustom: boolean;
}

interface ServiceForm {
  quotationTypeId: string; sectionLabel: string; sectionTitle: string;
  periodStart: string; periodEnd: string; months: number;
  terms: string[]; items: ItemForm[]; collapsed: boolean;
}

export default function NewQuotationPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<QuotationType[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploadMode, setIsUploadMode] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Client info
  const [projectName, setProjectName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [primaryContact, setPrimaryContact] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [companyTaxId, setCompanyTaxId] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [referrer, setReferrer] = useState("");

  // Auto from template (hidden, not editable in this page)
  const [stampTextA, setStampTextA] = useState("發票章用印");
  const [stampTextB, setStampTextB] = useState("發票章用印");
  const [generalTerms, setGeneralTerms] = useState<string[]>([]);
  const [stampLoaded, setStampLoaded] = useState(false);

  const [services, setServices] = useState<ServiceForm[]>([]);

  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then(setTemplates);
  }, []);

  function addServiceFromTemplate(template: QuotationType) {
    const sections = (template.defaultSections as TemplateSection[]) || [];
    const newServices: ServiceForm[] = sections.map((section, idx) => ({
      quotationTypeId: template.id,
      sectionLabel: getChineseNumeral(services.length + idx),
      sectionTitle: section.title,
      periodStart: "", periodEnd: "", months: 0,
      terms: idx === 0 ? [...template.defaultTerms] : [],
      collapsed: false,
      items: section.items.map((item, itemIdx) => ({
        itemNumber: itemIdx + 1,
        description: item.description,
        specification: item.specification || "",
        quantity: 1,
        unit: item.unit || "",
        unitPrice: item.unitPrice || 0,
        isCustom: false,
      })),
    }));

    setServices((prev) => {
      const updated = [...prev, ...newServices];
      return updated.map((s, i) => ({ ...s, sectionLabel: getChineseNumeral(i) }));
    });

    // Auto-load stamp & general terms from first template
    if (!stampLoaded) {
      setStampTextA(template.stampTextA || "發票章用印");
      setStampTextB(template.stampTextB || "發票章用印");
      setStampLoaded(true);
    }
    if (template.generalTermsSet) {
      setGeneralTerms(template.generalTermsSet.terms);
    }
  }

  function removeService(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, sectionLabel: getChineseNumeral(i) })));
  }

  function updateServicePeriod(index: number, field: "periodStart" | "periodEnd", value: string) {
    setServices((prev) => prev.map((s, i) => {
      if (i !== index) return s;
      const updated = { ...s, [field]: value };
      const start = field === "periodStart" ? value : s.periodStart;
      const end = field === "periodEnd" ? value : s.periodEnd;
      updated.months = calculateMonths(start, end);
      return updated;
    }));
  }

  function toggleCollapse(index: number) {
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, collapsed: !s.collapsed } : s)));
  }

  function addItem(serviceIndex: number) {
    setServices((prev) => prev.map((s, i) => {
      if (i !== serviceIndex) return s;
      return { ...s, items: [...s.items, { itemNumber: s.items.length + 1, description: "", specification: "", quantity: 1, unit: "", unitPrice: 0, isCustom: true }] };
    }));
  }

  function removeItem(serviceIndex: number, itemIndex: number) {
    setServices((prev) => prev.map((s, i) => {
      if (i !== serviceIndex) return s;
      return { ...s, items: s.items.filter((_, j) => j !== itemIndex).map((item, j) => ({ ...item, itemNumber: j + 1 })) };
    }));
  }

  function updateItem(sIdx: number, iIdx: number, field: string, value: string | number) {
    setServices((prev) => prev.map((s, i) => {
      if (i !== sIdx) return s;
      return { ...s, items: s.items.map((item, j) => (j === iIdx ? { ...item, [field]: value } : item)) };
    }));
  }

  function getServiceSubtotal(service: ServiceForm): number {
    return service.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }

  const subtotal = services.reduce((sum, s) => sum + getServiceSubtotal(s), 0);
  const taxAmount = Math.round(subtotal * 0.05);
  const totalAmount = subtotal + taxAmount;

  async function handleSave(submitForApproval: boolean) {
    if (!projectName || !companyName || !primaryContact) {
      alert("請填寫必要的客戶資訊（專案名稱、公司名稱、主要窗口）");
      return;
    }

    if (isUploadMode) {
      if (!uploadFile) { alert("請上傳 Word 檔案"); return; }
      setLoading(true);
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("projectName", projectName);
      formData.append("companyName", companyName);
      formData.append("contactAddress", contactAddress);
      formData.append("primaryContact", primaryContact);
      formData.append("periodStart", periodStart);
      formData.append("periodEnd", periodEnd);
      formData.append("companyTaxId", companyTaxId);
      formData.append("companyPhone", companyPhone);
      formData.append("contactPhone", contactPhone);
      formData.append("submitForApproval", submitForApproval ? "true" : "false");
      try {
        const res = await fetch("/api/quotations/upload", { method: "POST", body: formData });
        if (!res.ok) { const err = await res.json(); alert(err.error || "上傳失敗"); setLoading(false); return; }
        const quotation = await res.json();
        router.push(`/quotations/${quotation.id}`);
      } catch { alert("發生錯誤"); setLoading(false); }
      return;
    }

    if (services.length === 0) { alert("請至少新增一個服務項目"); return; }

    setLoading(true);
    const body = {
      projectName, companyName, contactAddress, primaryContact,
      projectPeriod: formatDateRange(periodStart, periodEnd),
      periodStart: periodStart || undefined, periodEnd: periodEnd || undefined,
      companyTaxId, companyPhone, contactPhone, referrer,
      stampTextA, stampTextB, generalTerms,
      services: services.map((s, idx) => ({
        quotationTypeId: s.quotationTypeId,
        sectionLabel: getChineseNumeral(idx),
        sectionTitle: s.sectionTitle,
        periodStart: s.periodStart || undefined, periodEnd: s.periodEnd || undefined,
        period: formatDateRange(s.periodStart, s.periodEnd),
        months: s.months,
        quantity: s.months > 0 ? `${s.months}/月` : "",
        subtotal: getServiceSubtotal(s),
        terms: s.terms, sortOrder: idx,
        items: s.items.map((item, itemIdx) => ({
          itemNumber: itemIdx + 1, description: item.description,
          specification: item.specification, quantity: item.quantity,
          unit: item.unit, unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
          sortOrder: itemIdx, isCustom: item.isCustom,
        })),
      })),
    };

    try {
      const res = await fetch("/api/quotations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json(); alert(err.error || "建立失敗"); setLoading(false); return; }
      const quotation = await res.json();
      if (submitForApproval) { await fetch(`/api/quotations/${quotation.id}/submit`, { method: "POST" }); }
      router.push(`/quotations/${quotation.id}`);
    } catch { alert("發生錯誤"); setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">建立報價單</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsUploadMode(false)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!isUploadMode ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>標準報價單</button>
          <button onClick={() => setIsUploadMode(true)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${isUploadMode ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>上傳 Word 檔</button>
        </div>
      </div>

      {/* Client Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">客戶資訊</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><label className="block text-sm font-medium text-gray-700">專案名稱 <span className="text-red-500">*</span></label><input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700">專案走期</label>
            <div className="mt-1 flex items-center gap-2">
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" />
              <span className="text-gray-400">～</span>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" />
            </div>
            {periodStart && periodEnd && <p className="mt-1 text-xs text-gray-500">共 {calculateMonths(periodStart, periodEnd)} 個月</p>}
          </div>
          <div><label className="block text-sm font-medium text-gray-700">公司名稱 <span className="text-red-500">*</span></label><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700">公司統編</label><input value={companyTaxId} onChange={(e) => setCompanyTaxId(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700">聯絡地址</label><input value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700">公司電話</label><input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700">主要窗口 <span className="text-red-500">*</span></label><input value={primaryContact} onChange={(e) => setPrimaryContact(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700">窗口電話</label><input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700">引薦廠商 <span className="text-xs text-gray-400">（選填）</span></label><input value={referrer} onChange={(e) => setReferrer(e.target.value)} placeholder="如有引薦廠商請填寫" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>
        </div>
      </div>

      {/* Upload Mode */}
      {isUploadMode && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">上傳報價單檔案</h2>
          <p className="mb-3 text-sm text-gray-500">上傳 Word 檔案（.docx），審核通過後可匯出為 PDF</p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 hover:border-primary-500 hover:bg-gray-50">
            <Upload className="mb-2 h-8 w-8 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">{uploadFile ? uploadFile.name : "點擊選擇或拖曳 Word 檔案"}</span>
            <input type="file" accept=".docx,.doc" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
          </label>
        </div>
      )}

      {/* Standard Mode */}
      {!isUploadMode && (
        <>
          {/* Add Service Template */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">新增服務項目</h2>
            <p className="mb-3 text-sm text-gray-500">選擇報價單版型，可選擇多個版型進行合併</p>
            <div className="flex flex-wrap gap-3">
              {templates.map((t) => (
                <button key={t.id} onClick={() => addServiceFromTemplate(t)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700">
                  <Plus className="h-4 w-4" />{t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Service Sections */}
          {services.map((service, sIdx) => (
            <div key={sIdx} className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleCollapse(sIdx)}>
                    {service.collapsed ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronUp className="h-5 w-5 text-gray-400" />}
                  </button>
                  <span className="text-lg font-bold text-gray-800">{service.sectionLabel}</span>
                  <span className="text-lg font-semibold text-gray-900">{service.sectionTitle}</span>
                </div>
                <div className="flex items-center gap-4">
                  {service.months > 0 && <span className="text-xs text-gray-500">{service.months} 個月</span>}
                  <span className="text-sm font-medium text-gray-600">小計: ${formatNumber(getServiceSubtotal(service))}</span>
                  <button onClick={() => removeService(sIdx)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              {!service.collapsed && (
                <div className="p-6">
                  {/* Period */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">走期</label>
                    <div className="mt-1 flex items-center gap-2">
                      <input type="date" value={service.periodStart} onChange={(e) => updateServicePeriod(sIdx, "periodStart", e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" />
                      <span className="text-gray-400">～</span>
                      <input type="date" value={service.periodEnd} onChange={(e) => updateServicePeriod(sIdx, "periodEnd", e.target.value)} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" />
                      {service.months > 0 && <span className="whitespace-nowrap text-sm text-gray-500">({service.months} 個月)</span>}
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="mb-4 w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">#</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">項目</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500">規格說明</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 w-20">數量</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 w-16">單位</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-500 w-28">單價</th>
                        <th className="px-2 py-2 text-right text-xs font-semibold text-gray-500 w-28">小計</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {service.items.map((item, iIdx) => {
                        const isTemplate = !item.isCustom;
                        return (
                          <tr key={iIdx} className={`border-b border-gray-100 ${item.isCustom ? "bg-blue-50" : ""}`}>
                            <td className="px-2 py-2 text-sm text-gray-500">{item.itemNumber}</td>
                            <td className="px-2 py-2">
                              {isTemplate
                                ? <span className="block px-2 py-1.5 text-sm text-gray-700">{item.description}</span>
                                : <input value={item.description} onChange={(e) => updateItem(sIdx, iIdx, "description", e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none" />
                              }
                            </td>
                            <td className="px-2 py-2">
                              {isTemplate
                                ? <span className="block px-2 py-1.5 text-sm text-gray-500">{item.specification || "-"}</span>
                                : <input value={item.specification} onChange={(e) => updateItem(sIdx, iIdx, "specification", e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none" />
                              }
                            </td>
                            <td className="px-2 py-2">
                              <input type="number" value={item.quantity} onChange={(e) => updateItem(sIdx, iIdx, "quantity", parseInt(e.target.value) || 0)} className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm text-right focus:border-primary-500 focus:outline-none" />
                            </td>
                            <td className="px-2 py-2">
                              {isTemplate
                                ? <span className="block px-2 py-1.5 text-sm text-gray-500">{item.unit || "-"}</span>
                                : <input value={item.unit} onChange={(e) => updateItem(sIdx, iIdx, "unit", e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none" />
                              }
                            </td>
                            <td className="px-2 py-2">
                              {isTemplate
                                ? <span className="block px-2 py-1.5 text-sm text-right text-gray-700">${formatNumber(item.unitPrice)}</span>
                                : <input type="number" value={item.unitPrice} onChange={(e) => updateItem(sIdx, iIdx, "unitPrice", parseInt(e.target.value) || 0)} className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm text-right focus:border-primary-500 focus:outline-none" />
                              }
                            </td>
                            <td className="px-2 py-2 text-right text-sm font-medium text-gray-900">${formatNumber(item.quantity * item.unitPrice)}</td>
                            <td className="px-2 py-2">
                              {item.isCustom && (
                                <button onClick={() => removeItem(sIdx, iIdx)} className="rounded p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <button onClick={() => addItem(sIdx)} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"><Plus className="h-4 w-4" />新增項目</button>

                  {/* Service Terms (read-only display) */}
                  {service.terms.length > 0 && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <h4 className="mb-2 text-sm font-medium text-gray-500">服務條款</h4>
                      <div className="space-y-1 text-xs text-gray-500">
                        {service.terms.map((term, tIdx) => <p key={tIdx}>{term}</p>)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Financial Summary */}
          {services.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">金額摘要</h2>
              <div className="ml-auto w-72 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-600">小計 上述項目各單價之總和</span><span className="font-medium text-gray-900">${formatNumber(subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">營業稅 5%</span><span className="font-medium text-gray-900">${formatNumber(taxAmount)}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-base"><span className="font-semibold text-gray-900">總額 含稅總價</span><span className="font-bold text-primary-600">${formatNumber(totalAmount)}</span></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <button onClick={() => router.back()} className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">取消</button>
        <button onClick={() => handleSave(false)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><Save className="h-4 w-4" />儲存草稿</button>
        <button onClick={() => handleSave(true)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"><Send className="h-4 w-4" />儲存並送審</button>
      </div>
    </div>
  );
}
