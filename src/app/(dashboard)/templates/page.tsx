"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Copy, Eye, Trash2 } from "lucide-react";

interface User { id: string; name: string; }
interface GeneralTermsSet { id: string; name: string; terms: string[]; }
interface Template {
  id: string; name: string; code: string; description: string;
  active: boolean; defaultTerms: string[]; defaultSections: unknown;
  sortOrder: number; visibility: string;
  stampTextA: string; stampTextB: string;
  generalTermsSetId: string | null;
  generalTermsSet: GeneralTermsSet | null;
}

export default function TemplatesPage() {
  const [tab, setTab] = useState<"templates" | "terms">("templates");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [termsSets, setTermsSets] = useState<GeneralTermsSet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Template form state
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [copyFrom, setCopyFrom] = useState("");
  const [visibility, setVisibility] = useState("ALL");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [stampA, setStampA] = useState("發票章用印");
  const [stampB, setStampB] = useState("發票章用印");
  const [selectedTermsSetId, setSelectedTermsSetId] = useState<string>("");

  // Terms form state
  const [showTermsForm, setShowTermsForm] = useState(false);
  const [editingTerms, setEditingTerms] = useState<GeneralTermsSet | null>(null);
  const [termsName, setTermsName] = useState("");
  const [termsContent, setTermsContent] = useState("");

  async function fetchAll() {
    const [tmplRes, termsRes, usersRes] = await Promise.all([
      fetch("/api/templates"), fetch("/api/general-terms"), fetch("/api/users"),
    ]);
    setTemplates(await tmplRes.json());
    setTermsSets(await termsRes.json());
    if (usersRes.ok) {
      const allUsers = await usersRes.json();
      setUsers(allUsers.filter((u: { role: string }) => u.role === "SALES"));
    }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  // ── Template handlers ──
  function openTemplateForm(source?: Template, isEdit?: boolean) {
    if (isEdit && source) {
      setEditingTemplate(source);
      setCopyFrom("");
      setStampA(source.stampTextA || "發票章用印");
      setStampB(source.stampTextB || "發票章用印");
      setSelectedTermsSetId(source.generalTermsSetId || "");
      setVisibility(source.visibility || "ALL");
    } else {
      setEditingTemplate(null);
      setCopyFrom(source?.id || "");
      setStampA(source?.stampTextA || "發票章用印");
      setStampB(source?.stampTextB || "發票章用印");
      setSelectedTermsSetId(source?.generalTermsSetId || "");
      setVisibility("ALL");
    }
    setSelectedUsers([]);
    setShowTemplateForm(true);
  }

  async function handleTemplateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    let defaultTerms = (form.get("defaultTerms") as string).split("\n").filter((t) => t.trim());
    let defaultSections = null;

    if (copyFrom && !editingTemplate) {
      const source = templates.find((t) => t.id === copyFrom);
      if (source) {
        if (defaultTerms.length === 0) defaultTerms = source.defaultTerms;
        defaultSections = source.defaultSections;
      }
    }

    const body = {
      name: form.get("name"), code: form.get("code"), description: form.get("description"),
      defaultTerms, defaultSections,
      stampTextA: stampA, stampTextB: stampB,
      generalTermsSetId: selectedTermsSetId || null,
      visibility, visibleUserIds: visibility === "SPECIFIC" ? selectedUsers : [],
    };

    const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : "/api/templates";
    const method = editingTemplate ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (res.ok) { setShowTemplateForm(false); setEditingTemplate(null); fetchAll(); }
    else { const err = await res.json(); alert(err.error || "操作失敗"); }
  }

  // ── Terms handlers ──
  function openTermsForm(set?: GeneralTermsSet) {
    if (set) {
      setEditingTerms(set);
      setTermsName(set.name);
      setTermsContent(set.terms.join("\n"));
    } else {
      setEditingTerms(null);
      setTermsName("");
      setTermsContent("");
    }
    setShowTermsForm(true);
  }

  async function handleTermsSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = { name: termsName, terms: termsContent.split("\n").filter((t) => t.trim()) };
    const url = editingTerms ? `/api/general-terms/${editingTerms.id}` : "/api/general-terms";
    const method = editingTerms ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { setShowTermsForm(false); setEditingTerms(null); fetchAll(); }
    else { const err = await res.json(); alert(err.error || "操作失敗"); }
  }

  async function deleteTermsSet(set: GeneralTermsSet) {
    if (!confirm(`確定要刪除「${set.name}」？`)) return;
    const res = await fetch(`/api/general-terms/${set.id}`, { method: "DELETE" });
    if (res.ok) fetchAll();
    else { const err = await res.json(); alert(err.error || "刪除失敗"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">版型管理</h1>
        <button
          onClick={() => tab === "templates" ? openTemplateForm() : openTermsForm()}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          {tab === "templates" ? "新增版型" : "新增條款組"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button onClick={() => setTab("templates")} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${tab === "templates" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          報價單版型
        </button>
        <button onClick={() => setTab("terms")} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${tab === "terms" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          一般條款管理
        </button>
      </div>

      {/* ── Templates Tab ── */}
      {tab === "templates" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? <p className="text-sm text-gray-500">載入中...</p> : templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">代碼: {t.code}</p>
                  {t.description && <p className="mt-1 text-sm text-gray-600">{t.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openTemplateForm(t)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="複製"><Copy className="h-4 w-4" /></button>
                  <button onClick={() => openTemplateForm(t, true)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="編輯"><Pencil className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  <span>{t.defaultTerms.length} 條服務條款</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{t.visibility === "SPECIFIC" ? "指定業務" : "全員可見"}</span>
                </div>
                <div>簽核：{t.stampTextA} / {t.stampTextB}</div>
                <div>一般條款：{t.generalTermsSet?.name || <span className="text-red-400">未設定</span>}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Terms Tab ── */}
      {tab === "terms" && (
        <div className="space-y-4">
          {loading ? <p className="text-sm text-gray-500">載入中...</p> : termsSets.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">尚無條款組，請新增</div>
          ) : termsSets.map((set) => (
            <div key={set.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{set.name}</h3>
                <div className="flex items-center gap-1">
                  <button onClick={() => openTermsForm(set)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="編輯"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => deleteTermsSet(set)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500" title="刪除"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="space-y-1 text-xs text-gray-600 max-h-40 overflow-y-auto">
                {set.terms.map((t, i) => <p key={i} className="whitespace-pre-line">{t}</p>)}
              </div>
              <p className="mt-2 text-xs text-gray-400">共 {set.terms.length} 條</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Template Form Modal ── */}
      {showTemplateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">{editingTemplate ? "編輯版型" : "新增版型"}</h2>

            {!editingTemplate && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">從既有版型複製</label>
                <select value={copyFrom} onChange={(e) => { setCopyFrom(e.target.value); const src = templates.find((t) => t.id === e.target.value); if (src) { setStampA(src.stampTextA); setStampB(src.stampTextB); setSelectedTermsSetId(src.generalTermsSetId || ""); } }} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none">
                  <option value="">不複製（從空白建立）</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            <form onSubmit={handleTemplateSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700">版型名稱</label><input name="name" required defaultValue={editingTemplate?.name} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700">版型代碼</label><input name="code" required defaultValue={editingTemplate?.code} placeholder="例: WOM, FB, IG" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700">說明</label><input name="description" defaultValue={editingTemplate?.description} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>

              {/* Stamp text */}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">甲方用印文字</label><input value={stampA} onChange={(e) => setStampA(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700">乙方用印文字</label><input value={stampB} onChange={(e) => setStampB(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>
              </div>

              {/* General Terms Set selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700">一般條款</label>
                <select value={selectedTermsSetId} onChange={(e) => setSelectedTermsSetId(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none">
                  <option value="">未設定</option>
                  {termsSets.map((s) => <option key={s.id} value={s.id}>{s.name}（{s.terms.length} 條）</option>)}
                </select>
              </div>

              {/* Service-specific terms */}
              <div><label className="block text-sm font-medium text-gray-700">服務條款（每行一條）</label><textarea name="defaultTerms" rows={6} defaultValue={editingTemplate?.defaultTerms.join("\n") || (copyFrom ? templates.find((t) => t.id === copyFrom)?.defaultTerms.join("\n") : "")} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700">可見範圍</label>
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none">
                  <option value="ALL">全員可見</option>
                  <option value="SPECIFIC">指定業務</option>
                </select>
              </div>
              {visibility === "SPECIFIC" && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-1">
                  {users.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={(e) => { if (e.target.checked) setSelectedUsers([...selectedUsers, u.id]); else setSelectedUsers(selectedUsers.filter((id) => id !== u.id)); }} className="rounded border-gray-300" />
                      <span className="text-sm text-gray-700">{u.name}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowTemplateForm(false); setEditingTemplate(null); }} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">取消</button>
                <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">{editingTemplate ? "更新" : "建立"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Terms Form Modal ── */}
      {showTermsForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">{editingTerms ? "編輯條款組" : "新增條款組"}</h2>
            <form onSubmit={handleTermsSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700">條款組名稱</label><input value={termsName} onChange={(e) => setTermsName(e.target.value)} required placeholder="例: 標準條款、簡易條款" className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700">條款內容（每行一條）</label><textarea value={termsContent} onChange={(e) => setTermsContent(e.target.value)} rows={12} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none" /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowTermsForm(false); setEditingTerms(null); }} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">取消</button>
                <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">{editingTerms ? "更新" : "建立"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
