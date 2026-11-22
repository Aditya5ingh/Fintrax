import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Reuse only the executable, never an installed server's data directory.
const windowsMongo = "C:/Program Files/MongoDB/Server";
if (!process.env.MONGOMS_SYSTEM_BINARY && existsSync(windowsMongo)) {
  const binary = readdirSync(windowsMongo)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    .map((version) => join(windowsMongo, version, "bin", "mongod.exe"))
    .find(existsSync);
  if (binary) {
    process.env.MONGOMS_SYSTEM_BINARY = binary;
    process.env.MONGOMS_SYSTEM_BINARY_VERSION_CHECK = "false";
  }
}
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", testTimeout: 60000, hookTimeout: 120000 },
});
