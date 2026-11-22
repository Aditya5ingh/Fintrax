"use client";
import { useState } from "react";
import { categories, currencies, expenseSchema } from "@/lib/expenses";
import {
  incomeCategories,
  incomeSchema,
  dateInMonth,
  type MonthlyRecord,
} from "@/lib/monthly";
import { Button } from "./ui/button";
export function MonthlyEntryForm({
  kind,
  record,
  month,
  today,
  currency,
  onSaved,
  onCancel,
  onBusy,
}: {
  kind: "income" | "expense";
  record?: MonthlyRecord;
  month: string;
  today: string;
  currency: string;
  onSaved: (date: string, currency: string) => void;
  onCancel: () => void;
  onBusy: (value: boolean) => void;
}) {
  const [draft, setDraft] = useState({
    amount: record ? (record.amountMinor / 100).toFixed(2) : "",
    date: record?.date || dateInMonth(month, today),
    currency: record?.currency || currency,
    category:
      record?.category ||
      (kind === "income" ? incomeCategories[0] : categories[0]),
    description: record?.description || "",
    status:
      record?.status ||
      (kind === "income" && dateInMonth(month, today) > today
        ? "expected"
        : "received"),
  });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { status, ...expense } = draft;
    const parsed =
      kind === "income"
        ? incomeSchema.safeParse(draft)
        : expenseSchema.safeParse(expense);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/${kind === "income" ? "income" : "expenses"}${record ? `/${record.id}` : ""}`,
        {
          method: record ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save.");
      onSaved(draft.date, draft.currency);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save. Please try again.",
      );
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <section
      className="card mb-6"
      aria-label={`${record ? "Edit" : "Add"} ${kind}`}
    >
      <h3>
        {record ? "Edit" : "Add"} {kind}
      </h3>
      <p className="muted text-sm">
        The date determines which month this entry belongs to.
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-x-5">
          <div className="field">
            <label htmlFor="monthly-amount">Amount</label>
            <input
              autoFocus
              id="monthly-amount"
              inputMode="decimal"
              required
              maxLength={10}
              placeholder="0.00"
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="monthly-currency">Currency</label>
            <select
              id="monthly-currency"
              value={draft.currency}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
            >
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="monthly-date">
              {kind === "income" && draft.status === "expected"
                ? "Expected date"
                : "Date"}
            </label>
            <input
              id="monthly-date"
              type="date"
              required
              min="1900-01-01"
              max="9999-12-31"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="monthly-category">
              {kind === "income" ? "Income source" : "Category"}
            </label>
            <select
              id="monthly-category"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            >
              {(kind === "income" ? incomeCategories : categories).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          {kind === "income" && (
            <div className="field sm:col-span-2">
              <label htmlFor="monthly-status">Income status</label>
              <select
                id="monthly-status"
                value={draft.status}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    status: e.target.value as "received" | "expected",
                  })
                }
              >
                <option value="received">Received — already paid</option>
                <option value="expected">Expected — still to come</option>
              </select>
              <span className="muted text-xs">
                Expected income is shown separately until you mark it received.
              </span>
            </div>
          )}
          <div className="field sm:col-span-2">
            <label htmlFor="monthly-description">Description</label>
            <input
              id="monthly-description"
              required
              maxLength={200}
              placeholder={
                kind === "income" ? "e.g. November salary" : "What was it for?"
              }
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </div>
          {error && (
            <p role="alert" className="notice error sm:col-span-2">
              {error}
            </p>
          )}
          <div className="flex gap-3 sm:col-span-2">
            <Button disabled={busy}>{busy ? "Saving…" : `Save ${kind}`}</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
