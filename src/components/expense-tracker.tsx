"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Wallet, Receipt, Tag } from "lucide-react";
import { Button } from "./ui/button";
import { Analytics } from "./analytics";
import { dateInMonth, monthLabel } from "@/lib/monthly";
import {
  categories,
  currencies,
  expenseSchema,
  formatMoney,
  type ExpenseRecord,
} from "@/lib/expenses";
type Summary = {
  expenses: ExpenseRecord[];
  count: number;
  page: number;
  currency: string;
  totalMinor: number;
  trend: { label: string; amountMinor: number }[];
  byCategory: { label: string; amountMinor: number }[];
};
type Draft = {
  amount: string;
  date: string;
  category: string;
  description: string;
  currency: string;
};
export function ExpenseTracker({
  initialCurrency,
  initialMonth,
  today,
}: {
  initialCurrency: string;
  initialMonth: string;
  today: string;
}) {
  const [month, setMonth] = useState(initialMonth),
    [category, setCategory] = useState(""),
    [currency, setCurrency] = useState(initialCurrency),
    [page, setPage] = useState(1);
  const [data, setData] = useState<Summary | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<ExpenseRecord | null>(null),
    [showForm, setShowForm] = useState(false),
    [deleting, setDeleting] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    amount: "",
    date: today,
    category: categories[0],
    description: "",
    currency: initialCurrency,
  });
  const formRef = useRef<HTMLDivElement>(null),
    requestId = useRef(0);
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ currency, page: String(page) });
      if (month) params.set("month", month);
      if (category) params.set("category", category);
      const response = await fetch(`/api/expenses?${params}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Your session has expired. Please sign in again."
            : body.error,
        );
      if (id === requestId.current) {
        setData(body);
        if (page > Math.max(1, Math.ceil(body.count / 50)))
          setPage(Math.max(1, Math.ceil(body.count / 50)));
      }
    } catch (e) {
      if (id === requestId.current) {
        setData(null);
        setError(e instanceof Error ? e.message : "Unable to load expenses.");
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [month, category, currency, page]);
  useEffect(() => {
    void load();
    return () => {
      requestId.current++;
    };
  }, [load]);
  useEffect(() => {
    if (showForm) formRef.current?.focus();
  }, [showForm, editing]);
  function startEdit(record: ExpenseRecord | null) {
    setEditing(record);
    setDraft(
      record
        ? {
            amount: (record.amountMinor / 100).toFixed(2),
            date: record.date,
            category: record.category,
            description: record.description,
            currency: record.currency,
          }
        : {
            amount: "",
            date: month ? dateInMonth(month, today) : today,
            category: categories[0],
            description: "",
            currency,
          },
    );
    setShowForm(true);
    setError("");
    setNotice("");
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = expenseSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        editing ? `/api/expenses/${editing.id}` : "/api/expenses",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setShowForm(false);
      setEditing(null);
      setNotice("Expense saved. Your totals reflect the selected filters.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save expense.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setDeleting(null);
      setNotice("Expense deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete expense.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h2 className="text-2xl mb-2">
            {month ? monthLabel(month) : "All months"} expenses
          </h2>
          <p className="muted text-sm mb-0">
            Track the everyday details. See the bigger picture.
          </p>
        </div>
        <Button onClick={() => startEdit(null)} disabled={busy}>
          <Plus size={18} />
          Add expense
        </Button>
      </div>
      {notice && (
        <div role="status" className="notice">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="notice error">
          {error}{" "}
          <Button
            variant="ghost"
            onClick={() => void load()}
            disabled={loading}
          >
            Retry loading
          </Button>
        </div>
      )}
      {showForm && (
        <div ref={formRef} tabIndex={-1} className="card mb-6">
          <h3>{editing ? "Edit expense" : "Add an expense"}</h3>
          <form onSubmit={save}>
            <fieldset disabled={busy} className="grid sm:grid-cols-2 gap-x-5">
              <div className="field">
                <label htmlFor="expense-amount">Amount</label>
                <input
                  id="expense-amount"
                  inputMode="decimal"
                  required
                  placeholder="0.00"
                  value={draft.amount}
                  onChange={(e) =>
                    setDraft({ ...draft, amount: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="expense-currency">Currency</label>
                <select
                  id="expense-currency"
                  value={draft.currency}
                  onChange={(e) =>
                    setDraft({ ...draft, currency: e.target.value })
                  }
                >
                  {currencies.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="expense-date">Date</label>
                <input
                  id="expense-date"
                  type="date"
                  required
                  min="1900-01-01"
                  max="9999-12-31"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="expense-category">Category</label>
                <select
                  id="expense-category"
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value })
                  }
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="field sm:col-span-2">
                <label htmlFor="expense-description">Description</label>
                <input
                  id="expense-description"
                  required
                  maxLength={200}
                  placeholder="What was it for?"
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <Button disabled={busy}>
                  {busy ? "Saving…" : "Save expense"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </fieldset>
          </form>
        </div>
      )}
      <section className="card mb-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="field mb-0">
            <label htmlFor="filter-month">Month</label>
            <input
              id="filter-month"
              disabled={busy}
              type="month"
              min="1900-01"
              max="9999-12"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPage(1);
              }}
            />
            <span className="muted text-xs">Clear for all months.</span>
          </div>
          <div className="field mb-0">
            <label htmlFor="filter-category">Category</label>
            <select
              id="filter-category"
              disabled={busy}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field mb-0">
            <label htmlFor="filter-currency">Currency</label>
            <select
              id="filter-currency"
              disabled={busy}
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setPage(1);
              }}
            >
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <span className="muted text-xs">
              Currencies are never combined or converted.
            </span>
          </div>
        </div>
      </section>
      <div aria-busy={loading}>
        {loading ? (
          <div role="status" className="loading">
            Loading your expenses…
          </div>
        ) : (
          data && (
            <>
              <div className="stats">
                {[
                  {
                    label: "Total spending",
                    value: formatMoney(data.totalMinor, currency),
                    icon: Wallet,
                  },
                  {
                    label: "Expenses recorded",
                    value: String(data.count),
                    icon: Receipt,
                  },
                  {
                    label: "Average expense",
                    value: formatMoney(
                      data.count ? Math.round(data.totalMinor / data.count) : 0,
                      currency,
                    ),
                    icon: Tag,
                  },
                ].map((s) => (
                  <section className="card" key={s.label}>
                    <div className="stat-title">
                      {s.label}
                      <s.icon size={18} />
                    </div>
                    <div className="stat-value">{s.value}</div>
                    <span className="muted text-xs">For selected filters</span>
                  </section>
                ))}
              </div>
              <div className="dashboard-grid">
                <section className="card">
                  <h3>Monthly spending</h3>
                  <Analytics currency={currency} data={data.trend} />
                  <details>
                    <summary className="text-sm muted cursor-pointer">
                      View monthly totals
                    </summary>
                    <ul className="text-sm mt-3 space-y-2">
                      {data.trend.map((t) => (
                        <li className="flex justify-between" key={t.label}>
                          <span>{t.label}</span>
                          <span>{formatMoney(t.amountMinor, currency)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </section>
                <section className="card">
                  <h3>By category</h3>
                  {!data.byCategory.length ? (
                    <p className="muted text-sm mt-6">
                      Your categories will appear after you add an expense.
                    </p>
                  ) : (
                    <ul className="space-y-5 mt-6">
                      {data.byCategory.map((c) => (
                        <li key={c.label}>
                          <div className="flex justify-between gap-3 text-sm mb-2">
                            <span>{c.label}</span>
                            <strong>
                              {formatMoney(c.amountMinor, currency)}
                            </strong>
                          </div>
                          <div className="h-1.5 rounded bg-[var(--border)]">
                            <div
                              className="h-full rounded bg-emerald-600"
                              style={{
                                width: `${(c.amountMinor / data.totalMinor) * 100}%`,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
              <section className="card mt-6">
                <h3>Expenses</h3>
                {!data.expenses.length ? (
                  <div className="empty-state">
                    <Wallet size={32} />
                    <h3>A little detail goes a long way</h3>
                    <p>
                      No expenses match these filters. Add your first expense or
                      change the month, category, or currency.
                    </p>
                  </div>
                ) : (
                  <div
                    className="table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Expenses, scroll horizontally to view all columns"
                  >
                    <table className="w-full text-sm text-left min-w-[650px]">
                      <caption className="sr-only">
                        Expenses for the selected filters
                      </caption>
                      <thead>
                        <tr className="text-[var(--muted)] border-b border-[var(--border)]">
                          {[
                            "Date",
                            "Description",
                            "Category",
                            "Amount",
                            "Actions",
                          ].map((h) => (
                            <th
                              className="py-4 px-2 font-medium"
                              scope="col"
                              key={h}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.expenses.map((expense) => (
                          <tr
                            key={expense.id}
                            className="border-b border-[var(--border)]"
                          >
                            <td className="py-4 px-2 whitespace-nowrap">
                              {expense.date}
                            </td>
                            <td className="py-4 px-2 max-w-64 break-words">
                              {expense.description}
                            </td>
                            <td className="py-4 px-2">{expense.category}</td>
                            <td className="py-4 px-2 font-semibold whitespace-nowrap">
                              {formatMoney(
                                expense.amountMinor,
                                expense.currency,
                              )}
                            </td>
                            <td className="py-4 px-2">
                              {deleting === expense.id ? (
                                <div className="flex flex-wrap gap-2 items-center">
                                  <span>Delete?</span>
                                  <Button
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => void remove(expense.id)}
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
                                    disabled={busy}
                                    aria-label={`Edit ${expense.description}`}
                                    onClick={() => startEdit(expense)}
                                  >
                                    <Pencil size={16} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    disabled={busy}
                                    aria-label={`Delete ${expense.description}`}
                                    onClick={() => setDeleting(expense.id)}
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
                <div className="pagination">
                  <span className="muted text-sm">
                    {data.count} expenses · Page {page} of{" "}
                    {Math.max(1, Math.ceil(data.count / 50))}
                  </span>
                  <div className="pagination-actions">
                    <Button
                      variant="outline"
                      disabled={busy || page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy || page * 50 >= data.count}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </section>
            </>
          )
        )}
      </div>
    </>
  );
}
