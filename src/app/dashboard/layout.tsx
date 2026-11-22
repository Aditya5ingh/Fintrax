import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <DashboardShell name={user.name}>{children}</DashboardShell>;
}
