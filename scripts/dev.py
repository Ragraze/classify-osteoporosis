"""Start the local Django API and Vite frontend together."""

import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent.parent


def main():
    python = (
        ROOT / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    )
    npm = shutil.which("npm")
    if not python.is_file() or not npm or not (ROOT / "frontend/node_modules").is_dir():
        print(
            "Siapkan .venv dan jalankan npm ci di frontend terlebih dahulu. Lihat README.md.",
            file=sys.stderr,
        )
        return 1
    env = {**os.environ, "PYTHONUNBUFFERED": "1"}
    processes = []

    def stop(*_):
        for process in processes:
            if process.poll() is None:
                process.terminate()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    try:
        processes.append(
            subprocess.Popen(
                [
                    str(python),
                    "manage.py",
                    "runserver",
                    "127.0.0.1:5000",
                ],
                cwd=ROOT,
                env=env,
            )
        )
        processes.append(
            subprocess.Popen(
                [npm, "run", "dev", "--", "--port", "5173", "--strictPort"],
                cwd=ROOT / "frontend",
                env=env,
            )
        )
        print(
            "Dashboard: http://127.0.0.1:5173\nAPI: http://127.0.0.1:5000", flush=True
        )
        while all(process.poll() is None for process in processes):
            time.sleep(0.3)
        return next(
            (process.returncode for process in processes if process.returncode), 0
        )
    finally:
        stop()
        for process in processes:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == "__main__":
    sys.exit(main())
