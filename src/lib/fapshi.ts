// Fapshi Payment Gateway client (MTN Mobile Money / Orange Money).
// Docs: https://docs.fapshi.com — sandbox base https://sandbox.fapshi.com,
// live base https://live.fapshi.com. Auth is via `apiuser` + `apikey` headers.

const BASE_URL = process.env.FAPSCHI_BASE_URL || "https://live.fapshi.com";

export function fapshiConfigured(): boolean {
  return Boolean(process.env.FAPSCHI_API_USER && process.env.FAPSCHI_API_KEY);
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    apiuser: process.env.FAPSCHI_API_USER || "",
    apikey: process.env.FAPSCHI_API_KEY || "",
  };
}

export async function initiateFapshiPayment(opts: {
  amount: number;
  email: string;
  userId: string;
  externalId: string;
  redirectUrl: string;
  message?: string;
}): Promise<{ link: string; transId: string }> {
  const res = await fetch(`${BASE_URL}/initiate-pay`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      amount: opts.amount,
      email: opts.email,
      userId: opts.userId,
      externalId: opts.externalId,
      redirectUrl: opts.redirectUrl,
      message: opts.message,
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Fapshi initiate-pay failed (${res.status})`);
  }
  if (!data?.link || !data?.transId) {
    throw new Error("Fapshi did not return a payment link.");
  }
  return { link: data.link, transId: data.transId };
}

export async function getFapshiPaymentStatus(transId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/payment-status/${encodeURIComponent(transId)}`, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Fapshi payment-status failed (${res.status})`);
  }
  return data?.status || "PENDING";
}