import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const python = join(
  root,
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} exited with ${result.signal || result.status}.`,
    );
  }
}

function setup() {
  const systemPython = process.platform === "win32" ? "python" : "python3";
  if (!existsSync(python)) {
    const ensurepip = spawnSync(systemPython, ["-c", "import ensurepip"], {
      stdio: "ignore",
    });
    if (ensurepip.error) throw ensurepip.error;
    const args = ["-m", "venv"];
    if (ensurepip.status !== 0) args.push("--without-pip");
    run(systemPython, [...args, ".venv"]);
  }
  const pip = spawnSync(python, ["-m", "pip", "--version"], {
    stdio: "ignore",
  });
  if (pip.error) throw pip.error;
  if (pip.status !== 0) {
    run(systemPython, ["-m", "pip", "--python", python, "install", "pip"]);
  }
  run(python, [
    "-m",
    "pip",
    "install",
    "torch",
    "torchvision",
    "--index-url",
    "https://download.pytorch.org/whl/cpu",
  ]);
  run(python, ["-m", "pip", "install", "-r", "requirements-dev.txt"]);
  if (!process.env.npm_execpath) {
    throw new Error("Run setup with npm install or npm run setup.");
  }
  run(process.execPath, [
    process.env.npm_execpath,
    "--prefix",
    "frontend",
    "ci",
  ]);
  run(python, ["scripts/download_models.py", "--model", "all"]);
  console.log("Setup complete. Start the dashboard with npm run dev.");
}

try {
  if (process.argv[2] === "setup") {
    setup();
  } else if (process.argv[2] === "dev") {
    if (
      !existsSync(python) ||
      !existsSync(join(root, "frontend/node_modules"))
    ) {
      throw new Error("Dependencies are missing. Run npm install first.");
    }
    run(python, ["scripts/dev.py"]);
  } else {
    throw new Error("Use npm install, npm run setup, or npm run dev.");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
