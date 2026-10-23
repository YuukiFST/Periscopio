import { z } from "zod";
import type { KrwBrlRate } from "../src/data/schema.ts";
import { getWithRetries } from "./eyejoker-api.ts";

/** Frankfurter republishes the European Central Bank's reference rates, free and with no key. */
export const krwBrlSource = "Frankfurter (Banco Central Europeu)";
export const frankfurterKrwBrlPath = "/v2/providers/ECB/rate/KRW/BRL";

const frankfurterRateSchema = z.object({
  date: z.iso.date(),
  base: z.literal("KRW"),
  quote: z.literal("BRL"),
  rate: z.number().positive(),
});

export type KrwBrlFetch = { ok: true; rate: KrwBrlRate } | { ok: false; failure: string };

/** The latest ECB Cotação; a failure is returned, never thrown, since it must not refuse the Atualização. */
export async function fetchKrwBrlRate(frankfurterUrl: string): Promise<KrwBrlFetch> {
  const url = `${frankfurterUrl}${frankfurterKrwBrlPath}`;
  let response: Response;
  try {
    response = await getWithRetries(url);
  } catch (error) {
    return { ok: false, failure: error instanceof Error ? error.message : String(error) };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, failure: `GET ${url} não devolveu JSON.` };
  }
  const result = frankfurterRateSchema.safeParse(body);
  if (!result.success) return { ok: false, failure: `GET ${url} devolveu um formato inesperado.` };
  const { rate, date } = result.data;
  return { ok: true, rate: { rate, date, source: krwBrlSource } };
}
