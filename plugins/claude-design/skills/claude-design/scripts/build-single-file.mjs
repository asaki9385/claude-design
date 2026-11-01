#!/usr/bin/env node
/**
 * build-single-file.mjs — 把 React 组件打成零外部请求的单文件 HTML
 *
 * 用法:
 *   node scripts/build-single-file.mjs --entry ./entry.tsx --out ./demo.html \
 *        [--theme cds-theme.css] [--theme compat.css] [--content ./src] [--minify false]
 *
 *   --theme 可重复，按出现顺序内联（CDS 必须先 cds-theme.css 后 compat.css）。
 *
 * 依赖（装在你自己的项目里，不是装在本 skill 里）:
 *   esbuild  tailwindcss@3.4  react react-dom framer-motion
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";

const cwd = process.cwd();
const requireFromCwd = createRequire(path.join(cwd, "package.json"));

// ---------- 参数解析 ----------
const argv = process.argv.slice(2);
function getArg(name, def) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
}
function getAll(name) {
  const out = [];
  argv.forEach((a, i) => {
    if (a === `--${name}` && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      out.push(argv[i + 1]);
    }
  });
  return out;
}
const abs = (p) => path.resolve(cwd, p);

const entry = getArg("entry");
if (!entry || entry === true) {
  console.error("缺少 --entry");
  process.exit(2);
}
const outFile = abs(getArg("out", "dist/index.html"));
const themePaths = getAll("theme").map(abs);   // 可重复，按顺序内联
const minify = getArg("minify", "true") !== "false";
const extraContent = getAll("content").map(abs);

// ---------- 依赖解析（从用户 cwd 解析，不从本 skill 目录） ----------
function resolveFromCwd(spec) {
  try {
    return requireFromCwd.resolve(spec);
  } catch {
    console.error(
      `找不到依赖 "${spec}"。请先在当前目录安装：\n` +
        `  npm i -D esbuild tailwindcss@3.4 @tailwindcss/container-queries react react-dom framer-motion`
    );
    process.exit(2);
  }
}
const esbuildEntryPath = resolveFromCwd("esbuild");
const tailwindCliPath = resolveFromCwd("tailwindcss/lib/cli.js");

const esbuildMod = await import(pathToFileURL(esbuildEntryPath).href);
const esbuildBuild = esbuildMod.build ?? esbuildMod.default.build;

// ---------- 临时目录 ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cds-build-"));
const utilCssPath = path.join(tmp, "utilities.css");
const bundlePath = path.join(tmp, "bundle.js");
const inputCssPath = path.join(tmp, "input.css");
const twConfigPath = path.join(tmp, "tailwind.config.cjs");

fs.writeFileSync(
  inputCssPath,
  "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n",
  "utf8"
);

// 内容扫描范围：入口同目录 + 额外指定目录
// 必须排除 node_modules，否则 Tailwind 会扫进去，构建从 1 秒涨到 20 秒
const EXCLUDE = ["!**/node_modules/**", "!**/dist/**", "!**/.git/**", "!**/.tmp/**"];
const contentGlobs = [
  path.join(path.dirname(abs(entry)), "**/*.{ts,tsx,js,jsx,html,mdx}"),
  ...extraContent.map((d) => path.join(d, "**/*.{ts,tsx,js,jsx,html,mdx}")),
  ...EXCLUDE,
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

fs.writeFileSync(
  twConfigPath,
  `const preset = require(${JSON.stringify(path.join(scriptDir, "tailwind.preset.js"))});
module.exports = {
  presets: [preset],
  content: ${JSON.stringify(contentGlobs)},
};`,
  "utf8"
);

// ---------- 1. Tailwind ----------
process.stdout.write("→ 抽取 Tailwind 工具类…\n");
execFileSync(
  process.execPath,
  [tailwindCliPath, "-c", twConfigPath, "-i", inputCssPath, "-o", utilCssPath, "--minify"],
  { stdio: ["ignore", "ignore", "inherit"], cwd }
);
const utilCss = fs.readFileSync(utilCssPath, "utf8");

// ---------- 2. esbuild ----------
process.stdout.write("→ 打包 React bundle…\n");
const nodePaths = [path.join(cwd, "node_modules")];
try {
  await esbuildBuild({
    entryPoints: [abs(entry)],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    minify,
    legalComments: "none",
    jsx: "automatic",
    nodePaths,
    define: { "process.env.NODE_ENV": '"production"' },
    outfile: bundlePath,
    logLevel: "warning",
  });
} catch (err) {
  console.error("\n打包失败：", err.message);
  process.exit(1);
}
const js = fs.readFileSync(bundlePath, "utf8");

