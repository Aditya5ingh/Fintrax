"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "./ui/button";
type Mode = "login" | "register" | "forgot-password" | "reset-password";
export function AuthForm({ mode }: { mode: Mode }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const titles = {
    login: "Welcome back.",
    register: "Find your financial flow.",
    "forgot-password": "Let’s get you back in.",
    "reset-password": "A fresh start.",
  };
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError(false);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (mode === "login") {
        const result = await signIn("credentials", {
          ...data,
          redirect: false,
        });
        if (result?.error || !result?.ok)
          throw new Error(
            "Unable to sign in. Check your details or try again later.",
          );
        window.location.assign("/dashboard");
        return;
      }
      if (mode === "reset-password")
        data.token =
          new URLSearchParams(window.location.search).get("token") || "";
      const res = await fetch(`/api/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setMessage(body.message);
    } catch (e) {
      setError(true);
      setMessage(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="form-wrap">
      <div className="eyebrow">YOUR SPACE TO MOVE FORWARD</div>
      <h1>{titles[mode]}</h1>
      <p className="muted">
        {mode === "login"
          ? "Sign in to your personal financial space."
          : mode === "register"
            ? "A little more clarity starts with your own account."
            : mode === "forgot-password"
              ? "Enter your email and we’ll help you reset your password."
              : "Choose a strong password to secure your account."}
      </p>
      <form onSubmit={submit}>
        {mode === "register" && (
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              name="name"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              placeholder="Your name"
            />
          </div>
        )}
        {mode !== "reset-password" && (
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
        )}
        {mode !== "forgot-password" && (
          <div className="field">
            <label htmlFor="password">
              {mode === "reset-password" ? "New password" : "Password"}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={mode === "login" ? 1 : 12}
              maxLength={72}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              placeholder={
                mode === "login"
                  ? "Enter your password"
                  : "At least 12 characters"
              }
            />
            {mode !== "login" && (
              <span className="text-xs muted">
                Use 12–72 characters (at most 72 UTF-8 bytes).
              </span>
            )}
          </div>
        )}
        {mode === "login" && (
          <div className="text-right mb-5">
            <Link className="text-link" href="/forgot-password">
              Forgot password?
            </Link>
          </div>
        )}
        {message && (
          <div
            role={error ? "alert" : "status"}
            className={`notice ${error ? "error" : ""}`}
          >
            {message}
          </div>
        )}
        <Button className="w-full" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : mode === "register"
                ? "Create account"
                : mode === "forgot-password"
                  ? "Send reset link"
                  : "Update password"}
        </Button>
      </form>
      <p className="text-center text-sm muted mt-7">
        {mode === "login" ? (
          <>
            New to FinanceFlow?{" "}
            <Link className="text-link" href="/register">
              Create an account
            </Link>
          </>
        ) : (
          <Link className="text-link" href="/login">
            Back to sign in
          </Link>
        )}
      </p>
      <p className="text-center text-xs muted mt-9">
        Your finances are personal. Your account should be, too.
      </p>
    </div>
  );
}
