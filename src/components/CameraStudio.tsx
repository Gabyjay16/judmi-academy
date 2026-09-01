"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, SwitchCamera, X, Check, ImagePlus } from "lucide-react";

type StudioMode = "single" | "multiple" | "twin";

interface CameraStudioProps {
  open: boolean;
  onClose: () => void;
  onCapture: (files: File[]) => void;
  allowMultiple?: boolean;
  allowTwin?: boolean;
}

export default function CameraStudio({
  open,
  onClose,
  onCapture,
  allowMultiple = true,
  allowTwin = true,
}: CameraStudioProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const twinAngle1Ref = useRef<File | null>(null);

  const [mode, setMode] = useState<StudioMode>("single");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [status, setStatus] = useState("Starting camera...");
  const [captured, setCaptured] = useState<File[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [twinAngle, setTwinAngle] = useState<1 | 2>(1);
  const [starting, setStarting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startStream = useCallback(
    async (facing: "environment" | "user") => {
      stopStream();
      setStarting(true);
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus(facing === "environment" ? "Rear camera ready." : "Front camera ready.");
      } catch (e: any) {
        setCameraError(
          e?.name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access (or use the gallery / batch upload instead)."
            : "Could not open the camera on this device. You can use the gallery / batch upload instead."
        );
        setStatus("Camera unavailable.");
      } finally {
        setStarting(false);
      }
    },
    [stopStream]
  );

  useEffect(() => {
    if (open) {
      setMode("single");
      setCaptured([]);
      setThumbs([]);
      setTwinAngle(1);
      twinAngle1Ref.current = null;
      setCameraError(null);
      startStream(facingMode);
    } else {
      stopStream();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      stopStream();
      thumbs.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [stopStream, thumbs]);

  if (!open) return null;

  const switchMode = (m: StudioMode) => {
    setMode(m);
    setTwinAngle(1);
    twinAngle1Ref.current = null;
    setStatus(m === "twin" ? "Twin mode: snap angle 1 (front) then angle 2 (back)." : m === "multiple" ? "Multiple mode: snap as many photos as you like." : "Single mode: one photo.");
  };

  const addCaptured = (next: File[]) => {
    const list = [...captured, ...next];
    setCaptured(list);
    const urls = list.map((f) => URL.createObjectURL(f));
    setThumbs((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return urls;
    });
  };

  const snapPhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setStatus("Camera is still starting. Try again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d", { alpha: false })!.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.86);
    });
    if (!blob) {
      setStatus("Could not capture the photo. Please try again.");
      return;
    }

    if (mode === "twin") {
      if (twinAngle === 1) {
        const twinKey = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        twinAngle1Ref.current = new File([blob], `twin_1_${twinKey}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
        setTwinAngle(2);
        setStatus("Angle 1 saved! Aim at the second angle and tap 'Take Angle 2'.");
        return;
      }
      const match = twinAngle1Ref.current?.name.match(/^twin_1_(.+)\.jpg$/);
      const twinKey = match ? match[1] : `${Date.now()}`;
      const photo2 = new File([blob], `twin_2_${twinKey}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
      const pair = [twinAngle1Ref.current as File, photo2];
      twinAngle1Ref.current = null;
      setTwinAngle(1);
      addCaptured(pair);
      const pairs = Math.floor((captured.length + 2) / 2);
      setStatus(`Twin photo #${pairs} captured (2 angles). Snap another or press "Use captured files".`);
      return;
    }

    const photo = new File([blob], `laundry-photo-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
    if (mode === "multiple") {
      addCaptured([photo]);
      setStatus(`${captured.length + 1} photo(s) ready. Snap another or press "Use captured files".`);
    } else {
      onCapture([photo]);
      onClose();
    }
  };

  const useCaptured = () => {
    if (captured.length === 0) return;
    onCapture(captured);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200">
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-600" />
              Capture with Camera
            </h3>
            <p className="text-[11px] text-slate-400">Snap single, multiple, or twin (2-angle) photos.</p>
          </div>
          <button onClick={() => { onClose(); }} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera preview */}
        <div className="relative bg-slate-900">
          <video ref={videoRef} autoPlay muted playsInline className="w-full aspect-[3/4] sm:aspect-video object-cover" />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-xs font-bold flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Starting camera...
              </div>
            </div>
          )}
          <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-slate-900/70 text-white text-[10px] font-bold">
            {mode === "twin" ? `Twin photo — Angle ${twinAngle}` : mode === "multiple" ? `Multiple — ${captured.length} snapped` : "Single photo"}
          </span>
        </div>

        {cameraError && (
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 text-[11px] text-amber-800 font-semibold">
            {cameraError}
          </div>
        )}

        {/* Mode tabs */}
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
          <button
            type="button"
            onClick={() => switchMode("single")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${mode === "single" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            Single
          </button>
          {allowMultiple && (
            <button
              type="button"
              onClick={() => switchMode("multiple")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${mode === "multiple" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              Multiple
            </button>
          )}
          {allowTwin && (
            <button
              type="button"
              onClick={() => switchMode("twin")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${mode === "twin" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              Twin (2 angles)
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const next = facingMode === "environment" ? "user" : "environment";
              setFacingMode(next);
              startStream(next);
            }}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            Switch camera
          </button>
        </div>

        <p className="px-4 pt-2 text-[11px] text-slate-500 min-h-[16px]">{status}</p>

        {/* Captured thumbnails */}
        {thumbs.length > 0 && (
          <div className="px-4 pt-2">
            <div className="flex flex-wrap gap-2">
              {thumbs.map((url, i) => (
                <img key={i} src={url} alt={`Captured ${i + 1}`} className="w-14 h-14 rounded-lg object-cover border-2 border-indigo-300" />
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="px-4 py-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onClose()}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={starting}
            onClick={snapPhoto}
            className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-extrabold shadow-md shadow-indigo-500/20 flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            {mode === "twin" && twinAngle === 2 ? "Take Angle 2" : "Take Photo"}
          </button>
          {mode !== "single" && captured.length > 0 && (
            <button
              type="button"
              onClick={useCaptured}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Use {captured.length} captured
            </button>
          )}
        </div>

        {mode !== "single" && (
          <div className="px-4 pb-4 -mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <ImagePlus className="w-3.5 h-3.5" />
            <span>Twin mode snaps a front + back angle pair for one item. Use the gallery / batch upload for existing photos.</span>
          </div>
        )}
      </div>
    </div>
  );
}