import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { hash, compare } from "bcryptjs";
vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/mail", () => ({ sendReset: vi.fn() }));
import { getServerSession } from "next-auth";
import { sendReset } from "@/lib/mail";
import { connectDB } from "@/lib/db";
import { User, Account, RateLimit, Expense, Income } from "@/models";
import { POST as createIncome } from "@/app/api/income/route";
import {
  PATCH as editIncome,
  DELETE as deleteIncome,
} from "@/app/api/income/[id]/route";
import { GET as monthlySummary } from "@/app/api/monthly/route";
import {
  GET as listExpenses,
  POST as createExpense,
} from "@/app/api/expenses/route";
import {
  PATCH as editExpense,
  DELETE as deleteExpense,
} from "@/app/api/expenses/[id]/route";
import { currentUser, authOptions } from "@/lib/auth";
import { hashToken, rateLimit } from "@/lib/security";
import { POST as register } from "@/app/api/register/route";
import { POST as forgot } from "@/app/api/forgot-password/route";
import { POST as reset } from "@/app/api/reset-password/route";
import { GET, PATCH } from "@/app/api/account/route";
let mongo: MongoMemoryServer;
const req = (path: string, data: unknown, origin = "http://localhost:3000") =>
  new Request(`http://localhost:3000/api/${path}`, {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  await connectDB();
  await Promise.all([
    User.init(),
    Account.init(),
    RateLimit.init(),
    Expense.init(),
    Income.init(),
  ]);
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Account.deleteMany({}),
    RateLimit.deleteMany({}),
    Expense.deleteMany({}),
    Income.deleteMany({}),
  ]);
  vi.clearAllMocks();
});

const expenseData = {
  amount: "12.34",
  date: "2026-11-23",
  category: "Groceries",
  description: "Weekly groceries",
  currency: "USD",
};
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const listRequest = (query = "") =>
  new Request(`http://localhost:3000/api/expenses${query}`);
function signInAs(user: { _id: unknown }) {
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: String(user._id), version: 0 },
    expires: "",
  });
}
const incomeData = {
  amount: "50000.25",
  date: "2026-11-30",
  currency: "INR",
  category: "Salary",
  description: "Monthly salary",
  status: "received",
};
const monthRequest = (query = "month=2026-11") =>
  new Request(`http://localhost:3000/api/monthly?${query}`);
