"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Plus, Pencil, Trash2 } from "lucide-react";
import { currencies, formatMoney } from "@/lib/expenses";
import {
  monthLabel,
  monthNames,
  shiftMonth,
  type MonthlySummary,
  type MonthlyRecord,
} from "@/lib/monthly";
import { Button } from "./ui/button";
import { MonthlyEntryForm } from "./monthly-entry-form";
import { MonthlyChart } from "./monthly-chart";
type Kind = "income" | "expense";
export function MonthlyFinances({
  initialCurrency,
  initialMonth,
  today,
}: {
  initialCurrency: string;
  initialMonth: string;
  today: string;
}) {
  const [month, setMonth] = useState(initialMonth),
    [yearInput, setYearInput] = useState(initialMonth.slice(0, 4)),
    [currency, setCurrency] = useState(initialCurrency),
    [kind, setKind] = useState<Kind>("expense"),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [data, setData] = useState<MonthlySummary | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [form, setForm] = useState<{
      kind: Kind;
      record?: MonthlyRecord;
    } | null>(null),
    [deleting, setDeleting] = useState<string | null>(null);
  const formAnchor = useRef<HTMLDivElement>(null);
  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/monthly?${new URLSearchParams({ month, currency, kind, page: String(page) })}`,
          { signal, cache: "no-store" },
        );
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Your session has expired. Please sign in again."
              : body.error || "Unable to load this month.",
          );
        if (!signal.aborted) {
          setData(body);
          if (page > Math.max(1, Math.ceil(body.count / 50)))
            setPage(Math.max(1, Math.ceil(body.count / 50)));
        }
      } catch (e) {
        if (!signal.aborted) {
          setData(null);
          setError(
            e instanceof Error ? e.message : "Unable to load this month.",
          );
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [month, currency, kind, page],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, revision]);
  useEffect(() => {
    setYearInput(month.slice(0, 4));
  }, [month]);
  useEffect(() => {
    if (form)
      formAnchor.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
  }, [form]);
  function selectMonth(next: string) {
    setMonth(next);
    setPage(1);
    setDeleting(null);
    setForm(null);
    setNotice("");
  }
  function openForm(type: Kind, record?: MonthlyRecord) {
    setForm({ kind: type, record });
    setNotice("");
    setError("");
    setDeleting(null);
  }
  function saved(date: string, nextCurrency: string) {
    const savedKind = form!.kind;
    setForm(null);
    setMonth(date.slice(0, 7));
    setCurrency(nextCurrency);
    setKind(savedKind);
    setPage(1);
    setRevision((v) => v + 1);
    setNotice(
      `${savedKind === "income" ? "Income" : "Expense"} saved to ${monthLabel(date.slice(0, 7))}.`,
    );
  }
  async function remove(id: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/${kind === "income" ? "income" : "expenses"}/${id}`,
        { method: "DELETE" },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setDeleting(null);
      setNotice("Entry deleted. Monthly totals have been updated.");
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete.");
    } finally {
      setBusy(false);
    }
  }
  const shown =
    data?.month === month &&
    data.currency === currency &&
    data.kind === kind &&
    data.page === page &&
    !loading
      ? data
      : null;
  const money = (amount: number) => formatMoney(amount, currency);
  return (
    <>
      <section className="card mb-6">
        <div className="flex flex-wrap justify-between items-start gap-5">
          <div>
            <div className="eyebrow mb-3">
              <CalendarDays size={17} />
              YOUR MONTHLY FINANCES
            </div>
            <h2 className="mb-2">{monthLabel(month)}</h2>
            <p className="muted text-sm mb-0">
              Income, expenses, and your monthly result in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => openForm("income")}>
              <Plus size={16} />
              Add income
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => openForm("expense")}
            >
              <Plus size={16} />
              Add expense
            </Button>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mt-7">
          <div className="field mb-0">
            <label htmlFor="finance-month">Month</label>
            <select
              id="finance-month"
              disabled={busy}
              value={month.slice(5)}
              onChange={(e) =>
                selectMonth(`${month.slice(0, 4)}-${e.target.value}`)
              }
            >
              {monthNames.map((name, i) => (
                <option key={name} value={String(i + 1).padStart(2, "0")}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const year = Number(yearInput);
              if (Number.isInteger(year) && year >= 1900 && year <= 9999)
                selectMonth(`${year}-${month.slice(5)}`);
            }}
          >
            <div className="field mb-0">
              <label htmlFor="finance-year">Year</label>
              <div className="flex gap-2">
                <input
                  id="finance-year"
                  disabled={busy}
                  type="number"
                  min="1900"
                  max="9999"
                  required
                  value={yearInput}
                  onChange={(e) => setYearInput(e.target.value)}
                />
                <Button disabled={busy} variant="outline">
                  View
                </Button>
              </div>
            </div>
          </form>
          <div className="field mb-0">
            <label htmlFor="finance-currency">Currency</label>
            <select
              id="finance-currency"
              disabled={busy}
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setPage(1);
                setForm(null);
                setDeleting(null);
              }}
            >
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="ghost"
            disabled={busy || month === "1900-01"}
            onClick={() => selectMonth(shiftMonth(month, -1))}
          >
            Previous month
          </Button>
          <Button
            variant="ghost"
            disabled={busy || month === "9999-12"}
            onClick={() => selectMonth(shiftMonth(month, 1))}
          >
            Next month
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => selectMonth(initialMonth)}
          >
            This month
          </Button>
        </div>
      </section>
      {notice && (
        <div role="status" className="notice">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="notice error">
          {error}
          <Button variant="ghost" onClick={() => setRevision((v) => v + 1)}>
            Retry
          </Button>
        </div>
      )}
      <div ref={formAnchor}>
        {form && (
          <MonthlyEntryForm
            key={`${form.kind}-${form.record?.id || "new"}`}
            {...form}
            month={month}
            today={today}
            currency={currency}
            onBusy={setBusy}
            onSaved={saved}
            onCancel={() => setForm(null)}
          />
        )}
      </div>
      <div aria-busy={loading}>
        {loading && (
          <div className="loading" role="status">
            Loading {monthLabel(month)}…
          </div>
        )}
        {shown && (
          <>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: "Income received",
                  amount: shown.totals.incomeMinor,
                  hint: "Money received this month",
                },
                {
                  label: "Expenses",
                  amount: shown.totals.expenseMinor,
                  hint: "Spending recorded this month",
                },
                {
                  label: "Monthly net",
                  amount: shown.totals.netMinor,
                  hint: "Received income minus expenses",
                },
                {
                  label: "Expected income",
                  amount: shown.totals.expectedMinor,
                  hint: "Still to come; excluded from net",
                },
              ].map((s) => (
                <section className="card" key={s.label}>
                  <div className="stat-title">{s.label}</div>
                  <div
                    className={`stat-value ${s.amount < 0 ? "text-red-600 dark:text-red-300" : ""}`}
                  >
                    {money(s.amount)}
                  </div>
                  <p className="muted text-xs mb-0">{s.hint}</p>
                </section>
              ))}
            </div>
            <section className="card mb-6">
              <div className="flex flex-wrap gap-3 justify-between">
                <h3>{monthLabel(month)} activity</h3>
                <div
                  className="flex gap-2"
                  role="group"
                  aria-label="Record type"
                >
                  <Button
                    variant={kind === "expense" ? "default" : "outline"}
                    aria-pressed={kind === "expense"}
                    disabled={busy}
                    onClick={() => {
                      setKind("expense");
                      setPage(1);
                      setDeleting(null);
                    }}
                  >
                    Expenses
                  </Button>
                  <Button
                    variant={kind === "income" ? "default" : "outline"}
                    aria-pressed={kind === "income"}
                    disabled={busy}
                    onClick={() => {
                      setKind("income");
                      setPage(1);
                      setDeleting(null);
                    }}
                  >
                    Income
                  </Button>
                </div>
              </div>
              {!shown.count ? (
                <div className="empty-state">
                  <CalendarDays size={30} />
                  <h3>
                    No {kind === "income" ? "income" : "expenses"} recorded
                  </h3>
                  <p>
                    Add an entry dated in {monthLabel(month)} to start this
                    month’s record.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[650px]">
                    <caption className="sr-only">
                      {monthLabel(month)} {kind} records in {currency}
                    </caption>
                    <thead>
                      <tr>
                        {[
                          "Date",
                          "Description",
                          kind === "income" ? "Source / status" : "Category",
                          "Amount",
                          "Actions",
                        ].map((label) => (
                          <th
                            scope="col"
                            className="py-4 px-2 font-medium muted"
                            key={label}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shown.records.map((record) => (
                        <tr
                          key={record.id}
                          className="border-t border-[var(--border)]"
                        >
                          <td className="py-4 px-2 whitespace-nowrap">
                            {record.date}
                          </td>
                          <td className="py-4 px-2 max-w-64 break-words">
                            {record.description}
                          </td>
                          <td className="py-4 px-2">
                            {record.category}
                            {kind === "income" && (
                              <span className="block text-xs muted mt-1">
                                {record.status === "expected"
                                  ? "Expected"
                                  : "Received"}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-2 font-semibold whitespace-nowrap">
                            {money(record.amountMinor)}
                          </td>
                          <td className="py-4 px-2">
                            {deleting === record.id ? (
                              <div className="flex flex-wrap gap-2 items-center">
                                <span>Delete entry?</span>
                                <Button
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => void remove(record.id)}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="ghost"
                                  disabled={busy}
                                  onClick={() => setDeleting(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  aria-label={`Edit ${record.description}`}
                                  disabled={busy}
                                  onClick={() => openForm(kind, record)}
                                >
                                  <Pencil size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  aria-label={`Delete ${record.description}`}
                                  disabled={busy}
                                  onClick={() => {
                                    setDeleting(record.id);
                                    setForm(null);
                                  }}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex flex-wrap justify-between gap-3 items-center mt-5">
                <span className="muted text-sm">
                  {shown.count} entries · Page {page} of{" "}
                  {Math.max(1, Math.ceil(shown.count / 50))}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={busy || page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy || page * 50 >= shown.count}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </section>
            <div className="dashboard-grid mb-6">
              <section className="card">
                <h3>{month.slice(0, 4)} at a glance</h3>
                <p className="muted text-sm">
                  Income received and expenses by month, in {currency}.
                </p>
                <MonthlyChart currency={currency} months={shown.months} />
              </section>
              <section className="card">
                <h3>{monthLabel(month)} spending</h3>
                {shown.categories.length ? (
                  <ul className="space-y-4 mt-6">
                    {shown.categories.map((c) => (
                      <li key={c.label}>
                        <div className="flex justify-between gap-3 text-sm mb-2">
                          <span>{c.label}</span>
                          <strong>{money(c.amountMinor)}</strong>
                        </div>
                        <div className="h-1.5 rounded bg-[var(--border)]">
                          <div
                            className="h-full rounded bg-emerald-600"
                            style={{
                              width: `${(c.amountMinor / shown.totals.expenseMinor) * 100}%`,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted text-sm mt-6">
                    No spending recorded for this month.
                  </p>
                )}
              </section>
            </div>
            <section aria-label="Months of the selected year">
              <h3 className="mb-2">Every month, a clear record</h3>
              <p className="muted text-sm mb-5">
                Choose a month to view its details. Monthly net is based on
                recorded activity; it is not your bank balance.
              </p>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {shown.months.map((m) => (
                  <button
                    key={m.month}
                    type="button"
                    disabled={busy}
                    aria-pressed={m.month === month}
                    onClick={() => {
                      selectMonth(m.month);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`card text-left transition-colors ${m.month === month ? "ring-2 ring-emerald-600" : "hover:border-emerald-600"}`}
                  >
                    <span className="font-semibold block mb-4">
                      {monthLabel(m.month)}
                    </span>
                    <span className="flex justify-between text-sm mb-2">
                      <span className="muted">Received</span>
                      <span>{money(m.incomeMinor)}</span>
                    </span>
                    <span className="flex justify-between text-sm mb-2">
                      <span className="muted">Expenses</span>
                      <span>{money(m.expenseMinor)}</span>
                    </span>
                    <span className="flex justify-between text-sm mb-2">
                      <span className="muted">Expected</span>
                      <span>{money(m.expectedMinor)}</span>
                    </span>
                    <span className="flex justify-between text-sm border-t border-[var(--border)] pt-3 font-semibold">
                      <span>Net</span>
                      <span>{money(m.netMinor)}</span>
                    </span>
                    <span className="block muted text-xs mt-3">
                      {m.count ? `${m.count} entries` : "No activity yet"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
