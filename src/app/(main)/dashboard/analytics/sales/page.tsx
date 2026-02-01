import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SalesAnalyticsPage from "./sales-page";

export const metadata = { title: "Sales Analytics" };

export default async function Page() {
  const session = await auth();
  const roles = ((session?.user as any)?.roles as string[] | undefined) ?? [];
  const perms = ((session?.user as any)?.permissions as string[] | undefined) ?? [];
  
  if (!session?.user) {
    const callbackUrl = encodeURIComponent("/dashboard/analytics/sales");
    redirect(`/login-v2?callbackUrl=${callbackUrl}`);
  }
  
  if (!roles.includes("super_admin") && !perms.includes("analytics.view") && !perms.includes("analytics.manage")) {
    redirect("/unauthorized");
  }

  return <SalesAnalyticsPage />;
}
