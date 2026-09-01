"use client";

import { useState, useEffect, useRef } from "react";
import { Link2, Copy, Check, RefreshCw, Palette, Upload, ImageIcon, Save, ShieldCheck, ExternalLink } from "lucide-react";

export default function SchoolBrandingPanel() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [brandColor, setBrandColor] = useState("#4f46e5");
  const [logoData, setLogoData] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/org/branding");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to load branding.");
        return;
      }
      setData(json);
      setBrandName(json.branding?.brandName || "");
      setBrandColor(json.branding?.brandColor || "#4f46e5");
      setLogoPreview(json.branding?.logoData || null);
      setLogoData(json.branding?.logoData || null);
    } catch (e: any) {
      setError(e.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const link = data?.schoolUrl || "";

  const copyLink = async () => {
    const full = `${window.location.origin}${link}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Could not copy. Please select the link manually.");
    }
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_500_000) {
      setError("Logo file too large. Please use an image under 2.5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoData(result);
      setLogoPreview(result);
      setMessage(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const save = async () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/org/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          brandColor,
          logo: logoData,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to save branding.");
        return;
      }
      setData((prev: any) => ({ ...prev, ...json, schoolUrl: json.schoolUrl }));
      setMessage(json.message || "Branding saved.");
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setSaving(false);
    }
  };

  const regenerateKey = async () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/org/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateKey: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to regenerate access key.");
        return;
      }
      setData((prev: any) => ({ ...prev, ...json, schoolUrl: json.schoolUrl }));
      setMessage("Access key regenerated. The old link no longer works.");
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center text-sm text-slate-500">
        Loading school branding...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-3xl">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <Palette className="w-5 h-5 text-indigo-600" /> School Link &amp; Branding
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Give your teachers and students a private, branded login page for your institution instead of "Judmi Academy".
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}
      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {message}
        </div>
      )}

      {/* Private link */}
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
          <Link2 className="w-4 h-4 text-indigo-600" />
          Your Private School Login Link
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Share this link only with <strong>your</strong> teachers and students. Anyone without this exact link
          cannot see your branded login page. Other schools cannot access it.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-indigo-200 bg-white text-xs font-mono text-slate-700 focus:outline-none"
          />
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-300 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open
          </a>
        </div>
        <button
          onClick={regenerateKey}
          disabled={saving}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600 hover:text-rose-700 disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Regenerate access key (revokes old link)
        </button>
      </div>

      {/* Branding settings */}
      <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <ShieldCheck className="w-4 h-4 text-indigo-600" /> Customize Your School&apos;s Branding
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Display Name</label>
          <input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder={data?.organization?.name || "School name"}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
          />
          <p className="text-[10px] text-slate-400 mt-1">Shown on your branded login page. Leave unchanged to use the org name.</p>
        </div>

        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Brand Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
              />
              <input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-24 px-2 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none text-slate-900"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Background color of your school&apos;s login page.</p>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">School Logo</label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-slate-300" />
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                {logoPreview ? "Change Logo" : "Upload Logo"}
              </button>
              {logoPreview && (
                <button
                  onClick={() => { setLogoData(null); setLogoPreview(null); }}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Remove
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">PNG, JPG or WebP under 2.5MB.</p>
          </div>
        </div>
      </div>

      <div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-500/20 transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Branding"}
        </button>
      </div>
    </div>
  );
}
