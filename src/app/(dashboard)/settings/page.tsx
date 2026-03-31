"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, RefreshCw, Save } from "lucide-react";

export default function SettingsPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Company info
  const [companyName, setCompanyName] = useState("");
  const [companyNameEn, setCompanyNameEn] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyTaxId, setCompanyTaxId] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companySaving, setCompanySaving] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);

  async function fetchImages() {
    const res = await fetch("/api/settings/images");
    const data = await res.json();
    setLogoUrl(data.logo);
    setBannerUrl(data.banner);
  }

  async function fetchCompany() {
    const res = await fetch("/api/settings/company");
    const data = await res.json();
    setCompanyName(data.company_name || "");
    setCompanyNameEn(data.company_name_en || "");
    setCompanyAddress(data.company_address || "");
    setCompanyTaxId(data.company_tax_id || "");
    setCompanyPhone(data.company_phone || "");
  }

  useEffect(() => { fetchImages(); fetchCompany(); }, []);

  async function handleUpload(type: "logo" | "banner", file: File) {
    setUploading(type);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    const res = await fetch("/api/settings/upload", { method: "POST", body: formData });
    if (res.ok) await fetchImages();
    else { const err = await res.json(); alert(err.error || "上傳失敗"); }
    setUploading(null);
  }

  async function handleCompanySave() {
    setCompanySaving(true);
    const res = await fetch("/api/settings/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company_name: companyName,
        company_name_en: companyNameEn,
        company_address: companyAddress,
        company_tax_id: companyTaxId,
        company_phone: companyPhone,
      }),
    });
    if (res.ok) {
      setCompanySaved(true);
      setTimeout(() => setCompanySaved(false), 2000);
    } else alert("儲存失敗");
    setCompanySaving(false);
  }

  const inputClass = "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">系統設定</h1>

      {/* Company Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">公司資訊</h2>
            <p className="text-sm text-gray-500">顯示於 PDF 報價單底部</p>
          </div>
          <button
            onClick={handleCompanySave}
            disabled={companySaving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {companySaved ? "已儲存" : companySaving ? "儲存中..." : "儲存"}
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">公司名稱（中文）</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">公司名稱（英文）</label>
              <input value={companyNameEn} onChange={(e) => setCompanyNameEn(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">公司地址</label>
            <input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">統一編號</label>
              <input value={companyTaxId} onChange={(e) => setCompanyTaxId(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">公司電話</label>
              <input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
            <p className="font-medium mb-1">PDF 底部預覽：</p>
            <p>{companyName} {companyNameEn} 地址 {companyAddress}</p>
            <p>統編: {companyTaxId} 電話:{companyPhone} 業務：(自動帶入) 手機：(自動帶入)</p>
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">公司 Logo</h2>
        <p className="mb-4 text-sm text-gray-500">顯示於系統左上角。建議 PNG 或 SVG 格式。</p>
        <div className="flex items-center gap-6">
          <div className="flex h-20 w-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-2">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" /> : <span className="text-sm text-gray-400">尚未上傳</span>}
          </div>
          <div>
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload("logo", f); }} />
            <button onClick={() => logoInputRef.current?.click()} disabled={uploading === "logo"} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
              {uploading === "logo" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {logoUrl ? "替換 Logo" : "上傳 Logo"}
            </button>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">報價單 Banner</h2>
        <p className="mb-4 text-sm text-gray-500">顯示於每張 PDF 報價單最上方。</p>
        <div className="space-y-4">
          <div className="flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-2">
            {bannerUrl ? <img src={bannerUrl} alt="Banner" className="max-h-full max-w-full object-contain" /> : <span className="text-sm text-gray-400">尚未上傳</span>}
          </div>
          <div>
            <input ref={bannerInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload("banner", f); }} />
            <button onClick={() => bannerInputRef.current?.click()} disabled={uploading === "banner"} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
              {uploading === "banner" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {bannerUrl ? "替換 Banner" : "上傳 Banner"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
