import { currentUser } from "@/lib/auth";
import { ExpenseWorkspace } from "@/components/expense-workspace";
export default async function Dashboard() {
  const user = await currentUser();
  if (!user) return null;
  return (
    <>
      <div className="eyebrow mb-3">YOUR FINANCIAL PICTURE</div>
      <h1 className="page-title">Welcome, {user.name.split(" ")[0]}.</h1>
      <p className="muted mb-8">Your money in and money out, month by month.</p>
      <ExpenseWorkspace monthly />
    </>
  );
}
