#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

/**
 * tree2f - Tree to Filesystem Manifest Tool
 * A zero-dependency utility for scaffolding projects from ASCII trees.
 */

// --- UTILITIES & LOGGER ---
const Log = {
  info: (msg) => console.log(`\x1b[36mℹ\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m✔\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`),
  error: (msg) => console.error(`\x1b[31m✖\x1b[0m ${msg}`),
  step: (msg) => console.log(`  \x1b[90m↳ ${msg}\x1b[0m`),
  header: (msg) => console.log(`\n\x1b[1m\x1b[4m${msg}\x1b[0m`),
};

// --- ARGUMENT PARSER ---
const rawArgs = process.argv.slice(2);
const command = rawArgs[0];
const flags = {
  input: getFlagValue(["--input", "-i"]),
  output: getFlagValue(["--output", "-o"]) || ".",
  force: rawArgs.includes("--force") || rawArgs.includes("-f"),
  verbose: rawArgs.includes("--verbose") || rawArgs.includes("-v"),
};

function getFlagValue(aliases) {
  for (const alias of aliases) {
    const idx = rawArgs.indexOf(alias);
    if (idx !== -1 && rawArgs[idx + 1]) return rawArgs[idx + 1];
  }
  return null;
}

// --- CORE ENGINE ---
function parseTree(text, baseDir) {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const results = [];
  const stack = [];

  lines.forEach((line) => {
    const indentMatch = line.match(/^[\s│├──└──]+/);
    const depth = indentMatch ? indentMatch[0].length : 0;
    const name = line.replace(/[│├──└──]/g, "").trim();

    if (!name) return;

    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    const parentPath =
      stack.length > 0 ? stack[stack.length - 1].path : baseDir;
    const currentPath = path.resolve(parentPath, name);
    const isFile = !!path.extname(name);

    const node = { name, path: currentPath, depth, isFile };
    results.push(node);
    stack.push(node);
  });
  return results;
}

// --- COMMAND HANDLERS ---
async function handleCreate() {
  const source = flags.input || rawArgs[1];
  if (!source)
    throw new Error("Missing input tree. Use -i <file> or provide a string.");

  const rawContent = fs.existsSync(source)
    ? fs.readFileSync(source, "utf8")
    : source;
  const nodes = parseTree(rawContent, flags.output);

  Log.header(`🚀 Manifesting Structure into: ${path.resolve(flags.output)}`);
  let createdCount = 0;
  let skippedCount = 0;

  nodes.forEach((node) => {
    if (node.isFile) {
      fs.mkdirSync(path.dirname(node.path), { recursive: true });
      if (fs.existsSync(node.path) && !flags.force) {
        if (flags.verbose) Log.warn(`Skipped (Exists): ${node.name}`);
        skippedCount++;
      } else {
        fs.writeFileSync(node.path, "");
        Log.step(`Created File: ${node.name}`);
        createdCount++;
      }
    } else {
      fs.mkdirSync(node.path, { recursive: true });
      if (flags.verbose) Log.step(`Created Dir:  ${node.name}`);
      createdCount++;
    }
  });

  Log.success(
    `Done! Created ${createdCount} items. (Skipped ${skippedCount} existing).`,
  );
}

async function handleValidate() {
  const source = flags.input || rawArgs[1];
  const rawContent = fs.existsSync(source)
    ? fs.readFileSync(source, "utf8")
    : source;
  const nodes = parseTree(rawContent, flags.output);

  Log.header("🔍 Validating Integrity...");
  const missing = nodes.filter((n) => !fs.existsSync(n.path));

  if (missing.length === 0) {
    Log.success("File system is 100% in sync with the tree blueprint.");
  } else {
    Log.error(
      `Validation Failed. ${missing.length} items are missing from the disk:`,
    );
    missing.forEach((m) => Log.step(m.path));
    process.exit(1);
  }
}

// --- MAIN EXECUTION ---
async function main() {
  try {
    switch (command) {
      case "create":
        await handleCreate();
        break;
      case "validate":
        await handleValidate();
        break;
      case "dry-run":
        const nodes = parseTree(flags.input || rawArgs[1], flags.output);
        Log.header("🧪 Dry Run: Previewing paths...");
        nodes.forEach((n) =>
          console.log(`  ${n.isFile ? "📄" : "📁"} ${n.path}`),
        );
        break;
      default:
        console.log(`
\x1b[1mtree2f\x1b[0m - Turn ASCII trees into real folders & files.

\x1b[1mUsage:\x1b[0m
  tree2f create <input> [flags]
  tree2f validate <input> [flags]

\x1b[1mFlags:\x1b[0m
  -i, --input    File path containing the tree (or raw string)
  -o, --output   Target directory (default: current)
  -f, --force    Overwrite existing files
  -v, --verbose  Show detailed step-by-step progress

\x1b[1mExample:\x1b[0m
  tree2f create tree.txt --output ./my-app --force
                `);
    }
  } catch (err) {
    Log.error(err.message);
    process.exit(1);
  }
}

main();
