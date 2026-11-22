"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCIES } from "@/lib/preferences";
import Link from "next/link";
import { Button } from "./ui/button";
export function SettingsForm({
  initial,
}: {
  initial: { name: string; email: string; currency: string; timezone: string };
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError(false);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setMessage(body.message);
      router.refresh();
    } catch (e) {
      setError(true);
      setMessage(e instanceof Error ? e.message : "Unable to save settings.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="max-w-2xl">
      <section className="card mb-6">
        <h3>Personal information</h3>
        <p className="muted text-sm mb-6">
          The details that make your account yours.
        </p>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            name="name"
            defaultValue={initial.name}
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" value={initial.email} disabled />
          <span className="muted text-xs">
            Your sign-in email cannot be changed here.
          </span>
        </div>
      </section>
      <section className="card mb-6">
        <h3>Account preferences</h3>
        <p className="muted text-sm mb-6">
          Choose how your financial information is displayed.
        </p>
        <div className="field">
          <label htmlFor="currency">Default currency</label>
          <select id="currency" name="currency" defaultValue={initial.currency}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="timezone">Timezone</label>
          <input
            id="timezone"
            name="timezone"
            defaultValue={initial.timezone}
            required
            maxLength={80}
          />
          <span className="muted text-xs">
            Use an IANA timezone such as Asia/Kolkata, Europe/London, or UTC.
          </span>
        </div>
      </section>
      {message && (
        <p
          role={error ? "alert" : "status"}
          className={`notice ${error ? "error" : ""}`}
        >
          {message}
        </p>
      )}
      <Button disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
      <section className="card mt-8">
        <h3>Password & security</h3>
        <p className="muted text-sm">
          Reset your password securely by email. Completing a reset signs out
          all existing sessions.
        </p>
        <Link href="/forgot-password" className="text-link">
          Request a password reset
        </Link>
      </section>
    </form>
  );
}
