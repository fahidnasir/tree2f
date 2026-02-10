# tree2f (t2f) 🚀

**Zero-dependency** CLI to manifest ASCII tree structures into physical files and directories instantly.

[![npm version](https://img.shields.io/npm/v/tree2f.svg)](https://www.npmjs.com/package/tree2f)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📦 Installation

```bash
npm install -g tree2f
```

## 🧩 Features

- **Zero-dependency**: No external packages required.
- **Fast**: Parses and creates the tree instantly.
- **Safe**: Validates the tree structure before creation.
- **Flexible**: Supports both file input and raw string input.
- **Portable**: Works on any system with Node.js installed.
- **Smart Parser**: Handles complex ASCII art and indentation.
- **Validation**: Compare your local disk against a tree blueprint.
- **Dry Run**: Preview changes before they happen.

## Usage

```txt
# tree.txt

my-project/
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   └── Input.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   └── About.tsx
│   └── index.tsx
├── public/
│   ├── index.html
│   └── favicon.ico
├── package.json
├── tsconfig.json
└── README.md
```

```bash
t2f create tree.txt --output ./my-app
# or
t2f create tree.txt --output ./my-app --force (if overwrite is needed)
```

## Commands

To make your `README.md` truly "Elite," a command reference table is the best way to show off the flexibility of the tool. Users love being able to see exactly what flags work with what commands at a glance.

Here is the professional **Command Reference** section to add to your `README.md`.

---

## 🕹 Command Reference

| Command    | Shorthand | Description                            | Supported Flags        |
| ---------- | --------- | -------------------------------------- | ---------------------- |
| `create`   | `c`       | Manifests the tree into files/folders. | `-i`, `-o`, `-f`, `-v` |
| `dry-run`  | `dr`      | Previews paths without touching disk.  | `-i`, `-o`             |
| `validate` | `v`       | Checks if local files match the tree.  | `-i`, `-o`             |
| `format`   | `fmt`     | Standardizes messy ASCII tree text.    | `-i`                   |
| `minify`   | `min`     | Flattens tree into a list of paths.    | `-i`                   |

### Flag Details

- `-i, --input`: Source tree (path to `.txt` file or raw string).
- `-o, --output`: Base directory for creation (defaults to `.`).
- `-f, --force`: Overwrite existing files (dangerous!).
- `-v, --verbose`: Detailed step-by-step logging.

---

## 💡 All Command Combinations

### 1. The Scaffolder (`create`)

The most common use case.

```bash
# Basic creation from a file
t2f create -i structure.txt

# Create into a specific subfolder (ignores current directory)
t2f create -i structure.txt -o ./packages/ui-lib

# Force overwrite existing files with verbose feedback
t2f create -i "src/index.ts" -f -v

```

### 2. The Safety Check (`dry-run`)

Always recommended before running `create` on a large tree.

```bash
# See what will happen without doing it
t2f dry-run -i structure.txt

# Preview creation into a specific target
t2f dry-run -i structure.txt --output ./dist

```

### 3. The Auditor (`validate`)

Perfect for CI/CD pipelines to ensure a developer didn't delete a required file.

```bash
# Check if current folder matches the blueprint
t2f validate -i blueprint.txt

# Validate a specific output folder
t2f validate -i blueprint.txt -o ./project-root

```

### 4. The Pipe Helpers (`minify` & `format`)

For power users who want to clean up text or pass paths to other CLI tools.

```bash
# Flatten a complex tree into a list of paths for 'grep'
t2f minify -i messy-tree.txt | grep ".ts"

# Clean up a tree copied from a Slack message or terminal
t2f format -i "src/   index.js"

```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 👨‍💻 Author

**Fahid** - [fahidnasir.com](https://fahidnasir.com)

## 🙏 Acknowledgments

- Thanks to the Node.js community for the amazing tools and libraries.
- Thanks to the open-source community for the inspiration and support.
