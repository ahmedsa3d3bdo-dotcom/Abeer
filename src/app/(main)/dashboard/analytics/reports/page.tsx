import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ReportsPage from "./reports-page";

export const metadata = { title: "Reports Hub" };

export default async function Page() {
  const session = await auth();
  const roles = ((session?.user as any)?.roles as string[] | undefined) ?? [];
  const perms = ((session?.user as any)?.permissions as string[] | undefined) ?? [];
  
  if (!session?.user) {
    const callbackUrl = encodeURIComponent("/dashboard/analytics/reports");
    redirect(`/login-v2?callbackUrl=${callbackUrl}`);
  }
  
  if (!roles.includes("super_admin") && !perms.includes("reports.view") && !perms.includes("reports.manage")) {
    redirect("/unauthorized");
  }

  return <ReportsPage />;
}
