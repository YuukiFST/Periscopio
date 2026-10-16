import { z } from "zod";
import { UpdateRefusedError } from "./update-refused-error.ts";

export const eyejokerCategories = ["mouse", "keyboard", "monitor"] as const;
export type EyejokerCategory = (typeof eyejokerCategories)[number];

const userAgent = "eyejoker-pwa-update (weekly copy for a private PWA)";
const maxAttempts = 3;
const retryBaseDelayMs = 1000;

const eyejokerNamesSchema = z.object({ ko: z.string(), en: z.string() });

export const eyejokerDataTypes = [
  "STRING",
  "ENUM",
  "COMPANY",
  "NUMBER",
  "FILE",
  "DATETIME",
  "BOOLEAN",
] as const;

const eyejokerFieldSchema = z.object({
  field: z.string().min(1),
  dataType: z.enum(eyejokerDataTypes),
  names: eyejokerNamesSchema,
  suffix: z.string().nullable(),
  decimalPlaces: z.int().nonnegative().nullable(),
  multiSelect: z.boolean(),
  detailOrder: z.number(),
  dataList: z.array(z.object({ field: z.string().min(1), names: eyejokerNamesSchema })),
});
export type EyejokerField = z.infer<typeof eyejokerFieldSchema>;

const eyejokerRowSchema = z.object({
  id: z.guid(),
  priceKrw: z.number().nonnegative().optional(),
  values: z.record(z.string(), z.string()),
  affiliateLinks: z.array(z.object({ platform: z.string(), affiliateUrl: z.string() })).optional(),
});
export type EyejokerRow = z.infer<typeof eyejokerRowSchema>;

function snapshotEnvelopeSchema(category: EyejokerCategory) {
  return z.object({
    resultCode: z.literal("SUCCESS"),
    data: z.object({
      benchmarkType: z.object({ id: z.literal(category) }),
      detailColumns: z.object({
        common: z.array(eyejokerFieldSchema),
        spec: z.array(eyejokerFieldSchema),
        bench: z.array(eyejokerFieldSchema),
      }),
      rows: z.array(eyejokerRowSchema),
    }),
  });
}
export type EyejokerSnapshot = z.infer<ReturnType<typeof snapshotEnvelopeSchema>>["data"];

const companyEnvelopeSchema = z.object({
  resultCode: z.literal("SUCCESS"),
  data: z.array(z.object({ id: z.guid(), names: eyejokerNamesSchema })),
});
export type EyejokerCompany = z.infer<typeof companyEnvelopeSchema>["data"][number];

/** A `GET` that kept failing; `failure` is the last cause, without the URL. */
export class GetFailedError extends Error {
  override name = "GetFailedError";
  readonly failure: string;

  constructor(url: string, failure: string) {
    super(`GET ${url} falhou (${failure}).`);
    this.failure = failure;
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * `GET` with up to 3 attempts, waiting 1 s and then 2 s between them. Network
 * errors, 429 and 5xx are retried; any other non-2xx status fails at once.
 */
export async function getWithRetries(url: string): Promise<Response> {
  let lastFailure = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) await wait(retryBaseDelayMs * (attempt - 1));
    try {
      const response = await fetch(url, { headers: { "User-Agent": userAgent } });
      if (response.ok) return response;
      lastFailure = `HTTP ${response.status}`;
      await response.body?.cancel();
      if (!isRetryableStatus(response.status)) break;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
  }
  throw new GetFailedError(url, lastFailure);
}

async function getValidated<Schema extends z.ZodType>(url: string, schema: Schema) {
  let response: Response;
  try {
    response = await getWithRetries(url);
  } catch (error) {
    throw new UpdateRefusedError(error instanceof Error ? error.message : String(error));
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new UpdateRefusedError(`GET ${url} não devolveu JSON.`);
  }
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  throw new UpdateRefusedError(
    `GET ${url} devolveu um formato inesperado:\n${z.prettifyError(result.error)}`,
  );
}

export async function fetchSnapshot(
  apiUrl: string,
  category: EyejokerCategory,
): Promise<EyejokerSnapshot> {
  const url = `${apiUrl}/api/benchmark/${category}/snapshot`;
  const envelope = await getValidated(url, snapshotEnvelopeSchema(category));
  return envelope.data;
}

export async function fetchCompanies(apiUrl: string): Promise<EyejokerCompany[]> {
  const envelope = await getValidated(`${apiUrl}/api/company`, companyEnvelopeSchema);
  return envelope.data;
}
