"use client";

import { useEffect, useState, useRef } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface TestTimerProps {
  durationMinutes: number;
  onTimeExpired: () => void;
  storageKey: string; // Persistent local storage key for test progress
  onTick?: (remainingSeconds: number) => void;
}

export function TestTimer({
  durationMinutes,
  onTimeExpired,
  storageKey,
  onTick,
}: TestTimerProps) {
  const totalSeconds = durationMinutes * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalSeconds);
  const [hasWarned, setHasWarned] = useState(false);
  const onTimeExpiredRef = useRef(onTimeExpired);
  onTimeExpiredRef.current = onTimeExpired;

  useEffect(() => {
    // Check if there is an existing start time in sessionStorage
    const storedStartTime = sessionStorage.getItem(`${storageKey}_startTime`);
    let startTime: number;

    if (storedStartTime) {
      startTime = parseInt(storedStartTime, 10);
    } else {
      startTime = Date.now();
      sessionStorage.setItem(`${storageKey}_startTime`, startTime.toString());
    }

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsedSeconds);
      setSecondsRemaining(remaining);
      if (onTick) onTick(remaining);

      if (remaining <= 120 && !hasWarned && remaining > 0) {
        setHasWarned(true);
      }

      if (remaining === 0) {
        clearInterval(interval);
        onTimeExpiredRef.current();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [totalSeconds, storageKey, hasWarned, onTick]);

  const percentage = Math.max(0, Math.min(100, (secondsRemaining / totalSeconds) * 100));
  const isCritical = secondsRemaining <= 120; // Under 2 mins
  const isWarning = secondsRemaining <= 300 && !isCritical; // Under 5 mins

  return (
    <div
      className={`sticky top-20 z-40 px-4 py-2.5 rounded-xl border shadow-sm transition-all duration-300 flex items-center justify-between gap-4 ${
        isCritical
          ? "bg-rose-50 border-rose-300 text-rose-800 animate-pulse"
          : isWarning
          ? "bg-amber-50 border-amber-300 text-amber-800"
          : "bg-white/95 border-slate-200 text-slate-800 backdrop-blur-md"
      }`}
    >
      <div className="flex items-center gap-2">
        {isCritical ? (
          <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" />
        ) : (
          <Clock className={`w-5 h-5 ${isWarning ? "text-amber-600" : "text-indigo-600"}`} />
        )}
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {isCritical ? "Time Running Out!" : "Time Remaining"}
          </div>
          <div className="text-xl font-bold font-mono tracking-tight">
            {formatTime(secondsRemaining)}
          </div>
        </div>
      </div>

      {/* Mini Progress Bar */}
      <div className="hidden sm:flex flex-col items-end gap-1 w-32">
        <div className="text-[10px] text-slate-400 font-medium">
          {Math.round(percentage)}% left
        </div>
        <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isCritical
                ? "bg-rose-600"
                : isWarning
                ? "bg-amber-500"
                : "bg-indigo-600"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
