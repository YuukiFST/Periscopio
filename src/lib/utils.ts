import { createCn } from "cn/config";

/** The Fluid Functionalism type scale in styles.css; without it, `cn` reads `text-body` as a color and drops it next to `text-foreground`. */
const fontSizes = ["display", "title", "subtitle", "body", "caption", "micro"];

export const cn = createCn({ extend: { classGroups: { "font-size": [{ text: fontSizes }] } } });
