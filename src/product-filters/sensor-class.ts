import type { Product } from "../data/schema.ts";
import { numberValue } from "./filter-engine.ts";

/**
 * EyeJoker's sensor class ("센서 급"), ported from `va` in its bundle
 * `/assets/filterUtils-Dovd-Iq1.js` (build `eyejoker-db-web@c4761cbb`, read
 * 2026-10-16): the sensor name decides first, then the sensor's IPS,
 * acceleration and maximum DPI. Order of every list and rule is EyeJoker's.
 */
export const sensorClasses = [
  "focus-pro-50k",
  "flagship",
  "high-end",
  "mid-range",
  "entry",
  "legacy",
] as const;
export type SensorClass = (typeof sensorClasses)[number];

const unknownSensorNames = new Set(["", "-", "unknown", "n/a", "na", "none", "미확인"]);

const classesBySensorName: readonly (readonly [SensorClass, readonly string[]])[] = [
  ["focus-pro-50k", ["focuspro50k"]],
  [
    "flagship",
    [
      "paw3950",
      "paw3955",
      "focuspro30k",
      "focusprogen2",
      "focus45k",
      "vaxeecore1",
      "aimpointpro",
      "aim750u",
      "aimninja",
      "marksmans",
      "xero",
      "xs1",
    ],
  ],
  ["mid-range", ["paw3395se"]],
  [
    "high-end",
    [
      "paw3395",
      "paw3398",
      "paw3393",
      "focusx26k",
      "focusplus",
      "focus",
      "owleye26k",
      "markman26k",
      "pmw3399",
    ],
  ],
  [
    "mid-range",
    [
      "paw3370",
      "paw3335",
      "paw3389",
      "paw3369",
      "truemovepro",
      "truemoveair",
      "owleye19k",
      "gloriousbamf",
      "razer5g",
    ],
  ],
  [
    "entry",
    [
      "paw3311",
      "paw3328",
      "paw3333",
      "paw3349",
      "paw3359",
      "pmw3359",
      "pmw3360",
      "pmw3366",
      "paw3360",
      "aimwl",
      "mercury",
      "truemovecore",
      "1855",
    ],
  ],
  ["legacy", ["deltazero", "paw3310", "darkfield", "spcp180a"]],
];

function classByName(name: string, normalized: string): SensorClass | undefined {
  if (/\bhero\s*2\b/i.test(name) || normalized === "hero2") return "flagship";
  if (normalized.startsWith("hero")) return "high-end";
  return classesBySensorName.find(([, names]) =>
    names.some((sensorName) => normalized.includes(sensorName)),
  )?.[0];
}

function atLeast(value: number | undefined, minimum: number): boolean {
  return value !== undefined && value >= minimum;
}

function classByStats(product: Product): SensorClass | undefined {
  const ips = numberValue(product, "ips");
  const acceleration = numberValue(product, "acceleration");
  const dpiMax = numberValue(product, "dpiMax");
  const hasMotionStats = ips !== undefined || acceleration !== undefined;
  // EyeJoker reads the maximum DPI only for sensors with no IPS and no acceleration.
  const dpiOnlyAtLeast = (minimum: number) => !hasMotionStats && atLeast(dpiMax, minimum);
  const rules: readonly (readonly [SensorClass, boolean])[] = [
    ["flagship", atLeast(ips, 750) || atLeast(acceleration, 60) || dpiOnlyAtLeast(30_000)],
    ["high-end", atLeast(ips, 500) || dpiOnlyAtLeast(20_000)],
    ["mid-range", atLeast(ips, 301) || atLeast(acceleration, 40) || dpiOnlyAtLeast(16_000)],
    ["entry", atLeast(ips, 200) || atLeast(dpiMax, 8000)],
  ];
  const byStats = rules.find(([, applies]) => applies)?.[0];
  if (byStats) return byStats;
  return hasMotionStats || dpiMax !== undefined ? "legacy" : undefined;
}

/** The Produto's sensor class; undefined when it lists no sensor. */
export function sensorClassOf(product: Product): SensorClass | undefined {
  const sensor = product.values.sensor;
  const name = typeof sensor === "string" ? sensor.trim() : "";
  if (unknownSensorNames.has(name.toLowerCase())) return undefined;
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return (
    classByName(name, normalized) ??
    classByStats(product) ??
    (normalized === "" ? undefined : "legacy")
  );
}
