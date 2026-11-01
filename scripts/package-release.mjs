#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createWriteStream } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";
import yazl from "yazl";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = path.join(root, "plugins/claude-design");
const skillRoot = path.join(pluginRoot, "skills/claude-design");
const distDir = path.join(root, "dist");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const pluginJson = JSON.parse(
  fs.readFileSync(path.join(pluginRoot, ".claude-plugin/plugin.json"), "utf8"),
);
const version = packageJson.version;
const tag = process.env.RELEASE_TAG || `v${version}`;
const zipMtime = new Date("2026-11-01T00:00:00.000Z");

assert.equal(pluginJson.version, version, "package and plugin versions must match");
assert.equal(tag, `v${version}`, `release tag ${tag} does not match package version ${version}`);

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function walk(directory, options = {}) {
  const files = [];
  const prefixes = options.prefixes || [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".DS_Store" || entry.name === "node_modules" || entry.name === ".git") continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`symlinks are not allowed in release archives: ${absolutePath}`);
    }
    if (entry.isDirectory()) {
      files.push(...walk(absolutePath, options));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  if (!prefixes.length) return files.sort();
  const result = [];
  for (const prefix of prefixes) result.push(...walk(prefix, options));
  return [...new Set(result)].sort();
}

function archiveName(prefix, absolutePath, base) {
  return `${prefix}/${path.relative(base, absolutePath).split(path.sep).join("/")}`;
}

async function writeZip(outputPath, entries) {
  const zip = new yazl.ZipFile();
  const output = createWriteStream(outputPath);
  const completed = pipeline(zip.outputStream, output);

  for (const entry of entries) {
    zip.addFile(entry.file, entry.name, {
      mtime: zipMtime,
      mode: entry.mode ?? 0o100644,
      compress: true,
    });
  }
  zip.end();
  await completed;
}

function readZip(zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, decodeStrings: true }, (openError, zipFile) => {
      if (openError) return reject(openError);
      const entries = [];
      zipFile.on("error", reject);
      zipFile.on("entry", (entry) => {
        if (/\/$/.test(entry.fileName)) {
          zipFile.readEntry();
          return;
        }
        if (
          path.posix.isAbsolute(entry.fileName) ||
          entry.fileName.split("/").includes("..")
        ) {
          reject(new Error(`unsafe ZIP path: ${entry.fileName}`));
          return;
        }
        zipFile.openReadStream(entry, (streamError, stream) => {
          if (streamError) return reject(streamError);
          const hash = crypto.createHash("sha256");
          let bytes = 0;
          stream.on("data", (chunk) => {
            bytes += chunk.length;
            hash.update(chunk);
          });
          stream.on("error", reject);
          stream.on("end", () => {
            entries.push({
              name: entry.fileName,
              bytes,
              sha256: hash.digest("hex"),
            });
            zipFile.readEntry();
          });
        });
      });
      zipFile.on("end", () => resolve(entries.sort((a, b) => a.name.localeCompare(b.name))));
      zipFile.readEntry();
    });
  });
}

async function verifyZip(zipPath, expectedEntries) {
  const actual = await readZip(zipPath);
  const expected = expectedEntries
    .map((entry) => ({
      name: entry.name,
      bytes: fs.statSync(entry.file).size,
      sha256: hashFile(entry.file),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  assert.deepEqual(actual, expected, `ZIP content mismatch: ${path.basename(zipPath)}`);
}

function addCommonLicenseFiles(prefix, base = skillRoot) {
  return [
    { file: path.join(root, "LICENSE"), name: `${prefix}/LICENSE` },
    { file: path.join(root, "NOTICE.md"), name: `${prefix}/NOTICE.md` },
  ].map((entry) => ({ ...entry, base }));
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

const skillEntries = walk(skillRoot).map((file) => ({
  file,
  name: archiveName("claude-design", file, skillRoot),
}));
skillEntries.push(...addCommonLicenseFiles("claude-design"));

const pluginEntries = walk(pluginRoot).map((file) => ({
  file,
  name: archiveName("claude-design", file, pluginRoot),
}));
pluginEntries.push(
  { file: path.join(root, "LICENSE"), name: "claude-design/LICENSE" },
  { file: path.join(root, "NOTICE.md"), name: "claude-design/NOTICE.md" },
);

const uniqueSkillEntries = [...new Map(skillEntries.map((entry) => [entry.name, entry])).values()].sort(
  (a, b) => a.name.localeCompare(b.name),
);
const uniquePluginEntries = [
  ...new Map(pluginEntries.map((entry) => [entry.name, entry])).values(),
].sort((a, b) => a.name.localeCompare(b.name));

const canonicalSkill = path.join(distDir, "claude-design.skill");
const versionedSkill = path.join(distDir, `claude-design-skill-v${version}.skill`);
const canonicalPlugin = path.join(distDir, "claude-design-plugin.zip");
const versionedPlugin = path.join(distDir, `claude-design-plugin-v${version}.zip`);

await writeZip(canonicalSkill, uniqueSkillEntries);
await verifyZip(canonicalSkill, uniqueSkillEntries);
fs.copyFileSync(canonicalSkill, versionedSkill);

await writeZip(canonicalPlugin, uniquePluginEntries);
await verifyZip(canonicalPlugin, uniquePluginEntries);
fs.copyFileSync(canonicalPlugin, versionedPlugin);

const artifactNames = [
  "claude-design.skill",
  `claude-design-skill-v${version}.skill`,
  "claude-design-plugin.zip",
  `claude-design-plugin-v${version}.zip`,
];
const artifacts = artifactNames.map((name) => {
  const filePath = path.join(distDir, name);
  const contents = fs.readFileSync(filePath);
  return {
    name,
    bytes: contents.byteLength,
    sha256: crypto.createHash("sha256").update(contents).digest("hex"),
  };
});

let commit = "working-tree";
try {
  commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
} catch {
  // Packaging outside Git is still supported.
}

const manifest = {
  name: "claude-design",
  version,
  tag,
  commit,
  skillFiles: uniqueSkillEntries.length,
  pluginFiles: uniquePluginEntries.length,
  artifacts,
};
fs.writeFileSync(
  path.join(distDir, "release-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(distDir, "SHA256SUMS"),
  `${artifacts.map((entry) => `${entry.sha256}  ${entry.name}`).join("\n")}\n`,
  "utf8",
);

console.log(`PASS  skill archive: ${uniqueSkillEntries.length} files`);
console.log(`PASS  plugin archive: ${uniquePluginEntries.length} files`);
for (const entry of artifacts) {
  console.log(`  ${entry.name}  ${(entry.bytes / 1024).toFixed(1)} KB  ${entry.sha256}`);
}
console.log(`  ${distDir}`);

