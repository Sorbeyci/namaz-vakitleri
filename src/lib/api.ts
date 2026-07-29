import type { DayTimes } from "./prayers";

export interface TimesResponse {
  city: string;
  citySlug: string;
  lastUpdated: string; // ISO
  source: "api" | "cache" | "stale-cache" | "demo";
  days: DayTimes[];
}

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function fetchPrayerTimes(citySlug: string): Promise<TimesResponse> {
  let res: Response;
  try {
    res = await fetch(`/api/prayer-times?city=${encodeURIComponent(citySlug)}`);
  } catch {
    throw new ApiError("network", "Sunucuya ulaşılamadı.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body || !Array.isArray(body.days)) {
    throw new ApiError(
      body?.error ?? "unknown",
      body?.message ?? "Namaz vakitleri şu anda güncellenemedi.",
    );
  }
  return body as TimesResponse;
}
