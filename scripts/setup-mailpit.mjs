import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
function download(url) {
  return execFileSync(
    process.platform === "win32" ? "curl.exe" : "curl",
    [
      "--fail",
      "--location",
      "--silent",
      "--show-error",
      "--connect-timeout",
      "15",
      "--max-time",
      "120",
      url,
    ],
    { maxBuffer: 100 * 1024 * 1024, windowsHide: true },
  );
}
const release = JSON.parse(
  download(
    "https://api.github.com/repos/axllent/mailpit/releases/latest",
  ).toString(),
);
const asset = release.assets.find(
  (a) => a.name === "mailpit-windows-amd64.zip",
);
if (!asset) throw new Error("Windows Mailpit release not found");
console.log(
  `Downloading Mailpit ${release.tag_name} from the official release.`,
);
await mkdir(".tools/mailpit", { recursive: true });
// Independent ranges avoid losing a whole archive when a slow connection times out.
const chunkSize = Math.ceil(asset.size / 4);
const chunks = await Promise.allSettled(
  Array.from({ length: 4 }, async (_, index) => {
    const start = index * chunkSize,
      end = Math.min(asset.size - 1, start + chunkSize - 1);
    const path = `.tools/mailpit/download-part-${index}`;
    await new Promise((resolve, reject) => {
      const child = spawn(
        process.platform === "win32" ? "curl.exe" : "curl",
        [
          "--fail",
          "--location",
          "--silent",
          "--show-error",
          "--connect-timeout",
          "15",
          "--max-time",
          "300",
          "--range",
          `${start}-${end}`,
          "--output",
          path,
          asset.browser_download_url,
        ],
        { stdio: ["ignore", "ignore", "inherit"], windowsHide: true },
      );
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Mailpit download part ${index + 1} failed`)),
      );
    });
    const bytes = await readFile(path);
    if (bytes.length !== end - start + 1)
      throw new Error("Unexpected download length");
    console.log(`Mailpit download part ${index + 1}/4 complete.`);
    return bytes;
  }),
);
for (const chunk of chunks) if (chunk.status === "rejected") throw chunk.reason;
const archive = Buffer.concat(chunks.map((chunk) => chunk.value));
let expected = asset.digest?.replace(/^sha256:/, "");
if (!expected) {
  const checksums = release.assets.find((a) => /checksums/i.test(a.name));
  if (!checksums) throw new Error("No published checksum available");
  const text = download(checksums.browser_download_url).toString();
  expected = text
    .split("\n")
    .find((line) => line.trim().endsWith(asset.name))
    ?.split(/\s+/)[0];
}
if (
  !expected ||
  createHash("sha256").update(archive).digest("hex") !== expected
)
  throw new Error("Mailpit checksum verification failed");
await mkdir(".tools/mailpit", { recursive: true });
await writeFile(".tools/mailpit/mailpit.zip", archive);
console.log(`Downloaded and verified Mailpit ${release.tag_name}.`);
