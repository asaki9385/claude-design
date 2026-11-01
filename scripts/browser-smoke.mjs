#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demoPath = path.join(
  root,
  "plugins/claude-design/skills/claude-design/assets/cds-offline-demo.html",
);
const storybookPath = path.join(
  root,
  "plugins/claude-design/skills/claude-design/assets/claude-components-storybook.html",
);
const writePreview = process.argv.includes("--write-preview");
const outputDir = writePreview ? path.join(root, "docs") : fs.mkdtempSync(path.join(os.tmpdir(), "ocd-preview-"));

function firstExisting(paths) {
  return paths.find((candidate) => candidate && fs.existsSync(candidate));
}

function commandPath(command) {
  try {
    return execFileSync("which", [command], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function findChrome() {
  return firstExisting([
    process.env.PLAYWRIGHT_CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    commandPath("google-chrome"),
    commandPath("google-chrome-stable"),
    commandPath("chromium"),
    commandPath("chromium-browser"),
    commandPath("microsoft-edge"),
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ]);
}

const executablePath = findChrome();
if (!executablePath) {
  console.error("No Chrome, Chromium, or Edge executable found.");
  console.error("Set PLAYWRIGHT_CHROME_PATH to run the real-browser smoke test.");
  process.exit(2);
}

fs.mkdirSync(path.join(outputDir, "artifacts"), { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--allow-file-access-from-files"],
});

const externalRequests = [];
const browserErrors = [];

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    locale: "zh-CN",
  });
  const page = await context.newPage();
  page.on("request", (request) => {
    if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.goto(pathToFileURL(demoPath).href, { waitUntil: "load" });
  await page.locator("#root").waitFor({ state: "visible" });
  await page.getByText("CDS 离线单文件验证", { exact: true }).waitFor();
  await page.getByText("CdsButton", { exact: true }).waitFor();
  await page.getByText("SegmentedControl", { exact: true }).waitFor();
  await page.getByText("ThinkingAccordion", { exact: true }).waitFor();

  await page.getByRole("button", { name: "点我 +1", exact: true }).click();
  await page.getByText("React 状态计数：1", { exact: true }).waitFor();

  await page.getByRole("tab", { name: "深度", exact: true }).click();
  await page.getByText("当前值：deep", { exact: true }).waitFor();

  await page.getByRole("button", { name: "模拟流式思考（锁定展开）", exact: true }).click();
  await page.getByText("Thinking…", { exact: true }).waitFor();

  const desktopPreview = path.join(outputDir, "preview.png");
  await page.screenshot({ path: desktopPreview, fullPage: true });

  const storybookPage = await context.newPage();
  storybookPage.on("request", (request) => {
    if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
  });
  storybookPage.on("pageerror", (error) => browserErrors.push(error.message));
  storybookPage.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  await storybookPage.goto(pathToFileURL(storybookPath).href, { waitUntil: "load" });
  await storybookPage.getByRole("heading", { name: "Claude Design System (CDS 2.0)" }).waitFor();
  await storybookPage
    .getByRole("heading", { name: "Claude Desktop 2.0 工业级升级实验室" })
    .waitFor();
  assert.ok((await storybookPage.locator("section").count()) >= 9);
  await storybookPage.getByRole("button", { name: "☀️ 浅色", exact: true }).click();
  await storybookPage.getByRole("button", { name: "🌙 深色", exact: true }).waitFor();
  await storybookPage.waitForFunction(() => document.documentElement.classList.contains("dark"));
  const storybookPreview = path.join(outputDir, "storybook-preview.png");
  await storybookPage.screenshot({ path: storybookPreview });
  await storybookPage.getByTitle("高亮页面所有闭合边框与嵌套边框").click();
  await storybookPage.waitForFunction(() =>
    document.documentElement.classList.contains("xray-active"),
  );
  const storybookXrayPreview = path.join(outputDir, "storybook-xray-preview.png");
  await storybookPage.screenshot({ path: storybookXrayPreview });

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    locale: "zh-CN",
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  mobilePage.on("request", (request) => {
    if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
  });
  mobilePage.on("pageerror", (error) => browserErrors.push(error.message));
  mobilePage.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  await mobilePage.goto(pathToFileURL(demoPath).href, { waitUntil: "load" });
  await mobilePage.getByText("CDS 离线单文件验证", { exact: true }).waitFor();
  await mobilePage.getByRole("button", { name: "点我 +1", exact: true }).click();
  await mobilePage.getByText("React 状态计数：1", { exact: true }).waitFor();
  const overflow = await mobilePage.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  assert.equal(overflow, 0, `mobile page has ${overflow}px horizontal overflow`);
  const mobilePreview = path.join(outputDir, "preview-mobile.png");
  await mobilePage.screenshot({ path: mobilePreview, fullPage: true });

  const mobileStorybookPage = await mobileContext.newPage();
  mobileStorybookPage.on("request", (request) => {
    if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
  });
  mobileStorybookPage.on("pageerror", (error) => browserErrors.push(error.message));
  mobileStorybookPage.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  await mobileStorybookPage.goto(pathToFileURL(storybookPath).href, { waitUntil: "load" });
  await mobileStorybookPage
    .getByRole("heading", { name: "Claude Design System (CDS 2.0)" })
    .waitFor();
  const storybookOverflow = await mobileStorybookPage.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  assert.equal(
    storybookOverflow,
    0,
    `mobile storybook has ${storybookOverflow}px horizontal overflow`,
  );
  const mobileStorybookPreview = path.join(outputDir, "storybook-preview-mobile.png");
  await mobileStorybookPage.screenshot({ path: mobileStorybookPreview });
  await mobileContext.close();

  assert.deepEqual(externalRequests, [], "demo attempted an external network request");
  assert.deepEqual(browserErrors, [], `browser reported errors:\n${browserErrors.join("\n")}`);

  console.log(`PASS  real-browser interaction (${executablePath})`);
  console.log("PASS  zero external HTTP requests");
  console.log("PASS  desktop and mobile render without horizontal overflow");
  console.log("PASS  complete storybook loads, toggles dark mode, and enables X-Ray borders");
  console.log(`  desktop: ${desktopPreview}`);
  console.log(`  mobile:  ${mobilePreview}`);
  console.log(`  storybook: ${storybookPreview}`);
  console.log(`  storybook X-Ray: ${storybookXrayPreview}`);
  console.log(`  mobile storybook: ${mobileStorybookPreview}`);
} finally {
  await browser.close();
}

