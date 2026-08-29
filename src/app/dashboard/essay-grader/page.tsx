"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EssayGraderRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/scan-scripts");
  }, [router]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center text-slate-500 space-y-3">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-xs font-semibold">Redirecting to Mark Scripts Studio...</p>
    </div>
  );
}
