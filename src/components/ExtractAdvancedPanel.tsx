"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Layers,
  Plus,
  X,
  RefreshCw,
  Sparkles,
  Check,
  Trash2,
  Camera,
  Download,
  Pencil,
  Share2,
  FileText,
  UploadCloud,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import CameraStudio from "@/components/CameraStudio";
import { isPdfFile, pdfFileToImages } from "@/lib/pdf-images";

interface ExtractField {
  name: string;
  type: string;
  instruction?: string;
}

interface SetDoc {
  id: string;
  title: string;
  rowCount: number;
  pageCount: number;
  fieldDefinitions: ExtractField[];
  exportFormat: string;
  routeValue?: string | null;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Recipient {
  username?: string | null;
  email?: string | null;
  name?: string | null;
  sharedAt?: string;
}

interface SetSummary {
  id: string;
  name: string;
  fieldDefinitions: ExtractField[];
  routingField: string;
  routeOptions: string[];
  isShared: boolean;
  ownerName?: string | null;
  ownerUsername?: string | null;
  sharedWith?: Recipient[];
  documentCount: number;
  recordCount: number;
  docs: SetDoc[];
  createdAt: string;
  updatedAt: string;
}

interface TemplateItem {
  id: string;
  name: string;
  fieldDefinitions: ExtractField[];
  routingField: string;
  routeOptions: string[];
  createdAt: string;
}

interface SetDetail {
  id: string;
  name: string;
  fieldDefinitions: ExtractField[];
  routingField: string;
  routeOptions: string[];
  isShared: boolean;
  owner?: { name?: string | null; email?: string | null; username?: string | null } | null;
  sharedWith: Recipient[];
  docs: SetDoc[];
  createdAt: string;
  updatedAt: string;
}

const FIELD_TYPES = ["text", "number", "matricule", "email", "date"];

// Parse "name (instruction)" bracket notation into { name, instruction }.
function parseFieldInput(input: string): { name: string; instruction: string } {
  const text = input.trim();
  const m = text.match(/^(.+?)\s*\(\s*(.*?)\s*\)\s*$/);
  if (m) return { name: m[1].trim(), instruction: m[2].trim() };
  return { name: text, instruction: "" };
}

function FieldEditor({
  fields,
  onChange,
  routingField,
  onRoutingFieldChange,
  accent = "emerald",
}: {
  fields: ExtractField[];
  onChange: (fields: ExtractField[]) => void;
  routingField: string;
  onRoutingFieldChange: (name: string) => void;
  accent?: "emerald" | "slate";
}) {
  const [nameInput, setNameInput] = useState("");
  const [typeInput, setTypeInput] = useState("text");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ring = accent === "emerald" ? "focus:ring-emerald-500" : "focus:ring-slate-500";
  const chipBorder = accent === "emerald" ? "border-emerald-300" : "border-slate-300";
  const chipText = accent === "emerald" ? "text-emerald-800" : "text-slate-700";
  const chipBg = accent === "emerald" ? "bg-white" : "bg-slate-50";
  const addBorder = accent === "emerald" ? "hover:border-emerald-300" : "hover:border-slate-400";
  const selectBg = accent === "emerald" ? "focus:ring-emerald-500" : "focus:ring-slate-500";

  const addField = () => {
    setError(null);
    const { name, instruction } = parseFieldInput(nameInput);
    if (!name) {
      setError("Enter a field name (e.g. score or score (full marks out of 20)).");
      return;
    }
    if (fields.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setError(`A field called "${name}" already exists.`);
      return;
    }
    onChange([...fields, { name, type: typeInput, instruction: instruction || undefined }]);
    setNameInput("");
  };

  const updateField = () => {
    if (editingIdx === null) return;
    setError(null);
    const { name, instruction } = parseFieldInput(nameInput);
    if (!name) return;
    if (fields.some((f, i) => i !== editingIdx && f.name.toLowerCase() === name.toLowerCase())) {
      setError(`A field called "${name}" already exists.`);
      return;
    }
    const next = fields.map((f, i) =>
      i === editingIdx ? { ...f, name, type: typeInput, instruction: instruction || undefined } : f
    );
    onChange(next);
    if (routingField && !next.some((f) => f.name === routingField)) onRoutingFieldChange("");
    setEditingIdx(null);
    setNameInput("");
  };

  const removeField = (idx: number) => {
    const next = fields.filter((_, i) => i !== idx);
    onChange(next);
    if (routingField && !next.some((f) => f.name === routingField)) onRoutingFieldChange("");
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setNameInput(fields[idx].instruction ? `${fields[idx].name} (${fields[idx].instruction})` : fields[idx].name);
    setTypeInput(fields[idx].type || "text");
    setError(null);
  };

  return (
    <div className="space-y-2">
      {fields.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fields.map((f, idx) => (
            <span
              key={`${f.name}-${idx}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${chipBorder} ${chipBg} text-xs font-bold ${chipText}`}
            >
              {f.name}
              <span className="text-[10px] normal-case opacity-60">({f.type})</span>
              {f.instruction && (
                <span className="text-[10px] font-semibold normal-case opacity-70">"{f.instruction}"</span>
              )}
              <button type="button" onClick={() => startEdit(idx)} className="text-slate-400 hover:text-indigo-600 ml-0.5" title="Edit field">
                <Pencil className="w-3 h-3" />
              </button>
              <button type="button" onClick={() => removeField(idx)} className="text-rose-400 hover:text-rose-600" title="Delete field">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {error && <div className="text-[11px] font-semibold text-rose-600">{error}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              editingIdx === null ? addField() : updateField();
            }
          }}
          placeholder={editingIdx === null ? 'e.g. score or score (out of 20)' : "Edit name / instruction"}
          className={`px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none ${ring} flex-1 min-w-40`}
        />
        <select
          value={typeInput}
          onChange={(e) => setTypeInput(e.target.value)}
          className={`px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none ${selectBg}`}
        >
          {FIELD_TYPES.map((t) => (
            <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => (editingIdx === null ? addField() : updateField())}
          className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
        >
          {editingIdx === null ? <Plus className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
          {editingIdx === null ? "Add Field" : "Save Field"}
        </button>
        {editingIdx !== null && (
          <button
            type="button"
            onClick={() => { setEditingIdx(null); setNameInput(""); setError(null); }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold"
          >
            Cancel
          </button>
        )}
      </div>

      {fields.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value=""
            onChange={(e) => {
              const idx = Number(e.target.value);
              if (Number.isInteger(idx) && idx >= 0) startEdit(idx);
            }}
            className={`px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none ${selectBg} max-w-full`}
          >
            <option value="">Select a field to edit...</option>
            {fields.map((f, idx) => (
              <option key={`${f.name}-${idx}`} value={idx}>
                {f.name}{f.instruction ? ` (${f.instruction})` : ""}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-slate-400">pick an existing field from the dropdown to edit it</span>
        </div>
      )}

      <p className="text-[11px] text-slate-500">
        Name a field, then add an instruction in brackets to guide the AI, e.g.{" "}
        <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">name (student's full name)</code> or{" "}
        <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">score (marks out of 20)</code>.
      </p>
    </div>
  );
}

const formInit = () => ({ name: "", fields: [{ name: "name", type: "text" }] as ExtractField[], routeValues: [] as string[], routingField: "", templateId: "" });

export default function ExtractAdvancedPanel({
  open,
  onOpenDoc,
  onEditDoc,
  onDownloadDoc,
}: {
  open: boolean;
  onOpenDoc: (id: string) => void;
  onEditDoc: (id: string) => void;
  onDownloadDoc: (id: string, format: string) => void;
}) {
  const [mine, setMine] = useState<SetSummary[]>([]);
  const [shared, setShared] = useState<SetSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<SetDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(formInit());
  const [newRouteValue, setNewRouteValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [addMode, setAddMode] = useState<"auto" | "pick">("auto");
  const [addTarget, setAddTarget] = useState("");
  const [photosPerRecord, setPhotosPerRecord] = useState(1);
  const [addPages, setAddPages] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addResult, setAddResult] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showPages, setShowPages] = useState(false);

  const [shareText, setShareText] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const [showAddDoc, setShowAddDoc] = useState(false);
  const [addDocValue, setAddDocValue] = useState("");
  const [addingDoc, setAddingDoc] = useState(false);

  const addGalleryRef = useRef<HTMLInputElement>(null);

  const refreshSets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/extract-info/advanced");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load workspaces.");
      setMine(json.sets || []);
      setShared(json.sharedSets || []);
    } catch (e: any) {
      setError(e.message || "Failed to load workspaces.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/extract-info/templates");
      const json = await res.json();
      if (res.ok) setTemplates(json.templates || []);
    } catch (e) {
      console.error("Failed to load templates", e);
    }
  }, []);

  useEffect(() => {
    if (open) {
      refreshSets();
      loadTemplates();
    }
  }, [open, refreshSets, loadTemplates]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  // Downscale and re-encode an image (data URL) to a compact JPEG so large
  // batches stay well under server/body size limits and don't time out.
  const compressImage = (src: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 1000;
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d", { alpha: false })!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size > 0) {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => resolve(src);
              reader.readAsDataURL(blob);
            } else {
              resolve(src);
            }
          },
          "image/jpeg",
          0.72
        );
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });

