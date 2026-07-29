import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handlePrayerTimes } from "../server/prayerTimes";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const city = String(req.query.city ?? "");
  const result = await handlePrayerTimes(city);
  if (result.status === 200) {
    // CDN cache'i: fonksiyon çağrısı ve upstream kullanımını daha da azaltır
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=86400");
  }
  res.status(result.status).json(result.body);
}
