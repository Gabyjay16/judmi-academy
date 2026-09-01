"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Camera,
  Plus,
  Trash2,
  FileText,
  Download,
  Search,
  ScanLine,
  Layers,
  X,
  Check,
  Sparkles,
  RefreshCw,
  Pencil,
  Eye,
  UploadCloud,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import CameraStudio from "@/components/CameraStudio";

interface ExtractField {
  name: string;
  type: string;
}

interface DocSummary {
  id: string;
  title: string;
  status: string;
  error: string | null;
  exportFormat: string;
  pageCount: number;
  fieldDefinitions: ExtractField[];
  rowCount: number;
  createdAt: string;
  updatedAt: string;
}

const CAMERA_SUPPORTED =
  typeof window !== "undefined" &&
  ("mediaDevices" in navigator || "HTMLInputElement" in window);

export default function ExtractInfoWorkbench() {
  // Doc list
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Selected doc for editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRows, setEditRows] = useState<Record<string, string>[]>([]);
  const [editFields, setEditFields] = useState<ExtractField[]>([]);
  const [editTitle, setEditTitle] = useState("");
  const [editExportFormat, setEditExportFormat] = useState("xlsx");

  // Capture state
  const [capturedPages, setCapturedPages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [fields, setFields] = useState<ExtractField[]>([{ name: "matricule", type: "text" }, { name: "name", type: "text" }]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // View (open on site) state
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<any | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Update / tag file state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingTitle, setUpdatingTitle] = useState("");
  const [updateFields, setUpdateFields] = useState<ExtractField[]>([]);
  const [updatePages, setUpdatePages] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Camera studio state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"create" | "update">("create");

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const updateGalleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      setLoadingDocs(true);
      const res = await fetch(`/api/extract-info?q=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json?.documents) setDocs(json.documents);
    } catch (e) {
      console.error("Failed to load docs", e);
    } finally {
      setLoadingDocs(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await addPagesFromFiles(Array.from(files), "create");
    e.target.value = "";
  };

  const addPagesFromFiles = async (files: File[], target: "create" | "update") => {
    const b64: string[] = [];
    for (const f of files) {
      b64.push(await fileToBase64(f));
    }
    if (target === "update") {
      setUpdatePages((prev) => [...prev, ...b64]);
    } else {
      setCapturedPages((prev) => [...prev, ...b64]);
    }
  };

  const handleCameraStudioCapture = async (files: File[]) => {
    await addPagesFromFiles(files, cameraTarget);
  };

  const openCameraFor = (target: "create" | "update") => {
    setCameraTarget(target);
    setShowCamera(true);
  };

  const removePage = (idx: number) => {
    setCapturedPages((prev) => prev.filter((_, i) => i !== idx));
  };

  const addField = () => {
    const name = newFieldName.trim();
    if (!name) return;
    setFields((prev) => [...prev, { name, type: newFieldType }]);
    setNewFieldName("");
  };

  const removeField = (idx: number) => {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleExtract = async () => {
    if (capturedPages.length === 0) {
      setExtractError("Please snap or upload at least one document page first.");
      return;
    }
    if (fields.length === 0) {
      setExtractError("Please define at least one data field to extract.");
      return;
    }
    setIsExtracting(true);
    setExtractError(null);
    try {
      const res = await fetch("/api/extract-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Extracted Document",
          fields,
          images: capturedPages,
          exportFormat,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setExtractError(json.error || "Extraction failed.");
      } else if (json.status === "error") {
        setExtractError(json.error || "AI could not read the document. Please retake clearer photos.");
      } else {
        setCapturedPages([]);
        setTitle("");
        setExtractError(null);
        fetchDocs();
        if (json.id) {
          openEditor(json.id);
        }
      }
    } catch (err: any) {
      setExtractError(err.message || "Extraction failed.");
    } finally {
      setIsExtracting(false);
    }
  };

  const openEditor = async (id: string) => {
    try {
      const res = await fetch(`/api/extract-info/${id}`);
      const json = await res.json();
      if (json?.document) {
        setEditingId(id);
        setEditRows(json.document.rows || []);
        setEditFields(json.document.fieldDefinitions || []);
        setEditTitle(json.document.title || "");
        setEditExportFormat(json.document.exportFormat || "xlsx");
      }
    } catch (e) {
      console.error("Failed to open doc", e);
    }
  };

  // PDF export uses browser print-to-PDF (consistent with rest of app)
  const downloadDoc = async (id: string, format: string) => {
    try {
      if (format === "pdf") {
        const res = await fetch(`/api/extract-info/${id}/export?format=pdf`);
        const json = await res.json();
        if (json?.pdf && json?.document) {
          printPdf(json.document);
        }
        return;
      }
      const res = await fetch(`/api/extract-info/${id}/export?format=${format}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "Failed to generate export.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${jsonSafeTitle(id)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || "Failed to download.");
    }
  };

  const jsonSafeTitle = (id: string) => {
    const d = docs.find((x) => x.id === id);
    const t = d?.title || "extracted";
    return t.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "extracted";
  };

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
      .brand-sub{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;}
      h1{font-size:18px;color:#0f172a;}
      .meta{font-size:11px;color:#64748b;margin-bottom:12px;}
      table{width:100%;border-collapse:collapse;font-size:11px;}
      th{background:#f1f5f9;color:#475569;text-align:left;padding:8px 10px;border-bottom:1px solid #cbd5e1;}
      td{padding:7px 10px;border-bottom:1px solid #f1f5f9;color:#334155;}
      tr:nth-child(even) td{background:#f8fafc;}
      .footer{margin-top:20px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;}
      </style></head><body>
      <div style="display:flex;justify-content:space-between;border-bottom:2px solid #4f46e5;padding-bottom:10px;margin-bottom:12px;">
        <div><div class="brand">Judmi Academy</div><div class="brand-sub">AI Document Field Extraction</div></div>
        <div style="text-align:right;font-size:11px;">Generated: ${dateStr}</div>
      </div>
      <h1>${escapeHtml(doc.title)}</h1>
      <div class="meta">${rows.length} record(s) • ${columns.length} fields</div>
      <table><thead><tr>${heading}</tr></thead><tbody>${body}</tbody></table>
      <div class="footer">Extracted with Judmi Academy • Generated ${dateStr}</div>
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

  const escapeHtml = (s: string) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

  const saveEdits = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/extract-info/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, rows: editRows, fields: editFields, exportFormat: editExportFormat }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchDocs();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "Failed to save.");
      }
    } catch (e: any) {
      alert(e.message || "Failed to save.");
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this extracted document permanently?")) return;
    try {
      await fetch(`/api/extract-info/${id}`, { method: "DELETE" });
      if (editingId === id) setEditingId(null);
      if (viewingId === id) { setViewingId(null); setViewDoc(null); }
      if (updatingId === id) setUpdatingId(null);
      fetchDocs();
    } catch (e) {
      console.error(e);
    }
  };

  // Open a document on the site (read-only viewer)
  const openView = async (id: string) => {
    try {
      const res = await fetch(`/api/extract-info/${id}`);
      const json = await res.json();
      if (json?.document) {
        setViewDoc(json.document);
        setViewingId(id);
      }
    } catch (e) {
      console.error("Failed to open doc", e);
    }
  };

  // Tag a file so new extractions are added to it
  const openUpdate = (d: DocSummary) => {
    setUpdatingId(d.id);
    setUpdatingTitle(d.title);
    setUpdateFields(d.fieldDefinitions || []);
    setUpdatePages([]);
    setUpdateError(null);
  };

  const removeUpdatePage = (idx: number) => {
    setUpdatePages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await addPagesFromFiles(Array.from(files), "update");
    e.target.value = "";
  };

  const handleAppend = async () => {
    if (!updatingId) return;
    if (updatePages.length === 0) {
      setUpdateError("Please snap or upload at least one document page first.");
      return;
    }
    setIsUpdating(true);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/extract-info/${updatingId}/append`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: updatePages,
          fields: updateFields,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setUpdateError(json.error || "Update failed.");
      } else if (json.success === false) {
        setUpdateError(json.error || "AI could not read the new pages. Please retake clearer photos.");
      } else {
        setUpdatingId(null);
        setUpdatePages([]);
        setUpdateFields([]);
        fetchDocs();
      }
    } catch (err: any) {
      setUpdateError(err.message || "Update failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  const updateFieldValue = (rowIdx: number, colName: string, value: string) => {
    setEditRows((prev) =>
      prev.map((r, i) => (i === rowIdx ? { ...r, [colName]: value } : r))
    );
  };

  const addEmptyRow = () => {
    setEditRows((prev) => {
      const row: Record<string, string> = {};
      for (const f of editFields) row[f.name] = "";
      return [...prev, row];
    });
  };

  const removeRow = (idx: number) => {
    setEditRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const filteredDocs = docs.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
            <ScanLine className="w-3.5 h-3.5 text-indigo-600" />
            <span>Judmi Academy • AI Document Field Extraction</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Extract Info
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Snap a document with your camera, define the fields you need (e.g. matricule, name), and let AI extract the data into a downloadable PDF, Word, or Excel file.
          </p>
        </div>
      </div>

      {/* ====== Capture + Extract Card ====== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
          <Camera className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">1. Snap Document & Define Fields</h2>
        </div>

        {/* Field definitions */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-800">
            Data Fields to Extract:
          </label>
          <div className="flex flex-wrap gap-2.5">
            {fields.map((f, idx) => (
              <div key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-800">
                <span>{f.name}</span>
                <span className="text-[10px] text-indigo-400 normal-case">({f.type})</span>
                <button type="button" onClick={() => removeField(idx)} className="text-rose-500 hover:text-rose-700 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="e.g. matricule"
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40"
            />
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="matricule">Matricule</option>
              <option value="email">Email</option>
              <option value="date">Date</option>
            </select>
            <button
              type="button"
              onClick={addField}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Field
            </button>
          </div>
        </div>

        {/* Title + format */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">Document Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Student Matricule List"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">Export Format</label>
            <div className="grid grid-cols-4 gap-2">
              {["pdf", "docx", "xlsx", "csv"].map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setExportFormat(fmt)}
                  className={`px-2 py-2 rounded-xl border-2 text-[11px] font-bold uppercase transition-all ${
                    exportFormat === fmt
                      ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {fmt === "pdf" ? "PDF" : fmt === "docx" ? "Word" : fmt === "xlsx" ? "Excel" : "CSV"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Camera capture */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-800">
            Document Pages ({capturedPages.length} snapped):
          </label>

          <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleCameraCapture} className="hidden" />

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {capturedPages.map((page, idx) => (
              <div key={idx} className="relative rounded-2xl overflow-hidden border-2 border-indigo-200 bg-white shadow-xs group aspect-[3/4]">
                <img src={page} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-slate-900/80 text-white px-1.5 py-0.5 rounded-md">
                  Page {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removePage(idx)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700"
                  title="Remove page"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => openCameraFor("create")}
              className="rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50/60 hover:bg-indigo-100 aspect-[3/4] flex flex-col items-center justify-center gap-2 text-center p-2"
            >
              <Camera className="w-6 h-6 text-indigo-600" />
              <span className="text-[11px] font-extrabold text-indigo-900">Snap Page</span>
              <span className="text-[9px] text-indigo-600">single / multiple / twin</span>
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-white aspect-[3/4] flex flex-col items-center justify-center gap-2 text-center p-2"
            >
              <Layers className="w-6 h-6 text-slate-500" />
              <span className="text-[11px] font-extrabold text-slate-700">Batch Upload</span>
              <span className="text-[9px] text-slate-500">gallery / multi-photo</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            A document can be 2–3 pages. "Snap Page" opens the camera to take single, multiple or twin (2-angle)
            photos — snap each page in turn. "Batch Upload" selects many photos at once from your gallery; all
            snapped/selected pages are processed together as one document.
          </p>
        </div>

        {extractError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{extractError}</span>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isExtracting || capturedPages.length === 0}
            onClick={handleExtract}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            {isExtracting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI Reading Document & Extracting Fields...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>✨ Extract Info with AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ====== Saved Documents List ====== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Extracted Documents ({filteredDocs.length})</span>
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents by title..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {loadingDocs ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading documents...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No extracted documents yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Snap a document above and extract the fields you need. Your documents will appear here for later download and editing.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocs.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 hover:bg-slate-50/60 transition-colors">
                {/* File name (click to open/view on the site) */}
                <button
                  type="button"
                  onClick={() => openView(d.id)}
                  className="flex items-center gap-3 min-w-0 text-left flex-1"
                  title="Open & view this file"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate flex items-center gap-2">
                      <span className="truncate">{d.title}</span>
                      {d.status === "error" && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 shrink-0">Error</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {d.pageCount} page{d.pageCount === 1 ? "" : "s"} • {d.rowCount} record{d.rowCount === 1 ? "" : "s"} • {d.exportFormat.toUpperCase()} • {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                    {d.error && <div className="text-[11px] text-rose-500 mt-0.5">{d.error}</div>}
                  </div>
                </button>

                {/* Update / Edit / Delete */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openUpdate(d)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-bold hover:bg-sky-100 transition-colors"
                    title="Add new extracted pages to this same file"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Update
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditor(d.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold hover:bg-indigo-100 transition-colors"
                    title="Edit records & fields"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteDoc(d.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ====== Editor Modal ====== */}
      {editingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Edit Extracted Document</h3>
                <p className="text-xs text-slate-500">Update the extracted records, then re-download in your preferred format.</p>
              </div>
              <button onClick={() => setEditingId(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Export Format</label>
                <select
                  value={editExportFormat}
                  onChange={(e) => setEditExportFormat(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="docx">Word (.docx)</option>
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
            </div>

            {/* Editable table */}
            <div className="border border-slate-200 rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    {editFields.map((f) => (
                      <th key={f.name} className="px-3 py-2">{f.name}</th>
                    ))}
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {editRows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      <td className="px-3 py-2 font-bold text-slate-500">{rowIdx + 1}</td>
                      {editFields.map((f) => (
                        <td key={f.name} className="px-3 py-2">
                          <input
                            type="text"
                            value={row[f.name] || ""}
                            onChange={(e) => updateFieldValue(rowIdx, f.name, e.target.value)}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <button onClick={() => removeRow(rowIdx)} className="text-rose-500 hover:text-rose-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={addEmptyRow}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-indigo-300 text-slate-700 text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Row
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadDoc(editingId, editExportFormat)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download ({editExportFormat.toUpperCase()})
                </button>
                <button
                  type="button"
                  onClick={saveEdits}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== View (Open on site) Modal ====== */}
      {viewingId && viewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 truncate flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  {viewDoc.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {viewDoc.pageCount} page{viewDoc.pageCount === 1 ? "" : "s"} • {viewDoc.rows?.length || 0} record{(viewDoc.rows?.length || 0) === 1 ? "" : "s"} • {viewDoc.exportFormat.toUpperCase()} • Updated {new Date(viewDoc.updatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { const id = viewDoc.id; setViewingId(null); setViewDoc(null); openEditor(id); }}
                  className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-100 inline-flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => downloadDoc(viewDoc.id, viewDoc.exportFormat || "xlsx")}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  onClick={() => { setViewingId(null); setViewDoc(null); }}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {viewDoc.sourceImages && viewDoc.sourceImages.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Source Pages
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {viewDoc.sourceImages.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLightbox(img)}
                      className="relative rounded-xl overflow-hidden border border-slate-200 bg-white aspect-[3/4] group"
                    >
                      <img src={img} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                      </span>
                      <span className="absolute top-1 left-1 text-[9px] font-bold bg-slate-900/80 text-white px-1.5 py-0.5 rounded">
                        Page {idx + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-slate-200 rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    {(viewDoc.fieldDefinitions || []).map((f: ExtractField) => (
                      <th key={f.name} className="px-3 py-2">{f.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(viewDoc.rows || []).map((row: Record<string, string>, idx: number) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-bold text-slate-500">{idx + 1}</td>
                      {(viewDoc.fieldDefinitions || []).map((f: ExtractField) => (
                        <td key={f.name} className="px-3 py-2 text-slate-700">{row[f.name] || "—"}</td>
                      ))}
                    </tr>
                  ))}
                  {(viewDoc.rows || []).length === 0 && (
                    <tr>
                      <td colSpan={(viewDoc.fieldDefinitions || []).length + 1} className="px-3 py-6 text-center text-slate-400">
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

      {/* ====== Lightbox ====== */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Document page" className="max-w-full max-h-full rounded-2xl shadow-2xl" />
        </div>
      )}

      {/* ====== Update / Tag File Modal ====== */}
      {updatingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 truncate flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-sky-600 shrink-0" />
                  Update File
                </h3>
                <p className="text-xs text-slate-500 truncate">Adding pages to: <strong className="text-slate-700">{updatingTitle}</strong></p>
              </div>
              <button
                onClick={() => { setUpdatingId(null); setUpdatePages([]); setUpdateError(null); }}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-[11px] text-sky-900 leading-relaxed flex items-start gap-2">
              <Check className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <span>
                This file is now <strong>tagged for updates</strong> — anything you snap or upload below is extracted
                and <strong>added to this same file</strong> (new records + new pages), keeping everything in one place.
              </span>
            </div>

            {/* Fields already on the file (kept so new rows match) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Data Fields (kept from this file)</label>
              <div className="flex flex-wrap gap-2">
                {updateFields.map((f, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-800">
                    {f.name} <span className="text-[10px] text-indigo-400 normal-case">({f.type})</span>
                  </span>
                ))}
                {updateFields.length === 0 && (
                  <span className="text-xs text-slate-400">No fields — edit the file to add fields first.</span>
                )}
              </div>
            </div>

            {/* New pages to add */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Pages to Add ({updatePages.length}):
              </label>
              <input
                ref={updateGalleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleUpdateGallery}
                className="hidden"
              />
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {updatePages.map((page, idx) => (
                  <div key={idx} className="relative rounded-2xl overflow-hidden border-2 border-sky-200 bg-white shadow-xs aspect-[3/4] group">
                    <img src={page} alt={`Add page ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeUpdatePage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700"
                      title="Remove page"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => openCameraFor("update")}
                  className="rounded-2xl border-2 border-dashed border-sky-400 bg-sky-50/60 hover:bg-sky-100 aspect-[3/4] flex flex-col items-center justify-center gap-2 text-center p-2"
                >
                  <Camera className="w-6 h-6 text-sky-600" />
                  <span className="text-[11px] font-extrabold text-sky-900">Snap Page</span>
                  <span className="text-[9px] text-sky-600">single / multiple / twin</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateGalleryInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-white aspect-[3/4] flex flex-col items-center justify-center gap-2 text-center p-2"
                >
                  <Layers className="w-6 h-6 text-slate-500" />
                  <span className="text-[11px] font-extrabold text-slate-700">Batch Add</span>
                </button>
              </div>
            </div>

            {updateError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {updateError}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isUpdating || updatePages.length === 0}
                onClick={handleAppend}
                className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    AI Reading & Adding to File...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Extract & Add to File
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== Camera Studio ====== */}
      <CameraStudio
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraStudioCapture}
        allowMultiple
        allowTwin
      />
    </div>
  );
}
