#!/usr/bin/env node

const fs = require("fs");

function findInputPath(args) {
  return args.find((arg) => fs.existsSync(arg) && fs.statSync(arg).isFile());
}

function findIndent(args) {
  const yamlArg = args.find((arg) => arg.includes("defaultIndent"));
  if (!yamlArg) {
    return "    ";
  }

  const match = yamlArg.match(/defaultIndent:\s*'([^']*)'/);
  if (!match) {
    return "    ";
  }

  return match[1].replace(/\\t/g, "\t") || "    ";
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function formatLatex(source, indentUnit) {
  let level = 0;
  let rawEnv = null;
  const rawEnvironments = new Set(["lstlisting", "verbatim", "Verbatim", "minted"]);

  return source
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => {
      const trimmedRight = line.replace(/[ \t]+$/g, "");
      const trimmed = trimmedRight.trimStart();

      if (trimmed === "") {
        return "";
      }

      if (rawEnv) {
        if (trimmed.match(new RegExp(`^\\\\end\\{${rawEnv}\\}`))) {
          rawEnv = null;
        }

        return trimmedRight;
      }

      const rawBegin = trimmed.match(/^\\begin\{([^}]+)\}/);
      if (rawBegin && rawEnvironments.has(rawBegin[1])) {
        rawEnv = rawBegin[1];
        return `${indentUnit.repeat(level)}${trimmed}`;
      }

      const preClose =
        countMatches(trimmed, /^\\end\{/g) +
        countMatches(trimmed, /^\\fi\b/g) +
        countMatches(trimmed, /^\\else\b/g);

      level = Math.max(0, level - preClose);

      const formatted = `${indentUnit.repeat(level)}${trimmed}`;

      const begins = countMatches(trimmed, /\\begin\{/g);
      const ends = countMatches(trimmed, /\\end\{/g);
      const ifs = countMatches(trimmed, /\\if(?!thenelse\b)[a-zA-Z]*\b/g);
      const fis = countMatches(trimmed, /\\fi\b/g);
      const elses = countMatches(trimmed, /\\else\b/g);

      level = Math.max(0, level + begins - ends + ifs - fis);
      if (elses > 0) {
        level += elses;
      }

      return formatted;
    })
    .join("\n");
}

const inputPath = findInputPath(process.argv.slice(2));
if (!inputPath) {
  console.error("latexindent-lite: no input file path found");
  process.exit(2);
}

const source = fs.readFileSync(inputPath, "utf8");
process.stdout.write(formatLatex(source, findIndent(process.argv.slice(2))));
