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
      const prefix =
        n.depth === 0
          ? ""
          : "│   ".repeat(Math.max(0, n.depth / 4 - 1)) + "├── ";
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
      console.log(
        `tree2f (t2f) - Usage: t2f <cmd> [flags]\nCommands: create(c), validate(v), dry-run(dr), minify(min), format(fmt)`,
      );
    }
  } catch (e) {
    Log.error(e.message);
  }
}

main();
