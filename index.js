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

function getFlagValue(aliases) {
  for (const alias of aliases) {
    const idx = rawArgs.indexOf(alias);
    if (idx !== -1 && rawArgs[idx + 1] && !rawArgs[idx + 1].startsWith("-")) {
      return rawArgs[idx + 1];
    }
  }
  return null;
}

const flags = {
  input: getFlagValue(["--input", "-i"]),
  output: getFlagValue(["--output", "-o"]) || ".",
  force: rawArgs.includes("--force") || rawArgs.includes("-f"),
  verbose: rawArgs.includes("--verbose") || rawArgs.includes("-v"),
};

// --- CORE PARSER ---
/**
 * Parses ASCII tree text into a node array.
 * Uses a stack-based approach and detects indentation units.
 */
function parseTree(text, baseDir) {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const results = [];
  const stack = [];

  // 1. Detect Indentation Unit (2, 4, etc.)
  let indentUnit = 0;
  lines.forEach((line) => {
    const match = line.match(/^[\s│]+/);
    if (match && match[0].length > 0) {
      if (indentUnit === 0 || match[0].length < indentUnit)
        indentUnit = match[0].length;
    }
  });
  indentUnit = indentUnit || 2;

  lines.forEach((line) => {
    // Regex matches whitespace and box-drawing characters: │, ├, ─, └
    const indentMatch = line.match(/^[\s│├──└──]+/);
    const rawDepth = indentMatch ? indentMatch[0].length : 0;
    const level = Math.round(rawDepth / indentUnit);

    const rawName = line.replace(/[│├──└──]/g, "").trim();
    if (!rawName) return;

    // Pop stack until we find the parent level
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    const isDir = rawName.endsWith("/");
    const cleanName = isDir ? rawName.slice(0, -1) : rawName;
    const parentPath =
      stack.length > 0 ? stack[stack.length - 1].path : baseDir;
    const currentPath = path.resolve(parentPath, cleanName);

    const node = {
      name: cleanName,
      path: currentPath,
      level,
      isFile: !isDir,
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
        if (flags.verbose) Log.step(`Dir: ${n.name}/`);
      }
    });
    Log.success("Creation complete.");
  },

  "dry-run": async () => {
    const nodes = parseTree(await getInput(), flags.output);
    Log.header("🧪 Dry Run Preview:");
    nodes.forEach((n) => {
      console.log(`  ${n.isFile ? "📄" : "📁"} ${n.path}`);
    });
  },

  validate: async () => {
    const nodes = parseTree(await getInput(), flags.output);
    Log.header("🔍 Validating Integrity...");
    const missing = nodes.filter((n) => !fs.existsSync(n.path));
    if (missing.length === 0) {
      Log.success("All items present.");
    } else {
      Log.error(`Missing ${missing.length} items:`);
      missing.forEach((m) => Log.step(m.path));
      process.exit(1);
    }
  },

  minify: async () => {
    const nodes = parseTree(await getInput(), flags.output);
    nodes.forEach((n) => {
      console.log(n.path);
    });
  },

  format: async () => {
    const nodes = parseTree(await getInput(), flags.output);
    nodes.forEach((n) => {
      const prefix = "│   ".repeat(n.level) + (n.level > 0 ? "├── " : "");
      console.log(`${prefix}${n.name}${n.isFile ? "" : "/"}`);
    });
  },
};

/**
 * Intelligent input resolver. Finds the positional arg even if flags come first.
 */
async function getInput() {
  if (flags.input) {
    return fs.readFileSync(flags.input, "utf8");
  }

  // Find first arg that isn't a command or a flag value
  const knownFlagsWithValues = ["--input", "-i", "--output", "-o"];
  let source = null;

  for (let i = 1; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    const prevArg = rawArgs[i - 1];
    if (arg.startsWith("-")) continue;
    if (knownFlagsWithValues.includes(prevArg)) continue;
    source = arg;
    break;
  }

  if (!source)
    throw new Error("No input provided. Use -i <file> or a tree string.");

  // Check if it looks like a file path but is missing
  const looksLikePath =
    source.includes(".") || source.includes("/") || source.includes("\\");
  if (looksLikePath && !fs.existsSync(source)) {
    throw new Error(`File not found: ${source}`);
  }

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
    if (Commands[cmd]) {
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
                `);
    }
  } catch (e) {
    Log.error(e.message);
    process.exit(1); // Ensure CI/CD fails on error
  }
}

main();
