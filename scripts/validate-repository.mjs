#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const checks = [];
function check(name, fn) {
  fn();
  checks.push(name);
}

const marketplacePath = ".claude-plugin/marketplace.json";
const pluginPath = "plugins/claude-design/.claude-plugin/plugin.json";
const skillDir = "plugins/claude-design/skills/claude-design";
const skillPath = `${skillDir}/SKILL.md`;
const sourceDir = `${skillDir}/references/upstream/code-examples`;
const upstreamDir = `${skillDir}/references/upstream`;
const upstreamManifestPath = `${skillDir}/references/upstream-manifest.json`;
const demoPath = `${skillDir}/assets/cds-offline-demo.html`;
const storybookPath = `${skillDir}/assets/claude-components-storybook.html`;

check("marketplace manifest is valid", () => {
  const marketplace = readJson(marketplacePath);
  assert.equal(marketplace.name, "claude-design");
  assert.ok(Array.isArray(marketplace.plugins) && marketplace.plugins.length >= 1);
  const plugin = marketplace.plugins.find((entry) => entry.name === "claude-design");
  assert.ok(plugin, "marketplace must register claude-design");
  assert.equal(plugin.source, "./plugins/claude-design");
  assert.ok(fs.statSync(path.join(root, plugin.source)).isDirectory());
});

check("plugin manifest is valid and portable", () => {
  const plugin = readJson(pluginPath);
  assert.equal(plugin.name, "claude-design");
  assert.match(plugin.version, /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/);
  assert.equal(plugin.license, "MIT");
  assert.equal(plugin.metadata.componentCount, 33);
  assert.equal(plugin.repository, "https://github.com/asaki9385/claude-design");
});

check("Skill frontmatter is valid", () => {
  const skill = read(skillPath);
  const match = skill.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, "SKILL.md must start with YAML frontmatter");
  assert.match(match[1], /^name: claude-design$/m);
  assert.match(match[1], /^description: .{80,}$/m);
  assert.match(match[1], /^license: MIT$/m);
});

check("skill does not depend on a local absolute path", () => {
  const skill = read(skillPath);
  assert.doesNotMatch(skill, /\/Users\/[^/\s]+\//);
  assert.doesNotMatch(skill, /file:\/\/\/Users\//);
});

check("required references and tooling are present", () => {
  const required = [
    "references/design-tokens.md",
    "references/components.md",
    "references/motion.md",
    "references/invariants.md",
    "references/build-single-file.md",
    "references/compat.css",
    "references/upstream/README.md",
    "references/upstream/docs/README.md",
    "references/upstream/docs/v1/Claude Design System (CDS).full.md",
    "references/upstream/docs/v2/Claude-Desktop-2.0-全量分析.full.md",
    "references/upstream/docs/claude-components-storybook.html",
    "references/upstream/src/index.ts",
    "scripts/build-single-file.mjs",
    "scripts/verify-bundle.mjs",
    "scripts/tailwind.preset.js",
    "assets/cds-offline-demo.html",
    "assets/claude-components-storybook.html",
  ];
  for (const relativePath of required) {
    assert.ok(exists(`${skillDir}/${relativePath}`), `missing ${relativePath}`);
  }
});

check("component inventory contains 33 modules", () => {
  const modules = fs
    .readdirSync(path.join(root, sourceDir), { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name));
  assert.equal(modules.length, 33, `expected 33 TS/TSX modules, got ${modules.length}`);
  assert.ok(modules.some((entry) => entry.name === "CdsButton.tsx"));
  assert.ok(modules.some((entry) => entry.name === "ChatComposer.tsx"));
  assert.ok(modules.some((entry) => entry.name === "StreamingDiffViewer.tsx"));
});

check("complete v1 and v2 documentation is present", () => {
  const docsDir = path.join(root, upstreamDir, "docs");
  const markdown = [];
  for (const version of ["v1", "v2"]) {
    const versionDir = path.join(docsDir, version);
    const files = fs.readdirSync(versionDir).filter((name) => name.endsWith(".md"));
    assert.ok(files.length >= 8, `${version} should contain at least 8 Markdown files`);
    markdown.push(
      ...files.map((name) => fs.readFileSync(path.join(versionDir, name), "utf8")),
    );
  }
  const lineCount = markdown.reduce((sum, text) => sum + text.split("\n").length - 1, 0);
  assert.ok(lineCount >= 10_000, `expected at least 10000 documentation lines, got ${lineCount}`);
});

check("vendored upstream snapshot is byte-for-byte complete", () => {
  const manifest = readJson(upstreamManifestPath);
  assert.equal(manifest.source, "Caho1/open-claude-ui");
  assert.equal(manifest.fileCount, manifest.files.length);

  const listed = new Map(manifest.files.map((entry) => [entry.path, entry]));
  const actual = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (entry.isFile()) {
        actual.push(path.relative(path.join(root, upstreamDir), absolutePath).split(path.sep).join("/"));
      }
    }
  }
  walk(path.join(root, upstreamDir));

  assert.deepEqual(actual.sort(), [...listed.keys()].sort(), "upstream file list differs from manifest");
  for (const relativePath of actual) {
    const expected = listed.get(relativePath);
    const contents = fs.readFileSync(path.join(root, upstreamDir, relativePath));
    const digest = crypto.createHash("sha256").update(contents).digest("hex");
    assert.equal(contents.byteLength, expected.bytes, `size mismatch: ${relativePath}`);
    assert.equal(digest, expected.sha256, `hash mismatch: ${relativePath}`);
  }
});

check("offline demo is self-contained", () => {
  const html = read(demoPath);
  assert.ok(html.length > 300_000, "offline demo is unexpectedly small");
  assert.match(html, /CDS 离线单文件验证/);
  assert.match(html, /["']data-cds["']\s*:\s*["']SegmentedControl["']/);
  assert.match(html, /["']data-cds["']\s*:\s*["']ThinkingAccordion["']/);
  assert.doesNotMatch(html, /<(?:script|link)\b[^>]*(?:src|href)=["']https?:\/\//i);
  assert.doesNotMatch(html, /@tailwind\s+(?:base|components|utilities)/);
});

check("complete storybook is available offline", () => {
  const html = read(storybookPath);
  assert.ok(html.length > 300_000, "offline storybook is unexpectedly small");
  assert.match(html, /Claude Design System \(CDS 2\.0\)/);
  assert.match(html, /v2-lab/);
  assert.match(html, /xray-active/);
  assert.doesNotMatch(html, /<(?:script|link)\b[^>]*(?:src|href)=["']https?:\/\//i);
  assert.doesNotMatch(html, /<(?:script|link)\b[^>]*(?:src|href)=["']\/\//i);
  assert.doesNotMatch(html, /@tailwind\s+(?:base|components|utilities)/);
});

check("repository does not contain machine metadata", () => {
  const forbidden = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolutePath);
      if (entry.name === ".DS_Store") forbidden.push(path.relative(root, absolutePath));
    }
  }
  walk(root);
  assert.deepEqual(forbidden, []);
});

console.log(`PASS  ${checks.length} repository checks`);
for (const name of checks) console.log(`  - ${name}`);

