import { ExpenseWorkspace } from "@/components/expense-workspace";
export default function MonthlyPage() {
  return (
    <>
      <h1 className="page-title">Monthly finances</h1>
      <p className="muted mb-8">
        A clear record for every month and every year.
      </p>
      <ExpenseWorkspace monthly />
    </>
  );
}
