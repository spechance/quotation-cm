"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Copy, Eye } from "lucide-react";

interface User { id: string; name: string; }
interface Template {
  id: string;
  name: string;
  code: string;
  description: string;
  active: boolean;
  defaultTerms: string[];
  defaultSections: unknown;
  sortOrder: number;
  visibility: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [copyFrom, setCopyFrom] = useState("");
  const [visibility, setVisibility] = useState("ALL");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  async function fetchTemplates() {
    const [tmplRes, usersRes] = await Promise.all([
      fetch("/api/templates"),
      fetch("/api/users"),
    ]);
    setTemplates(await tmplRes.json());
    if (usersRes.ok) {
      const allUsers = await usersRes.json();
      setUsers(allUsers.filter((u: { role: string }) => u.role === "SALES"));
    }
    setLoading(false);
  }

  useEffect(() => { fetchTemplates(); }, []);

  function openCreateForm(sourceTemplate?: Template) {
    setEditing(null);
    setCopyFrom("");
    setVisibility("ALL");
    setSelectedUsers([]);
    if (sourceTemplate) {
      setCopyFrom(sourceTemplate.id);
    }
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    let defaultTerms = (form.get("defaultTerms") as string).split("\n").filter((t) => t.trim());
    let defaultSections = null;

    // If copying from existing template, use its sections
    if (copyFrom && !editing) {
      const source = templates.find((t) => t.id === copyFrom);
      if (source) {
        if (defaultTerms.length === 0) defaultTerms = source.defaultTerms;
        defaultSections = source.defaultSections;
      }
    }

    const body = {
      name: form.get("name"),
      code: form.get("code"),
      description: form.get("description"),
      defaultTerms,
      defaultSections,
      visibility,
      visibleUserIds: visibility === "SPECIFIC" ? selectedUsers : [],
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
        <button onClick={() => openCreateForm()} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
          <Plus className="h-4 w-4" />新增版型
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">{editing ? "編輯版型" : "新增版型"}</h2>

            {/* Copy from existing */}
            {!editing && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">從既有版型複製</label>
                <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none">
                  <option value="">不複製（從空白建立）</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">版型名稱</label>
                <input name="name" required defaultValue={editing?.name} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">版型代碼</label>
                <input name="code" required defaultValue={editing?.code} placeholder="例: WOM, FB, IG" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">說明</label>
                <input name="description" defaultValue={editing?.description} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">預設服務條款（每行一條）</label>
                <textarea name="defaultTerms" rows={6} defaultValue={editing?.defaultTerms.join("\n") || (copyFrom ? templates.find((t) => t.id === copyFrom)?.defaultTerms.join("\n") : "")} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" />
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700">可見範圍</label>
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none">
                  <option value="ALL">全員可見</option>
                  <option value="SPECIFIC">指定業務</option>
                </select>
              </div>

              {visibility === "SPECIFIC" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">選擇業務</label>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-1">
                    {users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={(e) => {
                          if (e.target.checked) setSelectedUsers([...selectedUsers, u.id]);
                          else setSelectedUsers(selectedUsers.filter((id) => id !== u.id));
                        }} className="rounded border-gray-300" />
                        <span className="text-sm text-gray-700">{u.name}</span>
                      </label>
                    ))}
                    {users.length === 0 && <p className="text-xs text-gray-500 p-2">尚無業務人員</p>}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">取消</button>
                <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">{editing ? "更新" : "建立"}</button>
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
            <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">代碼: {t.code}</p>
                  {t.description && <p className="mt-1 text-sm text-gray-600">{t.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openCreateForm(t)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="複製此版型"><Copy className="h-4 w-4" /></button>
                  <button onClick={() => { setEditing(t); setVisibility(t.visibility || "ALL"); setShowForm(true); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="編輯"><Pencil className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                <span>{t.defaultTerms.length} 條預設條款</span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {t.visibility === "SPECIFIC" ? "指定業務" : "全員可見"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
