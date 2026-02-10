#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

// --- LOGGER ---
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
const cmdInput = rawArgs[0];

const flags = {
  input: getFlagValue(["--input", "-i"]),
  output: getFlagValue(["--output", "-o"]) || ".",
  force: rawArgs.includes("--force") || rawArgs.includes("-f"),
  verbose: rawArgs.includes("--verbose") || rawArgs.includes("-v"),
};

function getFlagValue(aliases) {
  for (const alias of aliases) {
    const idx = rawArgs.indexOf(alias);
    if (idx !== -1 && rawArgs[idx + 1] && !rawArgs[idx + 1].startsWith("-")) {
      return rawArgs[idx + 1];
    }
  }
  return null;
}

// --- CORE PARSER ---
function parseTree(text, baseDir) {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const results = [];
  const stack = [];

  // Determine indentation scale automatically (minimum non-zero indentation)
  let indentUnit = 0;
  lines.forEach((line) => {
    const match = line.match(/^[\s│]+/);
    if (match && match[0].length > 0) {
      if (indentUnit === 0 || match[0].length < indentUnit)
        indentUnit = match[0].length;
    }
  });
  indentUnit = indentUnit || 2; // Default to 2 if none found

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

    // Improved File Detection: Check if it's NOT a directory (ends with /)
    // or has an extension
    const isFile =
      !name.endsWith("/") && (!!path.extname(name) || name.includes("."));

    const node = {
      name: name.replace(/\/$/, ""),
      path: currentPath,
      depth,
      isFile,
    };
    results.push(node);
    stack.push(node);
  });
  return results;
}

// --- COMMAND HANDLERS ---
const Commands = {
  create: async () => {
    const content = await getInput();
    const nodes = parseTree(content, flags.output);
    Log.header(`🚀 Manifesting Structure: ${path.resolve(flags.output)}`);

    nodes.forEach((n) => {
      if (n.isFile) {
        fs.mkdirSync(path.dirname(n.path), { recursive: true });
        if (fs.existsSync(n.path) && !flags.force) {
          if (flags.verbose) Log.warn(`Skipped: ${n.name}`);
        } else {
          fs.writeFileSync(n.path, "");
          Log.step(`Created: ${n.name}`);
        }
      } else {
        fs.mkdirSync(n.path, { recursive: true });
        if (flags.verbose) Log.step(`Dir: ${n.name}`);
      }
    });
    Log.success("Creation complete.");
  },

  validate: async () => {
    const nodes = parseTree(await getInput(), flags.output);
    Log.header("🔍 Validating Integrity...");
    const missing = nodes.filter((n) => !fs.existsSync(n.path));
    if (missing.length === 0) Log.success("All items present.");
    else {
      Log.error(`Missing ${missing.length} items:`);
      missing.forEach((m) => Log.step(m.path));
      process.exit(1);
    }
  },

  minify: async () => {
    const nodes = parseTree(await getInput(), flags.output);
    nodes.forEach((n) => console.log(n.path));
  },

  format: async () => {
    const nodes = parseTree(await getInput(), flags.output);
    nodes.forEach((n) => {
      // Logic to recreate visual tree regardless of input messy spacing
      const indent = "│   ".repeat(
        Math.max(0, nodes.filter((p) => n.path.startsWith(p.path)).length - 2),
      );
      const prefix =
        n.path === path.resolve(flags.output, n.name) ? "" : indent + "├── ";
      console.log(`${prefix}${n.name}`);
    });
  },
};

async function getInput() {
  const source = flags.input || rawArgs[1];
  if (!source)
    throw new Error("No input provided. Use -i <file> or a tree string.");
  return fs.existsSync(source) ? fs.readFileSync(source, "utf8") : source;
}

// --- EXECUTION & SHORTHANDS ---
const aliasMap = {
  c: "create",
  create: "create",
  v: "validate",
  validate: "validate",
  dr: "dry-run",
  "dry-run": "dry-run",
  min: "minify",
  minify: "minify",
  fmt: "format",
  format: "format",
};

async function main() {
  const cmd = aliasMap[cmdInput];
  try {
    if (cmd === "dry-run") {
      const nodes = parseTree(await getInput(), flags.output);
      Log.header("🧪 Dry Run Preview:");
      nodes.forEach((n) =>
        console.log(`  ${n.isFile ? "📄" : "📁"} ${n.path}`),
      );
    } else if (Commands[cmd]) {
      await Commands[cmd]();
    } else {
      console.log(`
\x1b[1mtree2f\x1b[0m - Turn ASCII trees into real folders & files.

\x1b[1mUsage:\x1b[0m
  tree2f create <input> [flags]
  tree2f dry-run <input> [flags]
  tree2f validate <input> [flags]
  tree2f minify <input> [flags]
  tree2f format <input> [flags]

\x1b[1mFlags:\x1b[0m
  -i, --input    File path containing the tree (or raw string)
  -o, --output   Target directory (default: current)
  -f, --force    Overwrite existing files
  -v, --verbose  Show detailed step-by-step progress

\x1b[1mExample:\x1b[0m
  tree2f create tree.txt --output ./my-app --force
                `);
    }
  } catch (e) {
    Log.error(e.message);
  }
}

main();
