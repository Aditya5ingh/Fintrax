import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container py-24">
      <h1 className="page-title">This page isn’t here.</h1>
      <Link href="/" className="text-link">
        Return to FinanceFlow
      </Link>
    </main>
  );
}