// ---------- 3. 主题 CSS ----------
const FALLBACK_TOKENS = `:root{
  --cds-rem-scale: calc(16 / 17);
  --brand:#c6613f; --cds-clay:#d97757; --cds-clay-hover:#cc5a36; --cds-clay-light:#fbf3ef;
  --cds-surface-0:#f9f9f7; --cds-surface-1:#fcfcfb; --cds-surface-2:#fff;
  --cds-surface-3:#fff; --cds-surface-popover:#fff;
  --cds-alpha-1:hsla(0,0%,8%,0.05); --cds-alpha-2:hsla(0,0%,8%,0.10); --cds-alpha-3:hsla(0,0%,8%,0.20);
  --cds-border:var(--cds-alpha-2); --cds-border-strong:var(--cds-alpha-3);
  --cds-fill-ghost-hover:var(--cds-alpha-1); --cds-fill-secondary:var(--cds-alpha-2);
  --cds-text-primary:#151515; --cds-text-secondary:#525252; --cds-text-muted:#8a8a8a;
  --cds-panel-radius:10px; --cds-radius-composer:20px;
  --cds-shadow-sm:0 1px 2px 0 rgba(0,0,0,.05), 0 2px 8px 0 rgba(0,0,0,.08);
  --cds-shadow-md:0 2px 4px 0 rgba(0,0,0,.05), 0 6px 16px 0 rgba(0,0,0,.08);
  --cds-shadow-lg:0 4px 8px 0 rgba(0,0,0,.06), 0 12px 28px -2px rgba(0,0,0,.08);
  --cds-panel-shadow:0 0 0 1px var(--cds-border), var(--cds-shadow-sm);
  --cds-shadow-composer:0 4px 20px rgba(0,0,0,.035), inset 0 0 0 1px var(--cds-border);
  --cds-ease-swift:cubic-bezier(.16,1,.3,1); --cds-ease-expand:cubic-bezier(.19,1,.22,1);
  --cds-ease-snap:cubic-bezier(.32,.72,0,1); --cds-ease-pop:cubic-bezier(.34,1.56,.64,1);
}
.dark{
  --cds-surface-0:#0b0b0b; --cds-surface-1:#151515; --cds-surface-2:#1a1a19;
  --cds-surface-3:#20201f; --cds-surface-popover:#2c2c2a;
  --cds-alpha-1:hsla(0,0%,100%,0.05); --cds-alpha-2:hsla(0,0%,100%,0.09); --cds-alpha-3:hsla(0,0%,100%,0.18);
  --cds-text-primary:#f5f5f5; --cds-text-secondary:#a3a3a3; --cds-text-muted:#666666;
  --cds-shadow-sm:0 1px 2px 0 rgba(0,0,0,.4), 0 2px 8px 0 rgba(0,0,0,.4);
  --cds-shadow-md:0 2px 4px 0 rgba(0,0,0,.4), 0 6px 16px 0 rgba(0,0,0,.4);
  --cds-shadow-lg:0 4px 8px 0 rgba(0,0,0,.5), 0 16px 36px -2px rgba(0,0,0,.4);
}`;

let themeCss;
if (themePaths.length) {
  themeCss = themePaths
    .map((p) => {
      if (!fs.existsSync(p)) {
        console.error(`主题文件不存在：${p}`);
        process.exit(2);
      }
      return `/* ==== ${path.basename(p)} ==== */\n` + fs.readFileSync(p, "utf8");
    })
    .join("\n");
} else {
  process.stdout.write("→ 未指定 --theme，使用内置精简令牌\n");
  themeCss = FALLBACK_TOKENS;
}

// ---------- 4. 内联 ----------
const safe = (s) => s.replace(/<\/style>/gi, "<\\/style>").replace(/<\/script>/gi, "<\\/script>");

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CDS Preview</title>
<style>${safe(themeCss)}</style>
<style>${safe(utilCss)}</style>
</head>
<body>
<div id="root"></div>
<script>${safe(js)}</script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html, "utf8");

// ---------- 5. 自检 ----------
const externalRefs = [...html.matchAll(/\b(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/gi)].map(
  (m) => m[1]
);
const kb = (n) => (n / 1024).toFixed(1) + " KB";

console.log("\n=== 产出 ===");
console.log("tailwind utilities :", kb(utilCss.length));
console.log("theme css          :", kb(themeCss.length));
console.log("js bundle          :", kb(js.length));
console.log("单文件 HTML        :", kb(html.length), "→", outFile);

if (externalRefs.length) {
  console.error("\n✗ 发现外部资源引用，产物不是离线的：");
  externalRefs.forEach((u) => console.error("   ", u));
  process.exit(1);
}
if (/@tailwind\s+(base|components|utilities)/.test(html)) {
  console.error("\n✗ 产物里残留 @tailwind 指令，Tailwind 没有正确编译");
  process.exit(1);
}
console.log("\n✓ 离线自检通过：无外部引用、无 @tailwind 残留");

// 清理
if (!process.env.CDS_KEEP_TMP) {
  fs.rmSync(tmp, { recursive: true, force: true });
}
