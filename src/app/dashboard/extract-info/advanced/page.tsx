"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Layers, X, FileText, RefreshCw, Download, Save, Undo2 } from "lucide-react";
import ExtractAdvancedPanel from "@/components/ExtractAdvancedPanel";

interface ExtractField {
  name: string;
  type: string;
}

interface DocView {
  id: string;
  title: string;
  columns: string[];
  rows: Record<string, string>[];
  fieldDefinitions: ExtractField[];
  pageCount: number;
  exportFormat: string;
  updatedAt: string;
  revertCount: number;
}

export default function AdvancedWorkspacesPage() {
  const [viewing, setViewing] = useState<DocView | null>(null);
  const [loadingView, setLoadingView] = useState(false);
  const [draftRows, setDraftRows] = useState<Record<string, string>[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const printableTitle = (id: string, fallback: string) =>
    (fallback || "extracted").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "extracted";

  const openDoc = async (id: string) => {
    setLoadingView(true);
    try {
      const res = await fetch(`/api/extract-info/${id}`);
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Could not open this document.");
        return;
      }
      const d = json.document;
      setViewing({
        id,
        title: d.title || "Document",
        columns: d.columns || [],
        rows: d.rows || [],
        fieldDefinitions: d.fieldDefinitions || [],
        pageCount: d.pageCount || 0,
        exportFormat: d.exportFormat || "xlsx",
        updatedAt: d.updatedAt,
        revertCount: d.revertCount || 0,
      });
      setDraftRows((d.rows || []).map((r: Record<string, string>) => ({ ...r })));
      setSavedMsg(null);
    } catch (e: any) {
      alert(e.message || "Could not open this document.");
    } finally {
      setLoadingView(false);
    }
  };

  const updateCell = (rowIdx: number, field: string, value: string) => {
    setDraftRows((prev) => {
      if (!prev) return prev;
      const next = prev.map((r, i) => (i === rowIdx ? { ...r, [field]: value } : r));
      return next;
    });
    setSavedMsg(null);
  };

  const saveRows = async () => {
    if (!viewing || !draftRows) return;
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch(`/api/extract-info/${viewing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: draftRows }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Could not save changes.");
        return;
      }
      const d = json.document;
      setViewing((prev) => (prev ? { ...prev, rows: d.rows || [], revertCount: d.revertCount || 0, updatedAt: d.updatedAt } : prev));
      setDraftRows((d.rows || []).map((r: Record<string, string>) => ({ ...r })));
      setSavedMsg("Changes saved.");
    } catch (e: any) {
      alert(e.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const revertLast = async () => {
    if (!viewing) return;
    if (!window.confirm("Revert will remove the data from the last batch of records added (or undo your last edit). Continue?")) return;
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch(`/api/extract-info/${viewing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revert: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Could not revert.");
        return;
      }
      const d = json.document;
      setViewing((prev) => (prev ? { ...prev, rows: d.rows || [], revertCount: d.revertCount || 0, updatedAt: d.updatedAt } : prev));
      setDraftRows((d.rows || []).map((r: Record<string, string>) => ({ ...r })));
      setSavedMsg("Reverted. The last batch of changes has been removed.");
    } catch (e: any) {
      alert(e.message || "Could not revert.");
    } finally {
      setSaving(false);
    }
  };

  const downloadDoc = async (id: string, format: string) => {
    try {
      if (format === "pdf") {
        const res = await fetch(`/api/extract-info/${id}/export?format=pdf`);
        const json = await res.json();
        if (json?.pdf && json?.document) printPdf(json.document);
        return;
      }
      const res = await fetch(`/api/extract-info/${id}/export?format=${format}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "Failed to generate export.");
        return;
      }
      const blob = await res.blob();
      const title = viewing?.id === id ? viewing.title : "document";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${printableTitle(id, title)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || "Failed to download.");
    }
  };

  const escapeHtml = (s: string) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

  const printPdf = (doc: any) => {
    const columns: string[] = doc.columns || [];
    const rows: Array<Record<string, string>> = doc.rows || [];
    const heading = `<th>#</th>` + columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
    const body = rows
      .map(
        (r, i) =>
          `<tr><td style="font-weight:bold;">${i + 1}</td>` +
          columns.map((c) => `<td>${escapeHtml(r[c] || "")}</td>`).join("") +
          `</tr>`
      )
      .join("");
    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(doc.title)}</title><style>
      @page{size:A4 landscape;margin:12mm;}
      body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.4;}
      .brand{font-size:20px;font-weight:800;color:#4f46e5;}
      h1{font-size:18px;color:#0f172a;}
      .meta{font-size:11px;color:#64748b;margin-bottom:12px;}
      table{width:100%;border-collapse:collapse;font-size:11px;}
      th{background:#f1f5f9;color:#475569;text-align:left;padding:8px 10px;border-bottom:1px solid #cbd5e1;}
      td{padding:7px 10px;border-bottom:1px solid #f1f5f9;color:#334155;}
      tr:nth-child(even) td{background:#f8fafc;}
      </style></head><body>
      <div style="display:flex;justify-content:space-between;border-bottom:2px solid #4f46e5;padding-bottom:10px;margin-bottom:12px;">
        <div><div class="brand">Judmi Academy</div></div>
        <div style="text-align:right;font-size:11px;">Generated: ${dateStr}</div>
      </div>
      <h1>${escapeHtml(doc.title)}</h1>
      <div class="meta">${rows.length} record(s) • ${columns.length} fields</div>
      <table><thead><tr>${heading}</tr></thead><tbody>${body}</tbody></table>
      <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) {
      alert("Please allow popups to generate your PDF.");
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <Link
          href="/dashboard/extract-info"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Extract Info
        </Link>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          <span>Judmi Academy • Advanced Workspaces</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Advanced Workspaces
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Create workspaces that split extracted records into several documents by a routing field (e.g. banking,
          agriculture, fishery), update them, download each one, and share a workspace with other teachers.
        </p>
      </div>

      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-5">
        <ExtractAdvancedPanel
          open
          onOpenDoc={openDoc}
          onEditDoc={openDoc}
          onDownloadDoc={downloadDoc}
        />
      </div>

      {loadingView && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[80]">
          <div className="bg-white rounded-3xl px-8 py-6 text-sm font-bold text-slate-700 inline-flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            Opening document...
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[70] animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 truncate flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  {viewing.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {viewing.pageCount} page{viewing.pageCount === 1 ? "" : "s"} • {viewing.rows.length} record{viewing.rows.length === 1 ? "" : "s"} • {viewing.exportFormat.toUpperCase()} • Updated {new Date(viewing.updatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {savedMsg && <span className="text-[11px] font-semibold text-emerald-600">{savedMsg}</span>}
                <button
                  type="button"
                  onClick={revertLast}
                  disabled={saving || (viewing.revertCount ?? 0) === 0}
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:border-rose-300 hover:text-rose-600 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-500 text-slate-600 text-xs font-bold inline-flex items-center gap-1.5"
                  title="Revert last changes"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Revert last changes
                </button>
                <button
                  type="button"
                  onClick={saveRows}
                  disabled={saving}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => downloadDoc(viewing.id, viewing.exportFormat || "xlsx")}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  onClick={() => setViewing(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    {viewing.fieldDefinitions.map((f) => (
                      <th key={f.name} className="px-3 py-2">{f.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(draftRows ?? viewing.rows).map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-bold text-slate-500">{idx + 1}</td>
                      {viewing.fieldDefinitions.map((f) => (
                        <td key={f.name} className="px-2 py-1.5">
                          <input
                            type="text"
                            value={row[f.name] || ""}
                            onChange={(e) => updateCell(idx, f.name, e.target.value)}
                            placeholder="—"
                            className="w-full min-w-24 px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 bg-transparent focus:bg-white text-slate-700 text-xs outline-none transition-colors"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {(draftRows ?? viewing.rows).length === 0 && (
                    <tr>
                      <td colSpan={viewing.fieldDefinitions.length + 1} className="px-3 py-6 text-center text-slate-400">
                        No records in this file yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}