import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
let binary = "mailpit";
if (process.platform === "win32") {
  binary = resolve(".tools/mailpit/mailpit.exe");
  if (!existsSync(binary)) {
    if (!existsSync(".tools/mailpit/mailpit.zip"))
      await import("./setup-mailpit.mjs");
    const extracted = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "Expand-Archive -LiteralPath '.tools/mailpit/mailpit.zip' -DestinationPath '.tools/mailpit' -Force",
      ],
      { stdio: "inherit", windowsHide: true },
    );
    if (extracted.status !== 0) throw new Error("Unable to extract Mailpit");
  }
}
const child = spawn(
  binary,
  [
    "--smtp",
    "127.0.0.1:1025",
    "--listen",
    "127.0.0.1:8025",
    "--smtp-auth-accept-any",
    "--smtp-auth-allow-insecure",
  ],
  { stdio: "inherit", windowsHide: true },
);
child.on("error", () => {
  console.error(
    "Unable to start Mailpit. Install it or check the configured local ports.",
  );
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code || 0;
});
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
