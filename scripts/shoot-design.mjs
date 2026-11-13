#!/usr/bin/env node
// Screenshots design gallery frames with the local Chrome, for reviewing a direction.
// Usage: node scripts/shoot-design.mjs --dist <built gallery dir> --variant <id> --out <dir> [--theme light|dark]
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    dist: { type: "string", default: "docs/design" },
    variant: { type: "string" },
    out: { type: "string", default: "design-shots" },
    theme: { type: "string" },
  },
});

const require = createRequire(
  "/Users/vedank/Github/t3code/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core/package.json",
);
const { chromium } = require("playwright-core");

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const out = resolve(values.out);
mkdirSync(out, { recursive: true });
const themes = values.theme ? [values.theme] : ["light", "dark"];
for (const theme of themes) {
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 2400, height: 1600 } });
  page.on("pageerror", (error) => console.error(`pageerror: ${error.message}`));
  const url = pathToFileURL(resolve(values.dist, "design.html"));
  url.search = new URLSearchParams({ theme, ...(values.variant ? { variant: values.variant } : { all: "1" }) }).toString();
  await page.goto(url.href);
  await page.waitForTimeout(600);
  for (const frame of await page.locator("[data-shot]").all()) {
    const id = await frame.getAttribute("data-shot");
    const path = `${out}/${id}--${theme}.png`;
    await frame.screenshot({ path, omitBackground: false });
    console.log(path);
  }
  await page.close();
}
await browser.close();
