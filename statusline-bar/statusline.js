const fs = require("fs");
const path = require("path");
const cp = require("child_process");

function readInput() {
  try {
    const raw = fs.readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function normalizeDir(dir) {
  if (!dir) return "";
  if (/^[A-Za-z]:[\\/]/.test(dir)) return dir;

  const msysMatch = dir.match(/^\/([A-Za-z])\/(.*)$/);
  if (msysMatch) {
    return `${msysMatch[1].toUpperCase()}:/${msysMatch[2]}`;
  }

  return dir;
}

function getBranch(cwd) {
  if (!cwd) return "-";

  try {
    const branch = cp
      .execSync("git branch --show-current", {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      })
      .trim();

    return branch || "detached";
  } catch {
    return "-";
  }
}

function color(code, text) {
  return `\x1b[${code}m${text}\x1b[0m`;
}

const input = readInput();
const projectDir = normalizeDir(
  input.workspace?.project_dir ||
    input.workspace?.current_dir ||
    input.cwd ||
    ""
);
const model = input.model?.display_name || input.model?.id || "unknown";
const projectName = projectDir ? path.basename(projectDir) : "-";
const branch = getBranch(projectDir);
const used = input.context_window?.used_percentage;
const ctx = Number.isFinite(used) ? `ctx ${Math.round(used)}%` : "ctx --";

let ctxColor = "32";
if (Number.isFinite(used) && used >= 70) {
  ctxColor = "31";
} else if (Number.isFinite(used) && used >= 40) {
  ctxColor = "33";
}

const modelText = color("36", model);
const projectText = color("94", projectName);
const branchText = color("33", `git: ${branch}`);
const ctxText = color(ctxColor, ctx);
const dirText = color("90", projectDir || "-");

process.stdout.write(
  `${modelText} | ${projectText} | ${branchText} | ${ctxText}\n${dirText}`
);
