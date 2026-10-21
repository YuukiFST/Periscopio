import { z } from "zod";
import type { Product } from "../data/schema.ts";

/**
 * The connection the user plays on, chosen in a mouse Comparação
 * (`conexao=com-fio`); none means any connection counts.
 */
export const connectionPreferences = ["com-fio", "sem-fio"] as const;
export type ConnectionPreference = (typeof connectionPreferences)[number];
export const connectionPreferenceSchema = z.enum(connectionPreferences).optional().catch(undefined);

/** A connection as the screen names it. */
export type Connection = "com fio" | "sem fio";

export const connectionOfPreference: Record<ConnectionPreference, Connection> = {
  "com-fio": "com fio",
  "sem-fio": "sem fio",
};

/**
 * The connection an EyeJoker mouse field was measured on, from its key
 * (`sensorAvgWireless`, `pcbAvgWired`); `bluetooth` for the Bluetooth
 * times and undefined for a field that does not name one.
 */
export function fieldConnection(fieldKey: string): Connection | "bluetooth" | undefined {
  if (fieldKey.includes("Wireless")) return "sem fio";
  if (fieldKey.includes("Wired")) return "com fio";
  if (fieldKey.includes("Bluetooth")) return "bluetooth";
  return undefined;
}

/** A mouse Medição taken on one connection or Motion Sync setting, rather than the headline one. */
export function isPerConnectionField(fieldKey: string): boolean {
  return fieldConnection(fieldKey) !== undefined || fieldKey.includes("MotionSync");
}

/** EyeJoker's `mouseConnection`: 유선 (com fio), 무선 (sem fio), 유무선 (both). */
const connectionsByValue: Readonly<Record<string, readonly Connection[]>> = {
  유선: ["com fio"],
  무선: ["sem fio"],
  유무선: ["com fio", "sem fio"],
};

/** The connections a mouse has; undefined when EyeJoker does not say. */
export function mouseConnections(product: Product): readonly Connection[] | undefined {
  const value = product.values["mouseConnection"];
  return typeof value === "string" ? connectionsByValue[value] : undefined;
}
