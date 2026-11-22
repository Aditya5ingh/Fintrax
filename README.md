# FinanceFlow

A multi-user personal finance foundation built with Next.js App Router, TypeScript, Tailwind CSS 4, shadcn-style UI primitives (Radix Slot and CVA), MongoDB/Mongoose, Auth.js (`next-auth` stable v4), Zod and Recharts. Node.js 22.12+ recommended. No seed scripts or personal financial data are included.

## Local setup

1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `MONGODB_URI` to a local MongoDB database or an Atlas connection string. For Atlas, create a database user with access only to the FinanceFlow database, allow the server's network address, and URL-encode special characters in credentials. Never prefix secrets with `NEXT_PUBLIC_`.
4. Generate `NEXTAUTH_SECRET` with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and put the result in `.env.local`.
5. Set `NEXTAUTH_URL=http://localhost:3000` for development.
6. Configure SMTP (see below), then run `npm run dev`. Open http://localhost:3000.

## Email and password recovery

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM`. Port 465 normally uses `SMTP_SECURE=true`; port 587 normally uses false with STARTTLS. For local testing, run Mailpit separately and use `SMTP_HOST=127.0.0.1`, port 1025 and `SMTP_SECURE=false`, then read messages in its inbox on port 8025. Using the loopback IP avoids local DNS timeouts. Reset links are sent only by email; they are never returned by APIs or printed to logs. Without a working provider, recovery intentionally returns the same generic response but cannot deliver email.

For this Windows workspace, run `npm run dev:mail` in a second terminal. On first run it downloads the official Mailpit release, verifies its published checksum, and extracts it into the ignored `.tools/` directory. On other platforms install Mailpit first. The inbox is at http://127.0.0.1:8025, and both SMTP and inbox are bound to loopback only. The local catcher accepts test SMTP credentials and never delivers messages to real recipients. Use a real SMTP provider for deployed email delivery. See the [Mailpit installation documentation](https://mailpit.axllent.org/docs/install/).

Recovery tokens contain 256 bits of randomness, are stored as SHA-256 hashes, expire in 20 minutes, and are consumed using an atomic database update. A new request replaces the prior token. Password reset increments the session version, making all previous sessions unusable for protected data access. Unknown emails and failures receive the same public recovery response; this is not a guarantee against timing analysis.

## Manual acceptance checks

- Open `/dashboard` while signed out: it redirects to `/login`. `/api/account` returns 401.
- Register at `/register` with a unique email and a 12–72 character password (maximum 72 UTF-8 bytes). Sign in at `/login`. Confirm an empty expense dashboard and no seeded activity.
- Visit `/dashboard/settings`, save your name, currency and IANA timezone, then refresh. Preferences persist.
- Use a second browser profile to register a second user. Confirm the accounts and settings are independent. APIs never accept an owner ID from the client.
- Sign out using sidebar navigation (or the mobile header button). Revisit the dashboard and confirm the redirect.
- Request a reset at `/forgot-password`, open the emailed link, reset, and sign in with the new password. The old password, reused reset link, expired links, and old authenticated sessions must fail.
- Toggle light/dark mode; test narrow screens and keyboard navigation.

## Checks and production

`npm run typecheck`, `npm test`, and `npm run build`. Tests use an isolated ephemeral MongoDB via mongodb-memory-server. They automatically detect a standard Windows MongoDB installation, or you can set `MONGOMS_SYSTEM_BINARY` to your `mongod` executable (and `MONGOMS_SYSTEM_BINARY_VERSION_CHECK=false` when its version differs from the download default). Otherwise the first run downloads MongoDB and requires network access; large downloads may exceed the test hook timeout, so a local executable is preferable. No tests connect to your real database. A separate test verifies recovery email delivery with a local test SMTP socket. `npm start` serves the production build.

Production requires HTTPS, a strong unique secret, the canonical HTTPS `NEXTAUTH_URL`, MongoDB and working SMTP. Auth.js handles CSRF for its own endpoints and uses encrypted JWTs in HttpOnly, SameSite=Lax cookies; cookies are Secure in production. Custom mutation endpoints require an exact matching Origin. Authenticated reads validate the current user and session version in MongoDB on each request. No browser local storage is used for authentication (theme preference may be stored by next-themes).

Passwords use bcrypt cost 12 and explicit byte limits. Login limits are shared MongoDB fixed-window counters: 5 attempts per normalized email per 15 minutes plus 1,000 global attempts per 15 minutes; registration and recovery have smaller caps. This works across instances, fails closed if MongoDB is unavailable, and requires unique indexes on User.email, Account.userId, and RateLimit.key. Mongoose creates them during normal initialization; provision and verify indexes as part of production deployment if automatic indexing is disabled. Add gateway-level IP/bot protections before a public launch and tune global caps to traffic; global caps can affect legitimate users. Never trust arbitrary forwarded IP headers. Generic recovery content reduces enumeration, but registration failure and response timings are not intended as perfect account-existence concealment.

## Architecture and scope

- `src/app`: public landing/auth pages, protected dashboard/settings, route handlers.
- `src/lib`: connection reuse, validation, authentication, security and SMTP delivery.
- `src/models`: User, financial Account, and shared rate-limit records. Account is a financial workspace, distinct from an OAuth provider account.
- `src/components`: responsive shell, forms, themes, analytics and reusable UI.
- `tests`: database-backed registration, credential, recovery, session revocation and cross-user authorization checks.

The financial Account contains preferences. Expense tracking supports creating, editing and deleting expenses, month/category/currency filters, totals and Recharts spending analytics. Monthly finances adds received and expected income, a year overview, and separate summaries for every month. Budgets, savings, debts, recurring payments, exports and additional reporting remain future work. Profile email changes, email verification and MFA are not included.

## Monthly finances and income

Open `/dashboard/monthly` or the dashboard Overview. Choose a named month (such as November) and year, use Previous/Next month across year boundaries, or click one of the twelve month cards. Change the year and press **View**. **This month** returns to the current month in your account timezone. INR remains the default, and every summary includes only the selected currency.

Use **Add income** to record money received or expected, including a source, date, amount and description. Future-month income starts as Expected. When it arrives, edit it, mark it Received, and set its actual receipt date. Use **Add expense** for spending. New records default to the selected month; changing a record's date moves it to that date's month. Existing expenses automatically appear in their corresponding months. Nothing is preloaded into any month.

Monthly net = received income minus recorded expenses. Expected income is displayed separately and excluded from net. Each month stands on its own: these are activity summaries, not bank balances, and no opening balance or carry-forward is assumed. Year charts compare received income and expenses; the month cards also show expected income and net. Income and expense lists paginate independently at 50 entries; summaries use all matching records. Editing or deleting an entry recalculates the month and year summaries.

Income uses its own indexed collection, with integer minor units and required owner IDs. Monthly aggregation, income mutations and expense mutations all use the verified session owner. Automated checks cover month/year boundaries, expected-to-received changes, moving entries, currency separation, pagination and cross-user isolation.

## Expense tracking

Open `/dashboard/expenses` or use the Expenses navigation item. Select **Add expense**, enter an amount, currency, date, category and description, then save. Edit using the pencil button; deletion requires a separate confirmation. The dashboard includes the same spending workspace. The initial month and date use your account timezone, and the currency defaults to your account preference.

INR is the default for new accounts and every currency fallback, and appears first in currency selectors. Rupee amounts use Indian number grouping. Existing account preferences can be switched to INR once with `npm run db:default-inr`; this changes preferences only and never changes expense amounts or currencies. Choosing a different currency in settings remains supported. Saved settings refresh the profile immediately.

Filter by month and category; clear the month input for all dates. Lists contain 50 records per page, ordered newest date first, while totals and charts cover all matching records. Each expense keeps its own currency: switching preferences does not convert or relabel old records. Select a currency in the filters to view its records and totals. No exchange-rate conversion or mixed-currency total is performed.

Amounts must be positive, at most 9,999,999.99, with no more than two decimal places. The database stores integer minor units and validated calendar dates without timezone conversion. Both server and client validate inputs. Every list, aggregation, update and delete is scoped to the authenticated user; record ownership cannot be supplied or changed by clients. Tests cover CRUD, anonymous access, guessed IDs, cross-user totals and charts, validation, filtering, currency isolation and pagination. Nothing is seeded in the application database.

Authentication follows the stable [Auth.js/NextAuth credentials provider](https://next-auth.js.org/providers/credentials) and [JWT session configuration](https://next-auth.js.org/configuration/options). Credentials authentication uses JWT sessions rather than an unsupported credentials/database-session combination. Financial Account documents are unrelated to Auth.js adapter Account documents; no adapter is configured.

The Nodemailer peer is explicitly overridden to a patched v10 release because stable NextAuth v4 declares an older optional email-provider peer range. This application uses only the Credentials provider; its separate SMTP reset service is covered by a real transport test. Keep the override and lockfile together when updating dependencies.

For full HTTP acceptance checks, run `npm run build` followed by `npm run test:http`. This starts the production app on an unused local port with an isolated temporary MongoDB and SMTP server. It verifies real registration, login/logout, secure HttpOnly cookie headers, INR defaults, settings, expense CRUD/filtering, cross-user access denial, email recovery, single-use reset links and session revocation. It does not create test accounts or expenses in your application database. This complements the unit/integration suite; it does not perform browser visual testing.
