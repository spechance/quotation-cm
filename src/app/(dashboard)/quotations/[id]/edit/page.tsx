"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Send } from "lucide-react";
import { GENERAL_TERMS } from "@/lib/constants";
import { getChineseNumeral, formatNumber } from "@/lib/utils";

interface QuotationType {
  id: string;
  name: string;
  code: string;
  defaultTerms: string[];
  defaultSections: { title: string; items: { description: string; specification?: string; unit?: string; unitPrice: number }[] }[] | null;
}

interface ItemForm {
  itemNumber: number;
  description: string;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface ServiceForm {
  quotationTypeId: string;
  sectionLabel: string;
  sectionTitle: string;
  period: string;
  quantity: string;
  terms: string[];
  items: ItemForm[];
  collapsed: boolean;
}

export default function EditQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const [templates, setTemplates] = useState<QuotationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [primaryContact, setPrimaryContact] = useState("");
  const [projectPeriod, setProjectPeriod] = useState("");
  const [companyTaxId, setCompanyTaxId] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [services, setServices] = useState<ServiceForm[]>([]);
  const [generalTerms, setGeneralTerms] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/templates").then((r) => r.json()),
      fetch(`/api/quotations/${params.id}`).then((r) => r.json()),
    ]).then(([tmpls, quotation]) => {
      setTemplates(tmpls);
      setProjectName(quotation.projectName);
      setCompanyName(quotation.companyName);
      setContactAddress(quotation.contactAddress || "");
      setPrimaryContact(quotation.primaryContact);
      setProjectPeriod(quotation.projectPeriod || "");
      setCompanyTaxId(quotation.companyTaxId || "");
      setCompanyPhone(quotation.companyPhone || "");
      setContactPhone(quotation.contactPhone || "");
      setGeneralTerms(quotation.generalTerms || [...GENERAL_TERMS]);
      setServices(
        quotation.services.map((s: Record<string, unknown>) => ({
          quotationTypeId: s.quotationTypeId,
          sectionLabel: s.sectionLabel,
          sectionTitle: s.sectionTitle,
          period: s.period || "",
          quantity: s.quantity || "",
          terms: s.terms || [],
          collapsed: false,
          items: (s.items as Record<string, unknown>[]).map((item: Record<string, unknown>, i: number) => ({
            itemNumber: i + 1,
            description: item.description || "",
            specification: item.specification || "",
            quantity: item.quantity || 1,
            unit: item.unit || "",
            unitPrice: item.unitPrice || 0,
          })),
        }))
      );
      setLoading(false);
    });
  }, [params.id]);

  function addServiceFromTemplate(template: QuotationType) {
    const sections = template.defaultSections || [];
    const newServices: ServiceForm[] = sections.map((section, idx) => ({
      quotationTypeId: template.id,
      sectionLabel: getChineseNumeral(services.length + idx),
      sectionTitle: section.title,
      period: "",
      quantity: "",
      terms: idx === 0 ? [...template.defaultTerms] : [],
      collapsed: false,
      items: section.items.map((item, itemIdx) => ({
        itemNumber: itemIdx + 1,
        description: item.description,
        specification: item.specification || "",
        quantity: 1,
        unit: item.unit || "",
        unitPrice: item.unitPrice || 0,
      })),
    }));
    setServices((prev) => {
      const updated = [...prev, ...newServices];
      return updated.map((s, i) => ({ ...s, sectionLabel: getChineseNumeral(i) }));
    });
  }

  function removeService(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, sectionLabel: getChineseNumeral(i) })));
  }

  function updateService(index: number, field: string, value: string) {
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function toggleCollapse(index: number) {
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, collapsed: !s.collapsed } : s)));
  }

  function addItem(serviceIndex: number) {
    setServices((prev) =>
      prev.map((s, i) => {
        if (i !== serviceIndex) return s;
        return { ...s, items: [...s.items, { itemNumber: s.items.length + 1, description: "", specification: "", quantity: 1, unit: "", unitPrice: 0 }] };
      })
    );
  }

  function removeItem(serviceIndex: number, itemIndex: number) {
    setServices((prev) =>
      prev.map((s, i) => {
        if (i !== serviceIndex) return s;
        return { ...s, items: s.items.filter((_, j) => j !== itemIndex).map((item, j) => ({ ...item, itemNumber: j + 1 })) };
      })
    );
  }

  function updateItem(serviceIndex: number, itemIndex: number, field: string, value: string | number) {
    setServices((prev) =>
      prev.map((s, i) => {
        if (i !== serviceIndex) return s;
        return { ...s, items: s.items.map((item, j) => (j === itemIndex ? { ...item, [field]: value } : item)) };
      })
    );
  }

  function getServiceSubtotal(service: ServiceForm): number {
    return service.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }

  const subtotal = services.reduce((sum, s) => sum + getServiceSubtotal(s), 0);
  const taxAmount = Math.round(subtotal * 0.05);
  const totalAmount = subtotal + taxAmount;

  async function handleSave(submitForApproval: boolean) {
    if (!projectName || !companyName || !primaryContact) {
      alert("請填寫必要的客戶資訊");
      return;
    }
    if (services.length === 0) {
      alert("請至少新增一個服務項目");
      return;
    }

    setSaving(true);
    const body = {
      projectName, companyName, contactAddress, primaryContact, projectPeriod, companyTaxId, companyPhone, contactPhone, generalTerms,
      services: services.map((s, idx) => ({
        quotationTypeId: s.quotationTypeId,
        sectionLabel: getChineseNumeral(idx),
        sectionTitle: s.sectionTitle,
        period: s.period,
        quantity: s.quantity,
        subtotal: getServiceSubtotal(s),
        terms: s.terms,
        sortOrder: idx,
        items: s.items.map((item, itemIdx) => ({
          itemNumber: itemIdx + 1,
          description: item.description,
          specification: item.specification,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
          sortOrder: itemIdx,
        })),
      })),
    };

    try {
      const res = await fetch(`/api/quotations/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "更新失敗");
        setSaving(false);
        return;
      }

      if (submitForApproval) {
        await fetch(`/api/quotations/${params.id}/submit`, { method: "POST" });
      }

      router.push(`/quotations/${params.id}`);
    } catch {
      alert("發生錯誤");
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-gray-500">載入中...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">編輯報價單</h1>

      {/* Client Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">客戶資訊</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            { label: "專案名稱", value: projectName, setter: setProjectName, required: true },
            { label: "專案走期", value: projectPeriod, setter: setProjectPeriod },
            { label: "公司名稱", value: companyName, setter: setCompanyName, required: true },
            { label: "公司統編", value: companyTaxId, setter: setCompanyTaxId },
            { label: "聯絡地址", value: contactAddress, setter: setContactAddress },
            { label: "公司電話", value: companyPhone, setter: setCompanyPhone },
            { label: "主要窗口", value: primaryContact, setter: setPrimaryContact, required: true },
            { label: "窗口電話", value: contactPhone, setter: setContactPhone },
          ].map((field) => (
            <div key={field.label}>
              <label className="block text-sm font-medium text-gray-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Add Template */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">新增服務項目</h2>
        <div className="flex flex-wrap gap-3">
          {templates.map((t) => (
            <button key={t.id} onClick={() => addServiceFromTemplate(t)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700">
              <Plus className="h-4 w-4" />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Services */}
      {services.map((service, sIdx) => (
        <div key={sIdx} className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => toggleCollapse(sIdx)}>
                {service.collapsed ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronUp className="h-5 w-5 text-gray-400" />}
              </button>
              <span className="text-lg font-bold text-gray-800">{service.sectionLabel}</span>
              <input value={service.sectionTitle} onChange={(e) => updateService(sIdx, "sectionTitle", e.target.value)} className="border-b border-transparent text-lg font-semibold text-gray-900 focus:border-primary-500 focus:outline-none" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600">小計: ${formatNumber(getServiceSubtotal(service))}</span>
              <button onClick={() => removeService(sIdx)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          {!service.collapsed && (
            <div className="p-6">
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">走期</label>
                  <input value={service.period} onChange={(e) => updateService(sIdx, "period", e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">數量</label>
                  <input value={service.quantity} onChange={(e) => updateService(sIdx, "quantity", e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" />
                </div>
              </div>
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
                  {service.items.map((item, iIdx) => (
                    <tr key={iIdx} className="border-b border-gray-100">
                      <td className="px-2 py-2 text-sm text-gray-500">{item.itemNumber}</td>
                      <td className="px-2 py-2"><input value={item.description} onChange={(e) => updateItem(sIdx, iIdx, "description", e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none" /></td>
                      <td className="px-2 py-2"><input value={item.specification} onChange={(e) => updateItem(sIdx, iIdx, "specification", e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none" /></td>
                      <td className="px-2 py-2"><input type="number" value={item.quantity} onChange={(e) => updateItem(sIdx, iIdx, "quantity", parseInt(e.target.value) || 0)} className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm text-right focus:border-primary-500 focus:outline-none" /></td>
                      <td className="px-2 py-2"><input value={item.unit} onChange={(e) => updateItem(sIdx, iIdx, "unit", e.target.value)} className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none" /></td>
                      <td className="px-2 py-2"><input type="number" value={item.unitPrice} onChange={(e) => updateItem(sIdx, iIdx, "unitPrice", parseInt(e.target.value) || 0)} className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm text-right focus:border-primary-500 focus:outline-none" /></td>
                      <td className="px-2 py-2 text-right text-sm font-medium text-gray-900">${formatNumber(item.quantity * item.unitPrice)}</td>
                      <td className="px-2 py-2"><button onClick={() => removeItem(sIdx, iIdx)} className="rounded p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={() => addItem(sIdx)} className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800"><Plus className="h-4 w-4" />新增項目</button>

              {service.terms.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <h4 className="mb-2 text-sm font-medium text-gray-700">服務條款</h4>
                  <div className="space-y-1">
                    {service.terms.map((term, tIdx) => (
                      <div key={tIdx} className="flex gap-2">
                        <textarea value={term} onChange={(e) => { const newTerms = [...service.terms]; newTerms[tIdx] = e.target.value; setServices((prev) => prev.map((s, i) => (i === sIdx ? { ...s, terms: newTerms } : s))); }} rows={2} className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-600 focus:border-primary-500 focus:outline-none" />
                        <button onClick={() => { const newTerms = service.terms.filter((_, j) => j !== tIdx); setServices((prev) => prev.map((s, i) => (i === sIdx ? { ...s, terms: newTerms } : s))); }} className="self-start rounded p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
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
          <div className="ml-auto w-72 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">小計</span><span className="font-medium">${formatNumber(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">營業稅 5%</span><span className="font-medium">${formatNumber(taxAmount)}</span></div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base"><span className="font-semibold">含稅總價</span><span className="font-bold text-primary-600">${formatNumber(totalAmount)}</span></div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <button onClick={() => router.back()} className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">取消</button>
        <button onClick={() => handleSave(false)} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><Save className="h-4 w-4" />儲存</button>
        <button onClick={() => handleSave(true)} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"><Send className="h-4 w-4" />儲存並送審</button>
      </div>
    </div>
  );
}