describe("monthly finances", () => {
  it("protects monthly summaries and all income mutations from anonymous access", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    expect((await monthlySummary(monthRequest())).status).toBe(401);
    expect((await createIncome(req("income", incomeData))).status).toBe(401);
    expect(
      (await editIncome(req("income", incomeData), context("a".repeat(24))))
        .status,
    ).toBe(401);
    expect(
      (await deleteIncome(req("income", {}), context("a".repeat(24)))).status,
    ).toBe(401);
  });
  it("keeps months, years and currencies separate and excludes expected income from net", async () => {
    const user = await makeUser();
    signInAs(user);
    await createIncome(req("income", incomeData));
    await createIncome(
      req("income", { ...incomeData, amount: "1000", status: "expected" }),
    );
    await createIncome(
      req("income", { ...incomeData, date: "2026-12-01", amount: "20" }),
    );
    await createIncome(
      req("income", { ...incomeData, date: "2027-11-01", amount: "30" }),
    );
    await createIncome(
      req("income", { ...incomeData, currency: "USD", amount: "40" }),
    );
    await createExpense(
      req("expenses", { ...expenseData, currency: "INR", amount: "25000.10" }),
    );
    const result = await (await monthlySummary(monthRequest())).json();
    expect(result.currency).toBe("INR");
    expect(result.months).toHaveLength(12);
    expect(result.totals).toMatchObject({
      incomeMinor: 5000025,
      expectedMinor: 100000,
      expenseMinor: 2500010,
      netMinor: 2500015,
      count: 3,
    });
    expect(
      result.months.find((m: { month: string }) => m.month === "2026-12"),
    ).toMatchObject({ incomeMinor: 2000, netMinor: 2000, count: 1 });
    expect(result.months[0]).toMatchObject({
      incomeMinor: 0,
      expenseMinor: 0,
      netMinor: 0,
      count: 0,
    });
    expect(result.categories).toEqual([
      { label: "Groceries", amountMinor: 2500010 },
    ]);
    const nextYear = await (
      await monthlySummary(monthRequest("month=2027-11"))
    ).json();
    expect(nextYear.totals.incomeMinor).toBe(3000);
    const usd = await (
      await monthlySummary(monthRequest("month=2026-11&currency=USD"))
    ).json();
    expect(usd.totals).toMatchObject({ incomeMinor: 4000, expenseMinor: 0 });
  });
  it("marks expected money received, moves income between months and deletes it", async () => {
    const user = await makeUser();
    signInAs(user);
    const response = await createIncome(
      req("income", { ...incomeData, status: "expected" }),
    );
    expect(response.status).toBe(201);
    const { income } = await response.json();
    expect(income.amountMinor).toBe(5000025);
    expect(income.userId).toBeUndefined();
    expect(
      (
        await editIncome(
          req("income", { ...incomeData, date: "2026-12-01", amount: "0.29" }),
          context(income.id),
        )
      ).status,
    ).toBe(200);
    expect(
      (await (await monthlySummary(monthRequest())).json()).totals.count,
    ).toBe(0);
    const december = await (
      await monthlySummary(monthRequest("month=2026-12&kind=income"))
    ).json();
    expect(december.totals).toMatchObject({
      incomeMinor: 29,
      expectedMinor: 0,
      netMinor: 29,
    });
    expect(december.records[0].status).toBe("received");
    expect(
      (await deleteIncome(req("income", {}), context(income.id))).status,
    ).toBe(200);
    expect(
      (await (await monthlySummary(monthRequest("month=2026-12"))).json())
        .totals.count,
    ).toBe(0);
  });
  it("blocks another user from income records and monthly/yearly aggregates", async () => {
    const a = await makeUser(),
      b = await makeUser("b@example.com");
    signInAs(a);
    const { income } = await (
      await createIncome(req("income", incomeData))
    ).json();
    await createExpense(req("expenses", { ...expenseData, currency: "INR" }));
    signInAs(b);
    const summary = await (
      await monthlySummary(
        monthRequest(`month=2026-11&kind=income&userId=${a._id}`),
      )
    ).json();
    expect(summary.records).toEqual([]);
    expect(summary.categories).toEqual([]);
    expect(summary.months.every((m: { count: number }) => m.count === 0)).toBe(
      true,
    );
    expect(
      (
        await editIncome(
          req("income", { ...incomeData, amount: "1" }),
          context(income.id),
        )
      ).status,
    ).toBe(404);
    expect(
      (await deleteIncome(req("income", {}), context(income.id))).status,
    ).toBe(404);
    expect((await Income.findById(income.id)).amountMinor).toBe(5000025);
  });
  it("validates income, month selection and mutation origins", async () => {
    const user = await makeUser();
    signInAs(user);
    for (const invalid of [
      { amount: "0" },
      { amount: "-1" },
      { amount: "0.001" },
      { date: "2026-02-29" },
      { category: "Groceries" },
      { status: "paid" },
      { description: " " },
      { userId: String(user._id) },
    ])
      expect(
        (await createIncome(req("income", { ...incomeData, ...invalid })))
          .status,
      ).toBe(400);
    expect(
      (await createIncome(req("income", incomeData, "https://evil.example")))
        .status,
    ).toBe(403);
    expect(
      (await editIncome(req("income", incomeData), context("invalid"))).status,
    ).toBe(404);
    for (const query of [
      "month=2026-13",
      "month=2026-1",
      "month=2026-11&page=0",
      "month=2026-11&kind=unknown",
      "month=1899-12",
    ])
      expect((await monthlySummary(monthRequest(query))).status).toBe(400);
    expect(await Income.countDocuments({})).toBe(0);
  });
  it("paginates income records while totals include the full month", async () => {
    const user = await makeUser();
    signInAs(user);
    await Income.insertMany(
      Array.from({ length: 55 }, () => ({
        userId: user._id,
        amountMinor: 10,
        date: "2026-11-01",
        currency: "INR",
        category: "Other",
        description: "Test income",
        status: "received",
      })),
    );
    const result = await (
      await monthlySummary(monthRequest("month=2026-11&kind=income&page=2"))
    ).json();
    expect(result.records).toHaveLength(5);
    expect(result.count).toBe(55);
    expect(result.totals).toMatchObject({
      incomeMinor: 550,
      netMinor: 550,
      count: 55,
    });
  });
});
describe("expenses", () => {
  it("rejects anonymous reads, creation, updates and deletion", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    expect((await listExpenses(listRequest())).status).toBe(401);
    expect((await createExpense(req("expenses", expenseData))).status).toBe(
      401,
    );
    expect(
      (await editExpense(req("expenses", expenseData), context("a".repeat(24))))
        .status,
    ).toBe(401);
    expect(
      (await deleteExpense(req("expenses", {}), context("a".repeat(24))))
        .status,
    ).toBe(401);
  });
  it("creates, edits and deletes an expense using integer minor units", async () => {
    const user = await makeUser();
    signInAs(user);
    const response = await createExpense(req("expenses", expenseData));
    expect(response.status).toBe(201);
    const { expense } = await response.json();
    expect(expense.amountMinor).toBe(1234);
    expect(expense.userId).toBeUndefined();
    expect(String((await Expense.findById(expense.id)).userId)).toBe(
      String(user._id),
    );
    const edited = await editExpense(
      req("expenses", {
        ...expenseData,
        amount: "0.29",
        description: "Updated",
      }),
      context(expense.id),
    );
    expect(edited.status).toBe(200);
    expect((await edited.json()).expense).toMatchObject({
      amountMinor: 29,
      description: "Updated",
    });
    expect(
      (await deleteExpense(req("expenses", {}), context(expense.id))).status,
    ).toBe(200);
    expect(await Expense.countDocuments({ userId: user._id })).toBe(0);
  });
  it("isolates lists, totals, charts, edits and deletion between users", async () => {
    const a = await makeUser(),
      b = await makeUser("b@example.com");
    signInAs(a);
    const { expense } = await (
      await createExpense(req("expenses", expenseData))
    ).json();
    signInAs(b);
    const listing = await (
      await listExpenses(listRequest(`?userId=${a._id}&currency=USD`))
    ).json();
    expect(listing).toMatchObject({
      expenses: [],
      count: 0,
      totalMinor: 0,
      trend: [],
      byCategory: [],
    });
    expect(
      (
        await editExpense(
          req("expenses", { ...expenseData, amount: "999" }),
          context(expense.id),
        )
      ).status,
    ).toBe(404);
    expect(
      (await deleteExpense(req("expenses", {}), context(expense.id))).status,
    ).toBe(404);
    expect((await Expense.findById(expense.id)).amountMinor).toBe(1234);
  });
  it("validates amounts, real calendar dates, categories, identifiers and origins", async () => {
    const user = await makeUser();
    signInAs(user);
    for (const invalid of [
      { amount: "0" },
      { amount: "-1" },
      { amount: "1.234" },
      { amount: "1e3" },
      { amount: "10000000" },
      { date: "2026-02-30" },
      { category: "unknown" },
      { description: " " },
      { userId: String(user._id) },
    ]) {
      expect(
        (await createExpense(req("expenses", { ...expenseData, ...invalid })))
          .status,
      ).toBe(400);
    }
    expect(
      (
        await createExpense(
          req("expenses", expenseData, "https://evil.example"),
        )
      ).status,
    ).toBe(403);
    expect(
      (await editExpense(req("expenses", expenseData), context("invalid")))
        .status,
    ).toBe(404);
    expect((await listExpenses(listRequest("?month=2026-13"))).status).toBe(
      400,
    );
    expect(await Expense.countDocuments({})).toBe(0);
  });
  it("filters by month, category and currency, with exact totals across paginated records", async () => {
    const user = await makeUser();
    signInAs(user);
    const base = {
      userId: user._id,
      amountMinor: 10,
      date: "2026-11-23",
      category: "Groceries",
      description: "An expense",
      currency: "USD",
    };
    await Expense.insertMany([
      ...Array.from({ length: 55 }, () => ({ ...base })),
      { ...base, currency: "INR", amountMinor: 999 },
      { ...base, date: "2026-10-23" },
      { ...base, category: "Transport" },
    ]);
    const result = await (
      await listExpenses(
        listRequest("?month=2026-11&category=Groceries&currency=USD"),
      )
    ).json();
    expect(result.expenses).toHaveLength(50);
    expect(result.count).toBe(55);
    expect(result.totalMinor).toBe(550);
    expect(result.byCategory).toEqual([
      { label: "Groceries", amountMinor: 550 },
    ]);
    expect(result.trend).toEqual([{ label: "2026-11", amountMinor: 550 }]);
    const second = await (
      await listExpenses(
        listRequest("?month=2026-11&category=Groceries&currency=USD&page=2"),
      )
    ).json();
    expect(second.expenses).toHaveLength(5);
    expect(second.totalMinor).toBe(550);
    const inr = await (await listExpenses(listRequest("?currency=INR"))).json();
    expect(inr.totalMinor).toBe(999);
  });
});
async function makeUser(email = "a@example.com") {
  return User.create({
    name: "Test Person",
    email,
    passwordHash: await hash("a long safe password", 4),
  });
}
describe("authentication and authorization", () => {
  it("registers with a hashed password and an empty account; rejects duplicates", async () => {
    const data = {
      name: "New User",
      email: "new@example.com",
      password: "a long safe password",
    };
    const res = await register(req("register", data));
    expect(res.status).toBe(201);
    const user = await User.findOne({ email: data.email }).select(
      "+passwordHash",
    );
    expect(await compare(data.password, user.passwordHash)).toBe(true);
    expect(JSON.stringify(await res.json())).not.toContain(user.passwordHash);
    expect(await Account.countDocuments({ userId: user._id })).toBe(1);
    expect((await Account.findOne({ userId: user._id })).currency).toBe("INR");
    expect((await register(req("register", data))).status).toBe(400);
  });
  it("validates passwords and blocks foreign origins", async () => {
    expect(
      (
        await register(
          req("register", { name: "Hi", email: "a@b.com", password: "short" }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await register(
          req(
            "register",
            { name: "Hi", email: "a@b.com", password: "long enough password" },
            "https://evil.example",
          ),
        )
      ).status,
    ).toBe(400);
  });
  it("accepts correct credentials and rejects wrong passwords", async () => {
    await makeUser();
    const provider = authOptions.providers[0] as unknown as {
      options: { authorize: (c: unknown, r: unknown) => Promise<unknown> };
    };
    expect(
      await provider.options.authorize(
        { email: "a@example.com", password: "wrong" },
        {},
      ),
    ).toBeNull();
    expect(
      await provider.options.authorize(
        { email: "a@example.com", password: "a long safe password" },
        {},
      ),
    ).toMatchObject({ email: "a@example.com" });
  });
  it("rejects anonymous account reads and writes", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await PATCH(req("account", {}))).status).toBe(401);
  });
  it("scopes account reads and updates to the signed-in user, ignoring supplied owner IDs", async () => {
    const a = await makeUser();
    const b = await makeUser("b@example.com");
    await Account.create({ userId: b._id, currency: "GBP" });
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: String(a._id), version: 0 },
      expires: "",
    });
    const response = await PATCH(
      req("account", {
        name: "Updated Name",
        currency: "INR",
        timezone: "Asia/Kolkata",
        userId: String(b._id),
      }),
    );
    expect(response.status).toBe(200);
    expect((await Account.findOne({ userId: b._id })).currency).toBe("GBP");
    expect((await User.findById(b._id)).name).toBe("Test Person");
    expect(await (await GET()).json()).toMatchObject({
      currency: "INR",
      email: a.email,
    });
  });
  it("keeps recovery responses generic and never exposes tokens", async () => {
    await makeUser();
    const known = await (
      await forgot(req("forgot-password", { email: "a@example.com" }))
    ).json();
    const unknown = await (
      await forgot(req("forgot-password", { email: "unknown@example.com" }))
    ).json();
    expect(known).toEqual(unknown);
    expect(vi.mocked(sendReset)).toHaveBeenCalledOnce();
    const token = vi.mocked(sendReset).mock.calls[0][1];
    expect(JSON.stringify(known)).not.toContain(token);
    expect(
      (await User.findOne({ email: "a@example.com" }).select("+resetHash"))
        .resetHash,
    ).toBe(hashToken(token));
  });
  it("atomically consumes reset tokens and revokes old sessions", async () => {
    const user = await makeUser();
    const token = "a".repeat(64);
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetHash: hashToken(token),
          resetExpires: new Date(Date.now() + 60000),
        },
      },
    );
    const data = { token, password: "a different safe password" };
    const results = await Promise.all([
      reset(req("reset-password", data)),
      reset(req("reset-password", data)),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: String(user._id), version: 0 },
      expires: "",
    });
    expect(await currentUser()).toBeNull();
    const updated = await User.findById(user._id).select(
      "+passwordHash +resetHash",
    );
    expect(await compare(data.password, updated.passwordHash)).toBe(true);
    expect(updated.resetHash).toBeUndefined();
  });
  it("rejects expired tokens", async () => {
    const user = await makeUser();
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetHash: hashToken("b".repeat(64)),
          resetExpires: new Date(Date.now() - 1000),
        },
      },
    );
    expect(
      (
        await reset(
          req("reset-password", {
            token: "b".repeat(64),
            password: "a different safe password",
          }),
        )
      ).status,
    ).toBe(400);
  });
  it("enforces a shared persistent rate limit", async () => {
    await rateLimit("test", 2);
    await rateLimit("test", 2);
    await expect(rateLimit("test", 2)).rejects.toThrow("Too many attempts");
  });
});
