#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = path.join(root, "plugins/claude-design/skills/claude-design");
const upstreamStorybook = path.join(
  skillRoot,
  "references/upstream/docs/claude-components-storybook.html",
);
const outputFile = path.join(skillRoot, "assets/claude-components-storybook.html");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cds-storybook-"));

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(upstreamStorybook)) {
  fail(`Missing upstream storybook: ${upstreamStorybook}`);
}

const sourceHtml = fs.readFileSync(upstreamStorybook, "utf8");
const styleMatch = sourceHtml.match(/<style>\s*([\s\S]*?)\s*<\/style>/);
const scriptMatch = sourceHtml.match(/<script type="text\/babel">\s*([\s\S]*?)\s*<\/script>/);
const bodyMatch = sourceHtml.match(/<body([^>]*)>([\s\S]*?)<script type="text\/babel">/);

if (!styleMatch || !scriptMatch || !bodyMatch) {
  fail("Could not extract the upstream storybook CSS, JSX, or body.");
}

const [, customCss, jsxSource, bodyAttributes, bodyPrefix] = [
  null,
  styleMatch[1],
  scriptMatch[1],
  bodyMatch[1],
  bodyMatch[2],
];

const entryPath = path.join(tempDir, "storybook-entry.jsx");
const tailwindInputPath = path.join(tempDir, "tailwind-input.css");
const tailwindOutputPath = path.join(tempDir, "tailwind-output.css");
const tailwindConfigPath = path.join(tempDir, "tailwind.config.cjs");
const bundlePath = path.join(tempDir, "storybook-bundle.js");

const entrySource = [
  'import React from "react";',
  'import { createRoot } from "react-dom/client";',
  "const ReactDOM = { createRoot };",
  jsxSource,
]
  .join("\n")
  .replace(
    'ReactDOM.render(<App />, document.getElementById("root"));',
    'createRoot(document.getElementById("root")).render(<App />);',
  );

if (!entrySource.includes("createRoot(document.getElementById(\"root\")).render(<App />);")) {
  fail("Could not replace the legacy ReactDOM.render bootstrap.");
}

fs.writeFileSync(entryPath, entrySource, "utf8");
fs.writeFileSync(
  tailwindInputPath,
  "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n",
  "utf8",
);

const presetPath = path.join(skillRoot, "scripts/tailwind.preset.js");
fs.writeFileSync(
  tailwindConfigPath,
  `const preset = require(${JSON.stringify(presetPath)});
module.exports = {
  presets: [preset],
  content: [${JSON.stringify(entryPath)}, ${JSON.stringify(upstreamStorybook)}],
  theme: {
    extend: {
      colors: {
        clay: { DEFAULT: "#d97757", hover: "#cc5a36", light: "#fbf3ef", dark: "#e08264" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "PingFang SC", "sans-serif"],
        serif: ["Newsreader", "ui-serif", "Georgia", "Times New Roman", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      borderRadius: { chin: "var(--cds-radius-chin, 12px)" },
      boxShadow: {
        "card-subtle": "0 0 0 1px var(--cds-border), 0 2px 8px -2px rgba(0, 0, 0, 0.05)",
      },
    },
  },
};`,
  "utf8",
);

console.log("→ Building Tailwind utilities from the complete upstream storybook...");
execFileSync(
  process.execPath,
  [
    path.join(root, "node_modules/tailwindcss/lib/cli.js"),
    "-c",
    tailwindConfigPath,
    "-i",
    tailwindInputPath,
    "-o",
    tailwindOutputPath,
    "--minify",
  ],
  {
    cwd: root,
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, BROWSERSLIST_IGNORE_OLD_DATA: "1" },
  },
);

console.log("→ Bundling React, ReactDOM, and all storybook components...");
await build({
  entryPoints: [entryPath],
  bundle: true,
  absWorkingDir: root,
  nodePaths: [path.join(root, "node_modules")],
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  jsx: "automatic",
  minify: true,
  legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: bundlePath,
  logLevel: "warning",
});

const utilities = fs.readFileSync(tailwindOutputPath, "utf8");
const bundle = fs.readFileSync(bundlePath, "utf8");
const safeInline = (value) =>
  value.replace(/<\/style>/gi, "<\\/style>").replace(/<\/script>/gi, "<\\/script>");

const offlineHtml = `<!DOCTYPE html>
<html lang="zh-CN" class="h-full scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude Design System (CDS 2.0) - Offline Storybook</title>
  <style>${safeInline(utilities)}</style>
  <style>${safeInline(customCss)}</style>
</head>
<body${bodyAttributes}>
  ${bodyPrefix.trim()}
  <script>${safeInline(bundle)}</script>
</body>
</html>
`;

const externalReferences = [
  ...offlineHtml.matchAll(/\b(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi),
].map((match) => match[1]);
if (externalReferences.length) {
  fail(`Offline storybook still contains external resources:\n${externalReferences.join("\n")}`);
}
if (/@tailwind\s+(?:base|components|utilities)/.test(offlineHtml)) {
  fail("Tailwind directives remain in the offline storybook.");
}

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, offlineHtml, "utf8");

const kb = (value) => `${(Buffer.byteLength(value) / 1024).toFixed(1)} KB`;
console.log(`PASS  offline storybook build: ${kb(offlineHtml)}`);
console.log(`  css: ${kb(utilities)}`);
console.log(`  js:  ${kb(bundle)}`);
console.log(`  out: ${outputFile}`);

if (!process.env.CDS_KEEP_TMP) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

