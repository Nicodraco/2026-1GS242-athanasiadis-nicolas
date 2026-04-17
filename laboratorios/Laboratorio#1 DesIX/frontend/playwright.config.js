import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "bun run dev",
      cwd: path.resolve(__dirname, "../backend"),
      url: "http://localhost:4000/api/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run build && npm run preview -- --host=localhost --port=4173",
      cwd: __dirname,
      url: "http://localhost:4173",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
