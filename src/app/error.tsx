"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="container py-24 max-w-xl">
      <h1 className="page-title">We couldn’t load this page.</h1>
      <p className="muted">
        Please try again. If you’re setting up FinanceFlow, check the server’s
        database and environment configuration.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
