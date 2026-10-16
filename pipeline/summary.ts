import { appendFile } from "node:fs/promises";
import type { CategorySlug } from "../src/categories.ts";
import type { ImageFailure } from "./images.ts";

export type UpdateReport = {
  counts: Record<CategorySlug, number>;
  imagesDownloaded: number;
  imagesDeleted: number;
  imageFailures: ImageFailure[];
  unusableImageProductIds: string[];
  ignoredFieldKeys: string[];
  untranslatedKeys: string[];
};

function bulletList(items: string[], emptyText: string): string[] {
  if (items.length === 0) return [emptyText];
  return items.map((item) => `- \`${item}\``);
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
