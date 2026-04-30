/* eslint-disable */
// Simple build: clean dist/, copy www/ → dist/, do basic validation.
// Run: npm run build

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "www");
const OUT = path.join(ROOT, "dist");

function rmDir(p) {
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function listFiles(dir) {
  const out = [];
  function walk(p, rel) {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const sub = path.join(p, e.name);
      const r = rel ? rel + "/" + e.name : e.name;
      if (e.isDirectory()) walk(sub, r);
      else out.push({ rel: r, size: fs.statSync(sub).size });
    }
  }
  walk(dir, "");
  return out;
}

function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(2) + " MB";
}

function main() {
  console.log("LabGuide build");
  console.log("  src:", SRC);
  console.log("  out:", OUT);

  if (!fs.existsSync(SRC)) {
    console.error("ERROR: source folder not found:", SRC);
    process.exit(1);
  }

  const indexPath = path.join(SRC, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error("ERROR: www/index.html not found");
    process.exit(1);
  }

  const indexBuf = fs.readFileSync(indexPath, "utf8");
  if (!/<\/html>\s*$/i.test(indexBuf.trim())) {
    console.error("ERROR: www/index.html does not end with </html> (truncated?)");
    process.exit(1);
  }
  if (!indexBuf.includes("appScreens")) {
    console.error("ERROR: www/index.html missing #appScreens (corrupt?)");
    process.exit(1);
  }

  console.log("  index.html OK (" + fmtBytes(indexBuf.length) + ")");

  console.log("Cleaning dist/ ...");
  rmDir(OUT);

  console.log("Copying www/ → dist/ ...");
  copyDir(SRC, OUT);

  const files = listFiles(OUT);
  const total = files.reduce((a, b) => a + b.size, 0);
  console.log("Copied " + files.length + " files, total " + fmtBytes(total));

  console.log("\nBuild complete. Artifact: dist/");
  console.log("Next:");
  console.log("  - Local preview:   npm run preview");
  console.log("  - Sync Android:    npm run sync");
}

try {
  main();
} catch (err) {
  console.error("BUILD FAILED:", err && err.stack ? err.stack : err);
  process.exit(1);
}
