import { createCn } from "cn/config";

/** The Interfere type scale in styles.css; without it, `cn` reads `text-body-sm` as a color and drops it next to `text-fg-primary`. */
const fontSizes = [
  "heading-1",
  "heading-2",
  "heading-3",
  "heading-4",
  "heading-5",
  "heading-6",
  "body-lg",
  "body-base",
  "body-sm",
  "caption-lg",
  "caption-base",
  "caption-sm",
  "code-sm",
  "code-xs",
];

export const cn = createCn({ extend: { classGroups: { "font-size": [{ text: fontSizes }] } } });
