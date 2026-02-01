import { auth } from "@/auth";
import { redirect } from "next/navigation";
import CustomersAnalyticsPage from "./customers-page";

export const metadata = { title: "Customers Analytics" };

export default async function Page() {
  const session = await auth();
  const roles = ((session?.user as any)?.roles as string[] | undefined) ?? [];
  const perms = ((session?.user as any)?.permissions as string[] | undefined) ?? [];
  
  if (!session?.user) {
    const callbackUrl = encodeURIComponent("/dashboard/analytics/customers");
    redirect(`/login-v2?callbackUrl=${callbackUrl}`);
  }
  
  if (!roles.includes("super_admin") && !perms.includes("analytics.view") && !perms.includes("analytics.manage")) {
    redirect("/unauthorized");
  }

  return <CustomersAnalyticsPage />;
}
