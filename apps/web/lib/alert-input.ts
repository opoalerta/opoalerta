import type { FiltrosSuscripcion } from "./suscripciones";

export class InvalidInput extends Error {
  constructor(public readonly status = 400) {
    super("Solicitud no valida");
  }
}

export async function readJsonObject(request: Request, limit = 4096): Promise<Record<string, unknown>> {
  if (!request.body) throw new InvalidInput();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new InvalidInput(413);
      }
      chunks.push(value);
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new InvalidInput();
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof InvalidInput) throw error;
    throw new InvalidInput();
  } finally {
    reader.releaseLock();
  }
}

const AMBITOS = new Set(["estatal", "autonomico", "provincial", "local", "universidad", "europeo", "otro"]);
const CCAA = new Set(["AN", "AR", "AS", "CB", "CE", "CL", "CM", "CN", "CT", "EX", "GA", "IB", "MC", "MD", "ML", "NC", "PV", "RI", "VC"]);
const FUENTES = new Set(["boe", "boa", "boc", "bocm", "bocyl", "boib", "boja", "bopa", "bopv", "cido", "docm", "doe", "dog", "dogc", "dogv", "epso"]);

function optionalString(value: unknown, max: number, allowed?: Set<string>): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new InvalidInput();
  }
  const text = value.trim();
  if (!text) return null;
  if (allowed && !allowed.has(text)) throw new InvalidInput();
  return text;
}

export function parseFilters(body: Record<string, unknown>): FiltrosSuscripcion {
  return {
    q: optionalString(body.q, 200),
    ccaa: optionalString(body.ccaa, 2, CCAA),
    ambito: optionalString(body.ambito, 20, AMBITOS),
    fuente_codigo: optionalString(body.fuente_codigo, 20, FUENTES),
  };
}

export function parseEmail(value: unknown): string {
  const email = optionalString(value, 254);
  if (!email || !/^[^\s@<>"(),;:\\]+@[^\s@<>"(),;:\\]+\.[^\s@<>"(),;:\\]+$/.test(email)) {
    throw new InvalidInput();
  }
  return email.toLowerCase();
}
