import { readFile, readdir } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { join } from "node:path";
import { z } from "zod";
import { frankfurterKrwBrlPath } from "../../pipeline/exchange-rate.ts";

const fixturesDir = join(import.meta.dirname, "fixtures");

export type RecordedResponse = { status: number; contentType: string; body: Uint8Array | string };

/** Path to response, as recorded from the Fonte; tests edit a copy per case. */
export type RecordedRoutes = Map<string, RecordedResponse>;

export const snapshotPath = (category: "mouse" | "keyboard" | "monitor") =>
  `/api/benchmark/${category}/snapshot`;
export const companyPath = "/api/company";
/** The Cotação, under `/frankfurter` on the same server. */
export const krwBrlRatePath = `/frankfurter${frankfurterKrwBrlPath}`;

function jsonResponse(text: string): RecordedResponse {
  return { status: 200, contentType: "application/json", body: text };
}

export async function loadRecordedRoutes(): Promise<RecordedRoutes> {
  const routes: RecordedRoutes = new Map();
  for (const category of ["mouse", "keyboard", "monitor"] as const) {
    const text = await readFile(
      join(fixturesDir, "api/benchmark", category, "snapshot.json"),
      "utf8",
    );
    routes.set(snapshotPath(category), jsonResponse(text));
  }
  routes.set(
    companyPath,
    jsonResponse(await readFile(join(fixturesDir, "api/company.json"), "utf8")),
  );
  routes.set(
    krwBrlRatePath,
    jsonResponse(await readFile(join(fixturesDir, "frankfurter/krw-brl.json"), "utf8")),
  );
  for (const fileName of await readdir(join(fixturesDir, "cdn"))) {
    const bytes = new Uint8Array(await readFile(join(fixturesDir, "cdn", fileName)));
    routes.set(`/cdn/${fileName}`, { status: 200, contentType: "image/avif", body: bytes });
  }
  return routes;
}

/** Loose objects keep every recorded key the edit does not touch. */
const recordedFieldSchema = z.looseObject({
  field: z.string(),
  dataList: z.array(
    z.looseObject({ field: z.string(), names: z.object({ ko: z.string(), en: z.string() }) }),
  ),
});
const recordedSnapshotSchema = z.looseObject({
  data: z.looseObject({
    detailColumns: z.looseObject({
      common: z.array(recordedFieldSchema),
      spec: z.array(recordedFieldSchema),
      bench: z.array(recordedFieldSchema),
    }),
    rows: z.array(
      z.looseObject({
        id: z.string(),
        priceKrw: z.number().optional(),
        values: z.record(z.string(), z.string()),
        affiliateLinks: z
          .array(z.looseObject({ platform: z.string(), affiliateUrl: z.string() }))
          .optional(),
      }),
    ),
  }),
});
const recordedCompaniesSchema = z.looseObject({ data: z.array(z.looseObject({ id: z.string() })) });

function editJsonRoute<Schema extends z.ZodType>(
  routes: RecordedRoutes,
  path: string,
  schema: Schema,
  edit: (body: z.infer<Schema>) => void,
) {
  const recorded = routes.get(path);
  if (typeof recorded?.body !== "string") throw new Error(`no recorded JSON at ${path}`);
  const body = schema.parse(JSON.parse(recorded.body));
  edit(body);
  routes.set(path, jsonResponse(JSON.stringify(body)));
}

export function editRecordedSnapshot(
  routes: RecordedRoutes,
  category: "mouse" | "keyboard" | "monitor",
  edit: (snapshot: z.infer<typeof recordedSnapshotSchema>) => void,
) {
  editJsonRoute(routes, snapshotPath(category), recordedSnapshotSchema, edit);
}

export function editRecordedCompanies(
  routes: RecordedRoutes,
  edit: (companies: z.infer<typeof recordedCompaniesSchema>) => void,
) {
  editJsonRoute(routes, companyPath, recordedCompaniesSchema, edit);
}

/** Dragonfly 3 PRO, a mouse the Atualização before the recorded one did not list yet. */
export const newMouseId = "0390fea6-efb9-45ea-a1a3-71b170224e58";
/** VK M5 Max THOR, another mouse it did not list yet, still not tested in the recorded one. */
export const newUntestedMouseId = "0fbec015-8d94-469d-993e-1d9d5138fb9b";
/** H200A, a mouse that Atualização listed as not tested yet. */
export const newlyTestedMouseId = "2cf40f05-fa65-4a5c-936a-c67de7025af3";

/** Turns the recorded routes into the Atualização before them, so the recorded one has Novidades. */
export function editToPreviousAtualizacao(routes: RecordedRoutes) {
  editRecordedSnapshot(routes, "mouse", (snapshot) => {
    snapshot.data.rows = snapshot.data.rows.filter(
      (row) => row.id !== newMouseId && row.id !== newUntestedMouseId,
    );
    for (const row of snapshot.data.rows) {
      if (row.id === newlyTestedMouseId) row.values.status = "proposed";
    }
  });
}

export type RecordedEyejokerServer = {
  apiUrl: string;
  cdnUrl: string;
  frankfurterUrl: string;
  requestedPaths: string[];
  close: () => Promise<void>;
};

/** Serves the recorded Fonte excerpt and Cotação on a free local port; unknown paths answer 404. */
export async function startRecordedEyejokerServer(
  routes: RecordedRoutes,
): Promise<RecordedEyejokerServer> {
  const requestedPaths: string[] = [];
  const server: Server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    requestedPaths.push(`${request.method} ${path}`);
    const recorded = request.method === "GET" ? routes.get(path) : undefined;
    if (!recorded) {
      response.writeHead(404).end();
      return;
    }
    response
      .writeHead(recorded.status, { "Content-Type": recorded.contentType })
      .end(recorded.body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("server has no TCP port");
  const origin = `http://127.0.0.1:${address.port}`;
  return {
    apiUrl: origin,
    cdnUrl: `${origin}/cdn`,
    frankfurterUrl: `${origin}/frankfurter`,
    requestedPaths,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
