import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NewsletterPage from "./newsletter-page";

export const metadata = { title: "Newsletter Subscribers" };

export default async function NewsletterSubscribersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await auth();
  const roles = ((session?.user as any)?.roles as string[] | undefined) ?? [];
  const perms = ((session?.user as any)?.permissions as string[] | undefined) ?? [];
  if (!session?.user) {
    const callbackUrl = encodeURIComponent("/dashboard/marketing/newsletter");
    redirect(`/login-v2?callbackUrl=${callbackUrl}`);
  }
  if (!roles.includes("super_admin") && !perms.includes("newsletter.view") && !perms.includes("newsletter.manage")) {
    redirect("/unauthorized");
  }

  await searchParams;
  return <NewsletterPage />;
}
