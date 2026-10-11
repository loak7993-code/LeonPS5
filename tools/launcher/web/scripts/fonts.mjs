import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, "..");
const out = join(web, "public", "fonts");
mkdirSync(out, { recursive: true });
copyFileSync(
  join(web, "node_modules", "geist", "dist", "fonts", "geist-sans", "Geist-Variable.woff2"),
  join(out, "Geist-Variable.woff2"),
);
copyFileSync(
  join(web, "node_modules", "geist", "dist", "fonts", "geist-mono", "GeistMono-Variable.woff2"),
  join(out, "GeistMono-Variable.woff2"),
);
