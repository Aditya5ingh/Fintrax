// Real HTTP acceptance checks against a temporary database and SMTP server.
// Requires `npm run build`; never connects to the application's database.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { once } from "node:events";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

const installed = "C:/Program Files/MongoDB/Server";
if (!process.env.MONGOMS_SYSTEM_BINARY && existsSync(installed)) {
  process.env.MONGOMS_SYSTEM_BINARY = readdirSync(installed)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    .map((v) => join(installed, v, "bin", "mongod.exe"))
    .find(existsSync);
  process.env.MONGOMS_SYSTEM_BINARY_VERSION_CHECK = "false";
}
const sockets = new Set();
let email = "";
const smtp = createServer((socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
  let buffer = "",
    inData = false;
  socket.write("220 localhost ready\r\n");
  socket.on("data", (chunk) => {
    buffer += chunk.toString();
    while (buffer.includes("\r\n")) {
      const end = buffer.indexOf("\r\n"),
        line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (inData) {
        if (line === ".") {
          inData = false;
          socket.write("250 accepted\r\n");
        } else email += line + "\n";
      } else if (/^EHLO|^HELO/.test(line)) socket.write("250 localhost\r\n");
      else if (line === "DATA") {
        inData = true;
        socket.write("354 send data\r\n");
      } else if (line === "QUIT") socket.end("221 bye\r\n");
      else socket.write("250 OK\r\n");
    }
  });
});
let mongo, server;
try {
  smtp.listen(0, "127.0.0.1");
  await once(smtp, "listening");
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  mongo = await MongoMemoryServer.create();
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--port",
      String(port),
      "--hostname",
      "127.0.0.1",
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        NEXTAUTH_SECRET: randomBytes(32).toString("hex"),
        NEXTAUTH_URL: base,
        MONGODB_URI: mongo.getUri(),
        SMTP_HOST: "127.0.0.1",
        SMTP_PORT: String(smtp.address().port),
        SMTP_SECURE: "false",
        SMTP_USER: "",
        SMTP_PASSWORD: "",
        EMAIL_FROM: "FinanceFlow <test@example.com>",
      },
      stdio: "ignore",
      windowsHide: true,
    },
  );
  let ready = false;
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(base)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(ready, "Temporary app server must start");
  function client() {
    const cookies = new Map();
    return async (path, options = {}) => {
      const response = await fetch(base + path, {
        ...options,
        redirect: "manual",
        headers: {
          origin: base,
          ...(cookies.size
            ? { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") }
            : {}),
          ...options.headers,
        },
      });
      for (const header of response.headers.getSetCookie()) {
        const pair = header.split(";")[0],
          separator = pair.indexOf("=");
        const key = pair.slice(0, separator),
          value = pair.slice(separator + 1);
        if (value) cookies.set(key, value);
        else cookies.delete(key);
      }
      return response;
    };
  }
  const json = (method, data) => ({
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const a = client(),
    b = client();
  const password = "a secure test password";
  assert.equal((await a("/dashboard")).status, 307);
  assert.equal((await a("/api/account")).status, 401);
  for (const [request, address] of [
    [a, "a@example.com"],
    [b, "b@example.com"],
  ]) {
    assert.equal(
      (
        await request(
          "/api/register",
          json("POST", { name: "HTTP Test", email: address, password }),
        )
      ).status,
      201,
    );
  }
  async function login(request, address, pw) {
    const { csrfToken } = await (await request("/api/auth/csrf")).json();
    const response = await request("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        csrfToken,
        email: address,
        password: pw,
        callbackUrl: base + "/dashboard",
        json: "true",
      }),
    });
    assert.ok(
      response.headers
        .getSetCookie()
        .some(
          (h) =>
            h.includes("session-token") &&
            h.includes("HttpOnly") &&
            h.includes("Secure"),
        ),
      "Login must set a secure HttpOnly session cookie",
    );
    assert.equal(
      (await (await request("/api/auth/session")).json()).user.email,
      address,
    );
  }
  await login(a, "a@example.com", password);
  await login(b, "b@example.com", password);
  assert.equal((await (await a("/api/account")).json()).currency, "INR");
  assert.equal((await a("/dashboard/expenses")).status, 200);
  assert.equal(
    (
      await a(
        "/api/account",
        json("PATCH", {
          name: "Updated HTTP User",
          currency: "INR",
          timezone: "Asia/Kolkata",
        }),
      )
    ).status,
    200,
  );
  const draft = {
    amount: "12.34",
    date: "2026-11-23",
    category: "Groceries",
    description: "Temporary test expense",
    currency: "INR",
  };
  assert.equal((await a("/dashboard/monthly")).status, 200);
  const incomeDraft = {
    amount: "50000",
    date: "2026-11-30",
    category: "Salary",
    description: "Temporary test income",
    currency: "INR",
    status: "expected",
  };
  const incomeResponse = await a("/api/income", json("POST", incomeDraft));
  assert.equal(incomeResponse.status, 201);
  const { income } = await incomeResponse.json();
  let summary = await (
    await a("/api/monthly?month=2026-11&kind=income")
  ).json();
  assert.equal(summary.totals.expectedMinor, 5000000);
  assert.equal(summary.totals.incomeMinor, 0);
  assert.equal(
    (await (await b("/api/monthly?month=2026-11&kind=income")).json()).records
      .length,
    0,
  );
  assert.equal(
    (
      await b(
        `/api/income/${income.id}`,
        json("PATCH", { ...incomeDraft, status: "received" }),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await a(
        `/api/income/${income.id}`,
        json("PATCH", { ...incomeDraft, status: "received" }),
      )
    ).status,
    200,
  );
  summary = await (await a("/api/monthly?month=2026-11")).json();
  assert.equal(summary.totals.incomeMinor, 5000000);
  assert.equal(summary.totals.expectedMinor, 0);
  const created = await a("/api/expenses", json("POST", draft));
  assert.equal(created.status, 201);
  const { expense } = await created.json();
  assert.equal((await (await a("/api/expenses")).json()).totalMinor, 1234);
  summary = await (await a("/api/monthly?month=2026-11")).json();
  assert.equal(summary.totals.netMinor, 4998766);
  assert.equal(summary.months.length, 12);
  assert.equal(
    (await (await a("/api/monthly?month=2026-12")).json()).totals.count,
    0,
  );
  assert.equal(
    (await a(`/api/income/${income.id}`, { method: "DELETE" })).status,
    200,
  );
  assert.equal((await (await b("/api/expenses")).json()).count, 0);
  assert.equal(
    (
      await b(
        `/api/expenses/${expense.id}`,
        json("PATCH", { ...draft, amount: "99" }),
      )
    ).status,
    404,
  );
  assert.equal(
    (await b(`/api/expenses/${expense.id}`, { method: "DELETE" })).status,
    404,
  );
  assert.equal(
    (
      await a(
        `/api/expenses/${expense.id}`,
        json("PATCH", { ...draft, amount: "0.29" }),
      )
    ).status,
    200,
  );
  assert.equal(
    (await (await a("/api/expenses?month=2026-11&category=Groceries")).json())
      .totalMinor,
    29,
  );
  assert.equal(
    (await a("/api/forgot-password", json("POST", { email: "a@example.com" })))
      .status,
    200,
  );
  const token = email
    .replace(/=\n/g, "")
    .replace(/=3D/g, "=")
    .match(/reset-password\?token=([a-f0-9]{64})/)?.[1];
  assert.ok(token, "SMTP must deliver a reset link");
  const nextPassword = "another secure test password";
  assert.equal(
    (
      await a(
        "/api/reset-password",
        json("POST", { token, password: nextPassword }),
      )
    ).status,
    200,
  );
  assert.equal((await a("/api/account")).status, 401);
  assert.equal(
    (
      await a(
        "/api/reset-password",
        json("POST", { token, password: nextPassword }),
      )
    ).status,
    400,
  );
  const renewed = client();
  await login(renewed, "a@example.com", nextPassword);
  assert.equal(
    (await renewed(`/api/expenses/${expense.id}`, { method: "DELETE" })).status,
    200,
  );
  const { csrfToken } = await (await renewed("/api/auth/csrf")).json();
  await renewed("/api/auth/signout", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken,
      json: "true",
      callbackUrl: base + "/login",
    }),
  });
  assert.equal((await renewed("/api/account")).status, 401);
  assert.equal((await renewed("/dashboard")).status, 307);
  console.log(
    "HTTP checks passed: registration, login, secure cookies, INR defaults, settings, expense CRUD/filters, user isolation, SMTP recovery, reset reuse prevention, session revocation, logout, and protected routes.",
  );
} finally {
  server?.kill();
  for (const socket of sockets) socket.destroy();
  smtp.close();
  await mongo?.stop();
}
