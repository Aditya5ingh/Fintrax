import { ExpenseWorkspace } from "@/components/expense-workspace";
export default function Expenses() {
  return (
    <>
      <div className="eyebrow mb-3">THE EVERYDAY DETAILS</div>
      <h1 className="page-title">Expense tracker</h1>
      <p className="muted mb-8">
        Your expenses, organized in one personal space.
      </p>
      <ExpenseWorkspace />
    </>
  );
}