  const addPagesFromFiles = async (files: File[]) => {
    try {
      const b64: string[] = [];
      for (const f of files) {
        if (isPdfFile(f)) {
          const pdfImages = await pdfFileToImages(f, 10);
          for (const p of pdfImages) b64.push(await compressImage(p));
        } else {
          b64.push(await compressImage(await fileToBase64(f)));
        }
      }
      setAddPages((prev) => [...prev, ...b64]);
    } catch (e) {
      setAddError("Could not read that file.");
    }
  };

  const handleAddGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await addPagesFromFiles(Array.from(files));
    e.target.value = "";
  };

  const startCreate = () => {
    setForm(formInit());
    setCreateMsg(null);
    setShowCreate(true);
  };

  const pickTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setForm({
      templateId: t.id,
      name: t.name,
      fields: t.fieldDefinitions.map((f) => ({ ...f })),
      routingField: t.routingField,
      routeValues: t.routeOptions.filter(Boolean),
    });
  };

  const createWorkspace = async () => {
    setCreating(true);
    setCreateMsg(null);
    try {
      const routeOptions = form.routeValues.filter(Boolean);
      const res = await fetch("/api/extract-info/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          fields: form.fields,
          routingField: form.routingField,
          routeOptions,
          templateId: form.templateId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create workspace.");
      setShowCreate(false);
      await refreshSets();
      openDetail(json.id);
    } catch (e: any) {
      setCreateMsg(e.message || "Failed to create workspace.");
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/extract-info/advanced/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load workspace.");
      setDetail({
        ...json.set,
        docs: json.set.docs || [],
      });
      setForm({
        templateId: "",
        name: json.set.name || "",
        fields: (json.set.fieldDefinitions || []).map((f: ExtractField) => ({ ...f })),
        routingField: json.set.routingField || "",
        routeValues: (json.set.routeOptions || []).filter(Boolean),
      });
      setAddError(null);
      setAddResult(null);
      setAddPages([]);
      setShowPages(false);
      setAddMode("auto");
      setPhotosPerRecord(1);
      setAddTarget((json.set.docs || []).length > 0 ? json.set.docs[0].id : "");
      setShareMsg(null);
      setShareText("");
    } catch (e: any) {
      setError(e.message || "Failed to load workspace.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    refreshSets();
  };

  const deleteSet = async () => {
    if (!detail) return;
    if (!confirm(`Delete this workspace and all its documents? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/extract-info/advanced/${detail.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || "Failed to delete workspace.");
        return;
      }
      setDetail(null);
      refreshSets();
    } catch (e: any) {
      alert(e.message || "Failed to delete workspace.");
    }
  };

  const saveSettings = async () => {
    if (!detail) return;
    const routeOptions = form.routeValues.filter(Boolean);
    setCreating(true);
    setCreateMsg(null);
    try {
      const res = await fetch(`/api/extract-info/advanced/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, fields: form.fields, routingField: form.routingField, routeOptions }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save settings.");
      if (detail.id) await openDetail(detail.id);
      refreshSets();
    } catch (e: any) {
      setCreateMsg(e.message || "Failed to save settings.");
    } finally {
      setCreating(false);
    }
  };

  const addDocument = async () => {
    if (!detail) return;
    const v = addDocValue.trim().replace(/,$/, "").toLowerCase();
    if (!v) return;
    if (form.routeValues.includes(v)) {
      setCreateMsg("That route value already exists.");
      return;
    }
    setAddingDoc(true);
    setCreateMsg(null);
    try {
      const newValues = [...form.routeValues, v];
      const res = await fetch(`/api/extract-info/advanced/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeOptions: newValues }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add document.");
      setForm((prev) => ({ ...prev, routeValues: newValues }));
      setAddDocValue("");
      setShowAddDoc(false);
      await openDetail(detail.id);
    } catch (e: any) {
      setCreateMsg(e.message || "Failed to add document.");
    } finally {
      setAddingDoc(false);
    }
  };

  const deleteDocument = async (docId: string, routeValue: string) => {
    if (!detail) return;
    if (!confirm(`Delete the "${routeValue}" document and all its records? This cannot be undone.`)) return;
    setCreateMsg(null);
    try {
      const delRes = await fetch(`/api/extract-info/${docId}`, { method: "DELETE" });
      if (!delRes.ok) {
        const j = await delRes.json().catch(() => ({}));
        alert(j.error || "Failed to delete document.");
        return;
      }
      const newValues = form.routeValues.filter((r) => r !== routeValue);
      await fetch(`/api/extract-info/advanced/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeOptions: newValues }),
      });
      setForm((prev) => ({ ...prev, routeValues: newValues }));
      await openDetail(detail.id);
      refreshSets();
    } catch (e: any) {
      alert(e.message || "Failed to delete document.");
    }
  };

  const openAddRecords = (mode: "auto" | "pick", targetId?: string) => {
    setAddMode(mode);
    setAddTarget(targetId && detail && detail.docs.some((d) => d.id === targetId) ? targetId : (detail && detail.docs.length > 0 ? detail.docs[0].id : ""));
    setAddPages([]);
    setAddError(null);
    setAddResult(null);
  };

  const runRouteExtract = async () => {
    if (!detail) return;
    if (addPages.length === 0) {
      setAddError("Please snap or upload at least one document page first.");
      return;
    }
    setIsExtracting(true);
    setAddError(null);
    setAddResult(null);
    try {
      // Guard against server body-size limits: catch oversized batches up front
      // with a clear message instead of a cryptic JSON parse failure later.
      const bodyStr = JSON.stringify({ images: addPages, mode: addMode, targetId: addTarget || undefined, groupSize: photosPerRecord });
      if (bodyStr.length > 3200 * 1024) {
        setIsExtracting(false);
        const sizeMB = (bodyStr.length / (1024 * 1024)).toFixed(1);
        setAddError(
          `This batch is about ${sizeMB} MB, too large to send in one request. Please split it into smaller batches (fewer pages at a time) and extract each one.`
        );
        return;
      }
      let json: any;
      try {
        const res = await fetch(`/api/extract-info/advanced/${detail.id}/route`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: bodyStr,
        });
        json = await res.json();
        if (!res.ok) throw new Error(json.error || "Extraction failed.");
      } catch (e: any) {
        if (e && (e.name === "SyntaxError" || /unexpected token/i.test(e.message || ""))) {
          throw new Error("The batch was too large to send. Please upload fewer pages at a time (try splitting into smaller batches), or use clearer/compressed photos.");
        }
        throw e;
      }
      if (json.success === false) {
        setAddError(json.error || "AI could not read the document. Please retake clearer photos.");
        return;
      }
      const unclassified = json.unclassified || 0;
      const routed = (json.perDoc || []).filter((d: any) => String(d.routeValue) !== "uncategorised");
      setAddResult(
        `${json.addedRows || 0} record(s) saved` +
          (routed.length > 0 ? ` — ${routed.map((d: any) => `${d.routeLabel} (${d.added})`).join(", ")}` : "") +
          (unclassified > 0 ? `, ${unclassified} couldn't be routed and were filed as Uncategorised` : "") +
          "."
      );
      setAddPages([]);
      await openDetail(detail.id);
      refreshSets();
    } catch (e: any) {
      setAddError(e.message || "Extraction failed.");
    } finally {
      setIsExtracting(false);
    }
  };

  const doShare = async () => {
    if (!detail) return;
    const ids = shareText.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      setShareMsg("Enter at least one teacher username.");
      return;
    }
    setSharing(true);
    setShareMsg(null);
    try {
      const res = await fetch(`/api/extract-info/advanced/${detail.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: ids }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to share workspace.");
      const parts: string[] = [];
      if (json.added?.length) parts.push(`Shared with ${json.added.map((a: any) => a.name || a.username || a.email).join(", ")}.`);
      if (json.notFound?.length) parts.push(`Not found: ${json.notFound.join(", ")}.`);
      setShareMsg(parts.join(" ") || "Nothing new to share.");
      setShareText("");
      if (detail.id) await openDetail(detail.id);
    } catch (e: any) {
      setShareMsg(e.message || "Failed to share workspace.");
    } finally {
      setSharing(false);
    }
  };

  const unshare = async (rec: Recipient) => {
    if (!detail) return;
    try {
      await fetch(`/api/extract-info/advanced/${detail.id}/share`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: rec.username || rec.email || "" }),
      });
      if (detail.id) await openDetail(detail.id);
    } catch (e) {
      console.error(e);
    }
  };

  const saveTemplate = async () => {
    if (!detail) return;
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/extract-info/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: templateName, fields: detail.fieldDefinitions, routingField: detail.routingField, routeOptions: detail.routeOptions }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || "Failed to save template.");
        return;
      }
      setShowSaveTemplate(false);
      setTemplateName("");
      loadTemplates();
    } catch (e: any) {
      alert(e.message || "Failed to save template.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this field template?")) return;
    try {
      await fetch(`/api/extract-info/templates/${id}`, { method: "DELETE" });
      loadTemplates();
    } catch (e) {
      console.error(e);
    }
  };

  const renderWorkspaceCard = (s: SetSummary) => (
    <div key={s.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => openDetail(s.id)}
        className="w-full text-left p-4 hover:bg-slate-50/60 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 break-words">{s.name}</div>
              <div className="text-[11px] text-slate-400">
                {s.documentCount} document{s.documentCount === 1 ? "" : "s"} • {s.recordCount} record{s.recordCount === 1 ? "" : "s"}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            routing: {s.routingField || "—"}
          </span>
          {s.routeOptions.slice(0, 4).map((r) => (
            <span key={r} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {r}
            </span>
          ))}
          {s.routeOptions.length > 4 && (
            <span className="text-[10px] text-slate-400">+{s.routeOptions.length - 4}</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {s.docs.map((d) => (
            <span key={d.id} className="text-[10px] text-slate-500 inline-flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {d.title}
              <span className="text-slate-400">({d.rowCount})</span>
              {d.isArchived && <span className="text-rose-400 font-bold">archived</span>}
            </span>
          ))}
        </div>
        {s.isShared && (
          <div className="mt-2 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-2 py-1 inline-flex items-center gap-1">
            <Share2 className="w-3 h-3" />
            Shared by {s.ownerName || s.ownerUsername || "a teacher"}
          </div>
        )}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">{error}</div>
      )}

      {/* ====== Create workspace ====== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="button"
          onClick={startCreate}
          className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 justify-center"
        >
          <Plus className="w-4 h-4" />
          New Workspace
        </button>
        <button
          type="button"
          onClick={() => { setShowSaveTemplate(false); loadTemplates(); }}
          className="px-4 py-2.5 rounded-2xl border border-slate-200 hover:border-indigo-300 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 justify-center"
        >
          <FolderOpen className="w-4 h-4" />
          Field Templates ({templates.length})
        </button>
      </div>

      {showCreate && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">Create an Advanced Workspace</h4>
            <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed">
            One workspace = several Excel documents that share the same field settings. A <strong>routing field</strong> in
            each extracted record (e.g. an option, a section or a department) decides which of your documents the record is
            saved to. Every route value becomes its own downloadable document.
          </div>

          {templates.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Start from a saved field template</label>
              <select
                value={form.templateId}
                onChange={(e) => pickTemplate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">— choose a template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Workspace Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Term 1 Test Options"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Routing Field</label>
              <select
                value={form.routingField}
                onChange={(e) => setForm((prev) => ({ ...prev, routingField: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">— choose a data field —</option>
                {form.fields.map((f) => (
                  <option key={f.name} value={f.name}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Route Values (one document per value)</label>
            {form.routeValues.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.routeValues.map((val, idx) => (
                  <span key={`${val}-${idx}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-emerald-800">
                    <FileText className="w-3 h-3 text-emerald-500" />
                    {val}
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, routeValues: prev.routeValues.filter((_, i) => i !== idx) }))}
                      className="text-rose-500 hover:text-rose-700 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newRouteValue}
                onChange={(e) => setNewRouteValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const v = newRouteValue.trim().replace(/,$/, "").toLowerCase();
                    if (v && !form.routeValues.includes(v)) {
                      setForm((prev) => ({ ...prev, routeValues: [...prev.routeValues, v] }));
                    }
                    setNewRouteValue("");
                  }
                }}
                placeholder="e.g. banking, agriculture, fishery, health"
                className="flex-1 min-w-40 px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => {
                  const v = newRouteValue.trim().replace(/,$/, "").toLowerCase();
                  if (v && !form.routeValues.includes(v)) {
                    setForm((prev) => ({ ...prev, routeValues: [...prev.routeValues, v] }));
                  }
                  setNewRouteValue("");
                }}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Each value becomes its own document. Type a value and press Enter or comma to add it. Records are
              filed into these documents only; anything that does not match one of your documents goes to an
              "Uncategorised" document in the workspace.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Data Fields</label>
            <FieldEditor
              fields={form.fields}
              onChange={(fields) => setForm((prev) => ({ ...prev, fields }))}
              routingField={form.routingField}
              onRoutingFieldChange={(rf) => setForm((prev) => ({ ...prev, routingField: rf }))}
            />
          </div>

          {createMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">{createMsg}</div>
          )}

          <div className="flex justify-end pt-1 border-t border-emerald-200/60">
            <button
              type="button"
              disabled={creating}
              onClick={createWorkspace}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-1.5"
            >
              {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Create Workspace
            </button>
          </div>
        </div>
      )}

      {/* ====== Templates drawer ====== */}
      {!showCreate && templates.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          {templates.map((t) => (
            <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => { startCreate(); pickTemplate(t.id); }}
                className="text-left min-w-0"
                title="Start a workspace from this template"
              >
                <div className="font-bold text-slate-800 text-xs">{t.name}</div>
                <div className="text-[11px] text-slate-400">
                  {t.fieldDefinitions.map((f) => f.name).join(" • ")}
                </div>
              </button>
              <button
                onClick={() => deleteTemplate(t.id)}
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                title="Delete template"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ====== Lists ====== */}
      {loading ? (
        <div className="p-10 text-center text-xs text-slate-500">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading workspaces...
        </div>
      ) : (
        <div className="space-y-5">
          {mine.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                My Workspaces ({mine.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{mine.map(renderWorkspaceCard)}</div>
            </div>
          )}

          {shared.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-sky-600" />
                Shared With Me ({shared.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{shared.map(renderWorkspaceCard)}</div>
            </div>
          )}

          {mine.length === 0 && shared.length === 0 && !error && (
            <div className="p-10 text-center space-y-2 rounded-3xl border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No advanced workspaces yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Create a workspace to split extracted records into several documents by a routing field (e.g. banking,
                agriculture, fishery), update them, download each one, and share a workspace with other teachers.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ====== Workspace detail modal ====== */}
      {detailLoading && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl px-8 py-6 text-sm font-bold text-slate-700 inline-flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            Loading workspace...
          </div>
        </div>
      )}

      {detail && !detailLoading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-4xl w-full shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="break-words">{detail.name}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {detail.docs.length} document{detail.docs.length === 1 ? "" : "s"} • routing field:{" "}
                  <strong className="text-slate-700">{detail.routingField || "—"}</strong>
                  {detail.isShared && detail.owner && (
                    <span className="ml-2 text-sky-600 font-bold">shared with you by {detail.owner.name || detail.owner.username || "a teacher"}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!detail.isShared && (
                  <>
                    {!showSaveTemplate ? (
                      <button
                        type="button"
                        onClick={() => setShowSaveTemplate(true)}
                        className="px-3 py-2 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold hover:bg-violet-100 inline-flex items-center gap-1.5"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        Save as Template
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1.5">
                        <input
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="Template name"
                          className="w-32 px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <button
                          type="button"
                          disabled={savingTemplate || !templateName.trim()}
                          onClick={saveTemplate}
                          className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold"
                        >
                          {savingTemplate ? "Saving..." : "Save"}
                        </button>
                      </div>
                    )}
                  </>
                )}
                {!detail.isShared && (
                  <button
                    type="button"
                    onClick={deleteSet}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50"
                    title="Delete workspace"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={closeDetail} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100" title="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Add records */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-800">Update Documents in this Workspace</div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openAddRecords("auto")}
                      className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors ${
                        addMode === "auto"
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Auto-File by {detail.routingField || "Routing Field"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddRecords("pick")}
                      className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors ${
                        addMode === "pick"
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                      }`}
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      Add All to One Document
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-emerald-900/80">
                  Auto-file reads each page and saves every record into the document that matches its routing value.
                  Add-all sends every extracted record to one chosen document.
                </p>

                {addMode === "pick" && detail.docs.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 shrink-0">Save to:</label>
                    <select
                      value={addTarget}
                      onChange={(e) => setAddTarget(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1 min-w-40"
                    >
                      {detail.docs.map((d) => (
                        <option key={d.id} value={d.id}>{d.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 shrink-0">Photos per record:</label>
                  <select
                    value={photosPerRecord}
                    onChange={(e) => setPhotosPerRecord(Math.max(1, Math.trunc(Number(e.target.value) || 1)))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={1}>1 (auto-detect)</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                    <option value={6}>6</option>
                  </select>
                  {photosPerRecord > 1 && (
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      {addPages.length} photo(s) = {Math.ceil(addPages.length / photosPerRecord)} record{Math.ceil(addPages.length / photosPerRecord) === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                {photosPerRecord > 1 && (
                  <p className="text-[11px] text-slate-500">
                    Each group of {photosPerRecord} photos, in the order they were added, is treated as one record. The
                    first photo of a group is the one you added first.
                  </p>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      {addPages.length} page{addPages.length === 1 ? "" : "s"} added{addPages.length > 0 ? ` • ${addMode === "auto" ? "auto-filing" : `to ${detail.docs.find((d) => d.id === addTarget)?.title || ""}`}` : ""}
                    </span>
                    {addPages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowPages((v) => !v)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 text-slate-600 text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        {showPages ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {showPages ? "Hide pages" : "View pages"}
                      </button>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Snap Page
                      </button>
                      <button
                        type="button"
                        onClick={() => addGalleryRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        Batch Upload
                      </button>
                      <input
                        ref={addGalleryRef}
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        onChange={handleAddGallery}
                        className="hidden"
                      />
                    </div>
                  </div>
                  {addPages.length > 0 && showPages && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 mt-2">
                      {addPages.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAddPages((prev) => prev.filter((_, x) => x !== i))}
                          className="relative rounded-xl overflow-hidden border border-slate-200 aspect-[3/4] group"
                          title="Remove page"
                        >
                          <img src={p} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                          <span className="absolute inset-0 bg-rose-600/0 group-hover:bg-rose-600/40" />
                          <span className="absolute top-0.5 right-0.5 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-3 h-3" />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {addError && <div className="text-xs font-semibold text-rose-700">{addError}</div>}
                {addResult && <div className="text-xs font-bold text-emerald-700">{addResult}</div>}
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isExtracting || addPages.length === 0}
                    onClick={runRouteExtract}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    {isExtracting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isExtracting ? "AI Extracting & Filing..." : "Extract & Save to Workspace"}
                  </button>
                </div>
              </div>
            </div>

            {/* Docs */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-xs font-bold text-slate-800">Documents in this Workspace</div>
                {!detail.isShared && (
                  <button
                    type="button"
                    onClick={() => { setShowAddDoc((v) => !v); setAddDocValue(""); setCreateMsg(null); }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Document
                  </button>
                )}
              </div>

              {showAddDoc && (
                <div className="mb-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    New document name (route value)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={addDocValue}
                      onChange={(e) => setAddDocValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDocument(); } }}
                      placeholder="e.g. banking, agriculture, fishery"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={addingDoc || !addDocValue.trim()}
                      onClick={addDocument}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1"
                    >
                      {addingDoc ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddDoc(false); setAddDocValue(""); }}
                      className="p-2 rounded-lg text-slate-400 hover:bg-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-800/70">
                    This creates an empty document ready to receive records during the next extraction.
                  </p>
                </div>
              )}

              {createMsg && !showCreate && (
                <div className="mb-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">{createMsg}</div>
              )}

              <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {detail.docs.map((d) => (
                  <div key={d.id} className="px-3.5 sm:px-4 py-3 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => { closeDetail(); onOpenDoc(d.id); }}
                      className="flex items-center gap-2.5 min-w-0 text-left flex-1"
                      title="Open and view this document"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                          <span className="break-words">{d.title}</span>
                          {d.isArchived && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 shrink-0">removed from routing</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {d.rowCount} record{d.rowCount === 1 ? "" : "s"} • {d.pageCount} page{d.pageCount === 1 ? "" : "s"} • {d.exportFormat.toUpperCase()}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!d.isArchived && (
                        <>
                          <button
                            type="button"
                            onClick={() => openAddRecords("pick", d.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 inline-flex items-center gap-1"
                            title="Add records to this document only"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => { const docId = d.id; closeDetail(); onEditDoc(docId); }}
                            className="px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-bold hover:bg-sky-100 inline-flex items-center gap-1"
                            title="Edit records in this document"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => onDownloadDoc(d.id, d.exportFormat || "xlsx")}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                        title="Download document"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {!detail.isShared && (
                        <button
                          type="button"
                          onClick={() => deleteDocument(d.id, d.routeValue || d.title)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Delete this document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {detail.docs.length === 0 && (
                  <div className="px-4 py-8 text-center text-xs text-slate-400">
                    No documents yet. Add one above or extract some pages to create documents automatically.
                  </div>
                )}
              </div>
            </div>

            {/* Sharing */}
            {!detail.isShared && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-sky-600" />
                  Share with Other Teachers
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={shareText}
                    onChange={(e) => setShareText(e.target.value)}
                    placeholder="teacher username, e.g. brandonjudmi (comma to add several)"
                    className="flex-1 min-w-52 px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    disabled={sharing}
                    onClick={doShare}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    {sharing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                    Share
                  </button>
                </div>
                {shareMsg && <div className="text-xs font-semibold text-sky-700">{shareMsg}</div>}
                {detail.sharedWith.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    {detail.sharedWith.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-sky-50 border border-sky-200">
                        <div className="text-xs font-bold text-sky-900">
                          {r.name || r.username || r.email}
                          <span className="text-[11px] text-sky-500 font-normal ml-1.5">@{r.username || ""} {r.username && r.email ? "• " : ""}{r.email || ""}</span>
                        </div>
                        <button type="button" onClick={() => unshare(r)} className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg" title="Remove sharing">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings */}
            {!detail.isShared && (
              <div className="space-y-2.5 border-t border-slate-100 pt-4">
                <div className="text-xs font-bold text-slate-800">Workspace Settings</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Name</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Routing Field</label>
                    <select
                      value={form.routingField}
                      onChange={(e) => setForm((prev) => ({ ...prev, routingField: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="">— choose a field —</option>
                      {form.fields.map((f) => (
                        <option key={f.name} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Route Values</label>
                    {form.routeValues.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {form.routeValues.map((val, idx) => (
                          <span key={`${val}-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700">
                            {val}
                            <button
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, routeValues: prev.routeValues.filter((_, i) => i !== idx) }))}
                              className="text-rose-400 hover:text-rose-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newRouteValue}
                        onChange={(e) => setNewRouteValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            const v = newRouteValue.trim().replace(/,$/, "").toLowerCase();
                            if (v && !form.routeValues.includes(v)) {
                              setForm((prev) => ({ ...prev, routeValues: [...prev.routeValues, v] }));
                            }
                            setNewRouteValue("");
                          }
                        }}
                        placeholder="type a value and press Enter"
                        className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const v = newRouteValue.trim().replace(/,$/, "").toLowerCase();
                          if (v && !form.routeValues.includes(v)) {
                            setForm((prev) => ({ ...prev, routeValues: [...prev.routeValues, v] }));
                          }
                          setNewRouteValue("");
                        }}
                        className="px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-400 text-slate-700 text-[11px] font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Data Fields</label>
                  <FieldEditor
                    fields={form.fields}
                    onChange={(fields) => setForm((prev) => ({ ...prev, fields }))}
                    routingField={form.routingField}
                    onRoutingFieldChange={(rf) => setForm((prev) => ({ ...prev, routingField: rf }))}
                    accent="slate"
                  />
                </div>
                {createMsg && <div className="text-xs font-semibold text-rose-700">{createMsg}</div>}
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={creating}
                    onClick={saveSettings}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    {creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== Camera Studio for adding pages ====== */}
      <CameraStudio
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={async (files: File[]) => {
          await addPagesFromFiles(files);
        }}
        allowMultiple
        allowTwin
      />
    </div>
  );
}