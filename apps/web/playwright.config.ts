import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

// Resolved through Node instead of a hardcoded `node_modules/serve` path: npm hoists
// workspace dependencies to the repo root, while pnpm keeps one per package.
const serveMain = join(
  dirname(createRequire(import.meta.url).resolve("serve/package.json")),
  "build",
  "main.js",
);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    // Existing specs use Portuguese copy; i18n.spec overrides the locale per test.
    locale: "pt-BR",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: `node ${serveMain} out -l ${PORT} --no-clipboard`,
    gracefulShutdown: { signal: "SIGTERM", timeout: 2_000 },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
