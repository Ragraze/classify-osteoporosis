import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://127.0.0.1:5001",
    headless: true,
    trace: "retain-on-failure",
  },
  reporter: "list",
  webServer: {
    command: ".venv/bin/python -m scripts.test_server",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:5001/api/health",
    timeout: 30000,
    reuseExistingServer: false,
  },
});
