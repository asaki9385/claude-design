#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const upstreamDir = path.join(
  root,
  "plugins/claude-design/skills/claude-design/references/upstream",
);
const manifestPath = path.join(
  root,
  "plugins/claude-design/skills/claude-design/references/upstream-manifest.json",
);

function walk(directory) {
  const entries = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      entries.push(...walk(absolutePath));
    } else if (entry.isFile()) {
      const relativePath = path.relative(upstreamDir, absolutePath).split(path.sep).join("/");
      const contents = fs.readFileSync(absolutePath);
      entries.push({
        path: relativePath,
        bytes: contents.byteLength,
        sha256: crypto.createHash("sha256").update(contents).digest("hex"),
      });
    }
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

const files = walk(upstreamDir);
const packageJson = JSON.parse(fs.readFileSync(path.join(upstreamDir, "package.json"), "utf8"));
const manifest = {
  source: "Caho1/open-claude-ui",
  packageVersion: packageJson.version,
  snapshot: "local source archive supplied for claude-design",
  fileCount: files.length,
  totalBytes: files.reduce((sum, entry) => sum + entry.bytes, 0),
  files,
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`PASS  upstream manifest: ${files.length} files, ${manifest.totalBytes} bytes`);
console.log(`  ${manifestPath}`);

