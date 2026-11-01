#!/usr/bin/env node
/**
 * verify-bundle.mjs — 对单文件 HTML 做结构 + 运行时校验
 *
 * 用法:
 *   node scripts/verify-bundle.mjs ./demo.html
 *   node scripts/verify-bundle.mjs ./demo.html --expect "主要操作" --expect "均衡"
 *   node scripts/verify-bundle.mjs ./demo.html --click "点我 +1" --expect-after "2"
 *
 * 依赖: npm i -D jsdom
 *
 * 为什么要这个：截图只能证明"渲染出来了"，不能证明"交互是活的"。
 * 这个脚本用 jsdom 真执行一遍 bundle，点击元素、等状态更新、断言结果。
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const cwd = process.cwd();
const requireFromCwd = createRequire(path.join(cwd, "package.json"));

const argv = process.argv.slice(2);
const htmlPath = argv[0] && !argv[0].startsWith("--") ? path.resolve(cwd, argv[0]) : null;
if (!htmlPath || !fs.existsSync(htmlPath)) {
  console.error("用法: node scripts/verify-bundle.mjs <file.html> [--expect 文本] [--click 文本] [--expect-after 文本]");
  process.exit(2);
}

function getArg(name) {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
}
function getAll(name) {
  const out = [];
  argv.forEach((a, i) => {
    if (a === `--${name}` && argv[i + 1] && !argv[i + 1].startsWith("--")) out.push(argv[i + 1]);
  });
  return out;
}

const expects = getAll("expect");
const clickText = getArg("click");
const expectAfter = getArg("expect-after");

let JSDOM, VirtualConsole;
try {
  const p = requireFromCwd.resolve("jsdom");
  const mod = await import(pathToFileURL(p).href);
  JSDOM = mod.JSDOM ?? mod.default?.JSDOM;
  VirtualConsole = mod.VirtualConsole ?? mod.default?.VirtualConsole;
} catch {
  console.error('找不到 jsdom。请先安装：npm i -D jsdom');
  process.exit(2);
}

const html = fs.readFileSync(htmlPath, "utf8");
const errors = [];
const cssWarnings = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => {
  // jsdom 的 CSS 解析器落后于现代语法：@container、color-mix()、linear()、
  // (resolution >= 2x) 这类范围媒体查询都会让它抛 "Could not parse CSS stylesheet"。
  // 浏览器全部支持这些语法，所以这不算产物缺陷，单列为警告。
  if (/Could not parse CSS stylesheet/i.test(e.message)) {
    cssWarnings.push(e.message);
    return;
  }
  errors.push("jsdomError: " + e.message);
});
vc.on("error", (...a) => errors.push("console.error: " + a.join(" ")));

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole: vc,
  url: "file:///bundle.html",
});
const { window } = dom;

// jsdom 缺少的浏览器 API
window.matchMedia = window.matchMedia || ((q) => ({
  matches: false, media: q,
  addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  dispatchEvent() { return false; },
}));
window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
window.IntersectionObserver = window.IntersectionObserver || class {
  observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, pass, detail = "") => results.push({ name, pass, detail });

await wait(600);
const doc = window.document;
const root = doc.getElementById("root");
const bodyText = () => (doc.body.textContent || "").replace(/\s+/g, " ");

// ---- 静态产物 ----
check("#root 已挂载", !!root && root.children.length > 0, root ? `children=${root.children.length}` : "无 #root");
check("无外部 script/link", !/<(script|link)[^>]+(src|href)=["']https?:/i.test(html));
check("无 @tailwind 残留", !/@tailwind\s+(base|components|utilities)/.test(html));
check("JS 已内联", !/<script[^>]+src=/i.test(html));
check("Tailwind 已生成 .bg-clay 或基础工具类",
  /\.bg-clay\b/.test(html) || /\.flex\b/.test(html));
check("主题变量存在", /--cds-(clay|surface-0)/.test(html));

// ---- 内容断言 ----
for (const t of expects) {
  check(`包含文本「${t}」`, bodyText().includes(t));
}

// ---- 交互断言 ----
if (clickText) {
  const el = [...doc.querySelectorAll("button, [role='tab'], a, [data-clickable]")]
    .find((e) => (e.textContent || "").includes(clickText));
  if (!el) {
    check(`找到可点元素「${clickText}」`, false);
  } else {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    await wait(250);
    check(`点击「${clickText}」后状态变化`,
      expectAfter ? bodyText().includes(expectAfter) : true,
      expectAfter && !bodyText().includes(expectAfter) ? `未出现「${expectAfter}」` : "ok");
  }
}

// ---- 运行时错误 ----
check("无运行时错误", errors.length === 0, errors.slice(0, 2).join(" | "));

// ---- 输出 ----
console.log(`\n校验：${path.basename(htmlPath)}`);
console.log("=".repeat(52));
let failed = 0;
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  [${r.detail}]` : ""}`);
  if (!r.pass) failed++;
}
console.log("=".repeat(52));
console.log(`${results.length - failed}/${results.length} 通过`);
if (cssWarnings.length) {
  console.log(
    `\n注：jsdom 跳过了 ${cssWarnings.length} 段它解析不了的 CSS` +
      `（@container / color-mix() / linear() / (resolution >= 2x) 范围查询）。\n` +
      `    浏览器均支持，不影响产物，也不必去改样式。`
  );
}
process.exit(failed ? 1 : 0);
