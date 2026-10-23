import { appendFile } from "node:fs/promises";
import type { CategorySlug } from "../src/categories.ts";
import type { KrwBrlRate } from "../src/data/schema.ts";
import type { KrwBrlFetch } from "./exchange-rate.ts";
import type { ImageFailure } from "./images.ts";

export type UpdateReport = {
  counts: Record<CategorySlug, number>;
  imagesDownloaded: number;
  imagesDeleted: number;
  imageFailures: ImageFailure[];
  unusableImageProductIds: string[];
  invalidAliUrlProductIds: string[];
  ignoredFieldKeys: string[];
  untranslatedKeys: string[];
  krwBrlFetch: KrwBrlFetch;
  /** The Cotação written to `meta.json`: the fetched one, else the one published before. */
  krwBrl: KrwBrlRate | undefined;
};

function bulletList(items: string[], emptyText: string): string[] {
  if (items.length === 0) return [emptyText];
  return items.map((item) => `- \`${item}\``);
}

function krwBrlLine({ krwBrlFetch, krwBrl }: UpdateReport): string {
  if (krwBrlFetch.ok) {
    const { rate, date, source } = krwBrlFetch.rate;
    return `Cotação KRW→BRL: ${rate} em ${date}, de ${source}.`;
  }
  const kept = krwBrl
    ? `Mantida a publicada: ${krwBrl.rate} em ${krwBrl.date}.`
    : "Nenhuma publicada: o app mostra só o won.";
  return `Cotação KRW→BRL não atualizada: ${krwBrlFetch.failure} ${kept}`;
}

export function renderSummary(report: UpdateReport): string {
  const lines = [
    "## Atualização do EyeJoker",
    "",
    "| Categoria | Produtos |",
    "| --- | ---: |",
    ...Object.entries(report.counts).map(([slug, count]) => `| ${slug} | ${count} |`),
    "",
    `Fotos baixadas: ${report.imagesDownloaded}. Fotos apagadas: ${report.imagesDeleted}. Fotos com falha: ${report.imageFailures.length}.`,
    "",
    krwBrlLine(report),
    "",
    "### Chaves sem tradução pt",
    "",
    ...bulletList(report.untranslatedKeys, "Nenhuma chave sem tradução pt."),
  ];
  if (report.imageFailures.length > 0) {
    lines.push("", "### Fotos com falha", "");
    lines.push(
      ...report.imageFailures.map(({ fileName, reason }) => `- \`${fileName}\`: ${reason}`),
    );
  }
  if (report.unusableImageProductIds.length > 0) {
    lines.push("", "### Produtos com endereço de foto inesperado", "");
    lines.push(...bulletList(report.unusableImageProductIds, ""));
  }
  if (report.invalidAliUrlProductIds.length > 0) {
    lines.push("", "### Produtos com Link AliExpress inválido", "");
    lines.push(...bulletList(report.invalidAliUrlProductIds, ""));
  }
  if (report.ignoredFieldKeys.length > 0) {
    lines.push("", "### Campos do EyeJoker ignorados", "");
    lines.push(...bulletList(report.ignoredFieldKeys, ""));
  }
  return `${lines.join("\n")}\n`;
}

/** Appends to the GitHub job summary when the job has one, else prints. */
export async function publishSummary(summary: string, stepSummaryPath: string | undefined) {
  if (stepSummaryPath) await appendFile(stepSummaryPath, summary);
  else process.stdout.write(summary);
}
