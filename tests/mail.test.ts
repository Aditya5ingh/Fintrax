import { it, expect, vi } from "vitest";
import { createServer } from "node:net";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { sendReset } from "@/lib/mail";

it("delivers a recovery link through the configured SMTP transport", async () => {
  let message = "";
  const server = createServer((socket) => {
    let input = "";
    let inMessage = false;
    socket.write("220 localhost SMTP ready\r\n");
    socket.on("data", (data) => {
      input += data.toString();
      while (input.includes("\r\n")) {
        const end = input.indexOf("\r\n");
        const line = input.slice(0, end);
        input = input.slice(end + 2);
        if (inMessage) {
          if (line === ".") {
            inMessage = false;
            socket.write("250 accepted\r\n");
          } else message += line + "\n";
        } else if (/^EHLO|^HELO/.test(line)) socket.write("250 localhost\r\n");
        else if (line === "DATA") {
          inMessage = true;
          socket.write("354 send message\r\n");
        } else if (line === "QUIT") socket.end("221 bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  vi.stubEnv("SMTP_HOST", "127.0.0.1");
  vi.stubEnv("SMTP_PORT", String((server.address() as AddressInfo).port));
  vi.stubEnv("SMTP_SECURE", "false");
  vi.stubEnv("SMTP_USER", "");
  vi.stubEnv("EMAIL_FROM", "FinanceFlow <hello@example.com>");
  vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
  try {
    await sendReset("user@example.com", "a".repeat(64));
    expect(message).toContain("To: user@example.com");
    expect(message.replace(/=\n/g, "").replace(/=3D/g, "=")).toContain(
      "http://localhost:3000/reset-password?token=" + "a".repeat(64),
    );
  } finally {
    server.close();
    vi.unstubAllEnvs();
  }
});
