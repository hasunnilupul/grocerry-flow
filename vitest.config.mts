import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// `server-only` throws unless resolved under React's "react-server" condition,
// so server modules need it stubbed to be importable from tests.
const serverOnlyAlias = {
  "server-only": fileURLToPath(
    new URL("./test/server-only-stub.ts", import.meta.url),
  ),
};

const INTEGRATION = "**/*.integration.test.ts";

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { tsconfigPaths: true, alias: serverOnlyAlias },
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: ["**/*.test.{ts,tsx}"],
          exclude: [INTEGRATION, "node_modules/**", ".next/**"],
        },
      },
      {
        resolve: { tsconfigPaths: true, alias: serverOnlyAlias },
        test: {
          name: "integration",
          environment: "node",
          include: [INTEGRATION],
          exclude: ["node_modules/**", ".next/**"],
          // These files share one database and truncate between tests, so
          // they must run one at a time, not merely in one process.
          fileParallelism: false,
        },
      },
    ],
  },
});
