"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  async function fetchImages() {
    const res = await fetch("/api/settings/images");
    const data = await res.json();
    setLogoUrl(data.logo);
    setBannerUrl(data.banner);
  }

  useEffect(() => { fetchImages(); }, []);

  async function handleUpload(type: "logo" | "banner", file: File) {
    setUploading(type);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const res = await fetch("/api/settings/upload", { method: "POST", body: formData });
    if (res.ok) {
      await fetchImages();
    } else {
      const err = await res.json();
      alert(err.error || "上傳失敗");
    }
    setUploading(null);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">系統設定</h1>

      {/* Logo */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">公司 Logo</h2>
        <p className="mb-4 text-sm text-gray-500">顯示於系統左上角及 PDF 報價單。建議尺寸：寬 200px 以上，PNG 或 SVG 格式。</p>
        <div className="flex items-center gap-6">
          <div className="flex h-20 w-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-sm text-gray-400">尚未上傳</span>
            )}
          </div>
          <div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload("logo", f); }}
            />
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading === "logo"}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {uploading === "logo" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {logoUrl ? "替換 Logo" : "上傳 Logo"}
            </button>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">報價單 Banner</h2>
        <p className="mb-4 text-sm text-gray-500">顯示於每張 PDF 報價單最上方。建議尺寸：寬 800px 以上，PNG 格式。</p>
        <div className="space-y-4">
          <div className="flex h-24 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-2">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Banner" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-sm text-gray-400">尚未上傳</span>
            )}
          </div>
          <div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload("banner", f); }}
            />
            <button
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploading === "banner"}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {uploading === "banner" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {bannerUrl ? "替換 Banner" : "上傳 Banner"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
