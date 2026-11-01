# 打成零依赖单文件 HTML

目标：一个 `.html` 文件，双击即开，**不发出任何网络请求**。
适合交付演示、离线审阅、贴给不用 Node 的人看。

实测产物：347 KB（React 18 + framer-motion 11 + 3 个 CDS 组件 + 全量 Tailwind 工具类 + 主题 CSS）。

---

## 一、为什么用预打包而不是 Babel Standalone

很多教程用 `<script type="text/babel">` + `unpkg` 的 React，浏览器现场编译。
那个办法的问题：

| | Babel Standalone | esbuild 预打包 |
|---|---|---|
| 首屏 | 先拉 ~1.5 MB Babel 再编译，明显卡顿 | 直接执行，无编译 |
| 离线 | 依赖 CDN，断网即废 | 完全自包含 |
| 体积 | React+Babel 双份 | 只含实际用到的代码 |
| 报错 | 浏览器控制台里，难定位 | 构建期就报 |

所以：**演示可以用 CDN，交付必须预打包。**

---

## 二、用附带的脚本（推荐）

```bash
# 1. 装依赖（在任意临时目录，不污染项目）
npm i -D esbuild tailwindcss@3.4.17 @tailwindcss/container-queries \
         react@18 react-dom@18 framer-motion@11

# 2. 准备两个文件
#    entry.tsx  — 你的根组件，调用 createRoot 挂到 #root
#    input.css  — 只有三行：
#                 @tailwind base;
#                 @tailwind components;
#                 @tailwind utilities;

# 3. 构建（主题按顺序内联：先 cds-theme.css，后 compat.css）
node scripts/build-single-file.mjs \
  --entry  ./entry.tsx \
  --out    ./demo.html \
  --theme  ./references/upstream/code-examples/cds-theme.css \
  --theme  ./references/compat.css \
  --content ./references/upstream/code-examples
```

脚本会：跑 Tailwind CLI 抽静态 CSS → esbuild 打 IIFE → 全量内联 → 自检外部引用 →
打印各部分体积。发现 `<script src=>` 或 `<link href="http` 会直接失败退出。

### 参数

| 参数 | 必填 | 说明 |
|---|---|---|
| `--entry` | 是 | 入口 TSX/TS 文件 |
| `--out` | 否 | 输出 HTML，默认 `./dist/index.html` |
| `--theme` | 否 | 主题 CSS，**可重复**，按顺序内联；不给就用内置的精简令牌 |
| `--content` | 否 | 额外要扫描的 Tailwind 内容目录（可重复） |
| `--minify` | 否 | 传 `false` 关闭压缩，便于调试 |

---

## 三、手写构建（理解原理用）

```js
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

// 1. Tailwind 抽静态 CSS
execFileSync(process.execPath,
  ["node_modules/tailwindcss/lib/cli.js", "-c", "tailwind.config.js",
   "-i", "input.css", "-o", ".tmp/utilities.css", "--minify"],
  { stdio: "inherit" });

// 2. esbuild 打成单个 IIFE
await build({
  entryPoints: ["entry.tsx"],
  bundle: true, format: "iife", platform: "browser", target: ["es2020"],
  minify: true, jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: ".tmp/bundle.js",
});

// 3. 全量内联
const theme = fs.readFileSync("cds-theme.css", "utf8");
const util  = fs.readFileSync(".tmp/utilities.css", "utf8");
const js    = fs.readFileSync(".tmp/bundle.js", "utf8");

fs.writeFileSync("demo.html", `<!DOCTYPE html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${theme}</style><style>${util}</style></head>
<body><div id="root"></div><script>${js}</script></body></html>`);
```

---

## 四、四个必踩的坑

**1. Tailwind 的 `content` 没覆盖组件源码 → 类被 purge，页面裸奔。**
`content` 必须同时包含你的入口文件和组件库目录：

```js
content: ["./entry.tsx", "./references/upstream/code-examples/**/*.{ts,tsx}"]
```

**2. 组件在 `node_modules` 之外，esbuild 解析不到 `react`。**
给 esbuild 传 `nodePaths: ["<构建目录>/node_modules"]`，或在仓库里做软链。

**3. `process.env.NODE_ENV` 未定义 → React 打了开发版，体积翻三倍且带警告。**
必须 `define` 成 `"production"`。

**4. `<style>` 里出现 `</style>` 字样会截断解析。**
主题 CSS 里若有该字符串需转义为 `<\/style>`。当前 `cds-theme.css` 没有，但换主题时要查。

---

## 五、验证

```bash
node scripts/verify-bundle.mjs ./demo.html
```

用 jsdom 真跑一遍：挂载、渲染、点击、状态变化、无外部引用、无运行时错误。
输出 15 条 PASS/FAIL。**只截图不点击，不算验证过。**

如果想看真实像素，用 Playwright（需自带 Chromium）：

```js
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
await page.goto(`file://${process.cwd()}/demo.html`);
await page.screenshot({ path: "preview.png", fullPage: true });
```

---

## 六、体积参考

| 部分 | 大小 |
|---|---|
| Tailwind 工具类（3 组件 + 演示页） | ~55 KB |
| `cds-theme.css` 全量 | ~33 KB |
| React 18 + ReactDOM 生产版 | ~135 KB |
| framer-motion 11 | ~110 KB |
| **合计（minified，未 gzip）** | **~347 KB** |

只用一个组件时把 framer-motion 摘掉，能降到 ~190 KB。
