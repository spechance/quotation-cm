"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil } from "lucide-react";

interface Template {
  id: string;
  name: string;
  code: string;
  description: string;
  active: boolean;
  defaultTerms: string[];
  defaultSections: unknown;
  sortOrder: number;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);

  async function fetchTemplates() {
    const res = await fetch("/api/templates");
    setTemplates(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name"),
      code: form.get("code"),
      description: form.get("description"),
      defaultTerms: (form.get("defaultTerms") as string)
        .split("\n")
        .filter((t) => t.trim()),
    };

    const url = editing ? `/api/templates/${editing.id}` : "/api/templates";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowForm(false);
      setEditing(null);
      fetchTemplates();
    } else {
      const err = await res.json();
      alert(err.error || "操作失敗");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">版型管理</h1>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          新增版型
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">
              {editing ? "編輯版型" : "新增版型"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  版型名稱
                </label>
                <input
                  name="name"
                  required
                  defaultValue={editing?.name}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  版型代碼
                </label>
                <input
                  name="code"
                  required
                  defaultValue={editing?.code}
                  placeholder="例: WOM, FB, IG"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  說明
                </label>
                <input
                  name="description"
                  defaultValue={editing?.description}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  預設服務條款（每行一條）
                </label>
                <textarea
                  name="defaultTerms"
                  rows={8}
                  defaultValue={editing?.defaultTerms.join("\n")}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  {editing ? "更新" : "建立"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-sm text-gray-500">載入中...</p>
        ) : (
          templates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    代碼: {t.code}
                  </p>
                  {t.description && (
                    <p className="mt-1 text-sm text-gray-600">
                      {t.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setEditing(t);
                    setShowForm(true);
                  }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                {t.defaultTerms.length} 條預設條款
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
