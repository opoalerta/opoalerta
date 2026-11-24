import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { sqlClient } from "./sql";

export type LimitResult = { ok: true } | { ok: false; status: 429 | 503; retryAfter?: number };

export async function limitSubscription(request: Request, channel: "email" | "telegram", email?: string): Promise<LimitResult> {
  const secret = process.env.ALERT_RATE_LIMIT_SECRET;
  const url = process.env.DATABASE_URL;
  if (!url || !secret || secret.length < 32) return { ok: false, status: 503 };
  // Only trust a client-IP header that the ingress overwrites: x-forwarded-for on Vercel, or the
  // header named in TRUSTED_CLIENT_IP_HEADER (e.g. cf-connecting-ip) when the origin only accepts
  // traffic from that proxy. Otherwise every client shares one conservative bucket.
  let client = "shared";
  const trustedHeader = process.env.VERCEL === "1" ? "x-forwarded-for" : process.env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();
  if (trustedHeader) {
    const ip = request.headers.get(trustedHeader)?.trim() ?? "";
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
    const sql = sqlClient();
    if (!sql) return { ok: false, status: 503 };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), 10000); });
    const rows = await Promise.race([
      sql`SELECT consumir_cuota_alertas(${JSON.stringify(policies)}::jsonb) AS retry_after`,
      timeout,
    ]).finally(() => clearTimeout(timer));
    const retryAfter = rows[0]?.retry_after;
    if (!Number.isInteger(retryAfter) || retryAfter < 0) return { ok: false, status: 503 };
    return retryAfter === 0 ? { ok: true } : { ok: false, status: 429, retryAfter };
  } catch {
    return { ok: false, status: 503 };
  }
}
