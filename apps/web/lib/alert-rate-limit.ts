import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { neon } from "@neondatabase/serverless";

export type LimitResult = { ok: true } | { ok: false; status: 429 | 503; retryAfter?: number };

export async function limitSubscription(request: Request, channel: "email" | "telegram", email?: string): Promise<LimitResult> {
  const secret = process.env.ALERT_RATE_LIMIT_SECRET;
  const url = process.env.DATABASE_URL;
  if (!url || !secret || secret.length < 32) return { ok: false, status: 503 };
  // Only trust the header on Vercel, where the ingress overwrites it.
  // Other deployments share one conservative client bucket until a trusted proxy is configured.
  let client = "shared";
  if (process.env.VERCEL === "1") {
    const ip = request.headers.get("x-forwarded-for")?.trim() ?? "";
    if (!isIP(ip)) return { ok: false, status: 503 };
    client = ip;
  }
  const digest = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
  const policies = [
    { key: `${channel}:global:hour`, limit: 100, seconds: 3600 },
    { key: `${channel}:global:day`, limit: 500, seconds: 86400 },
    { key: `${channel}:client:${digest(`client:${client}`)}`, limit: 10, seconds: 3600 },
  ];
  if (channel === "email") {
    if (!email) return { ok: false, status: 503 };
    const destination = digest(`email:${email.trim().toLowerCase()}`);
    policies.push(
      { key: `email:cooldown:${destination}`, limit: 1, seconds: 600 },
      { key: `email:day:${destination}`, limit: 3, seconds: 86400 },
    );
  }
  try {
    const sql = neon(url, { fetchOptions: { cache: "no-store", signal: AbortSignal.timeout(10000) } });
    const rows = await sql`SELECT consumir_cuota_alertas(${JSON.stringify(policies)}::jsonb) AS retry_after`;
    const retryAfter = rows[0]?.retry_after;
    if (!Number.isInteger(retryAfter) || retryAfter < 0) return { ok: false, status: 503 };
    return retryAfter === 0 ? { ok: true } : { ok: false, status: 429, retryAfter };
  } catch {
    return { ok: false, status: 503 };
  }
}
