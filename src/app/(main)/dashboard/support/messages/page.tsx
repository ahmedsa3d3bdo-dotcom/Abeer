import { auth } from "@/auth";
import { redirect } from "next/navigation";
import MessagesPage from "./messages-page";

export const metadata = { title: "Contact Messages" };

export default async function ContactMessagesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await auth();
  const roles = ((session?.user as any)?.roles as string[] | undefined) ?? [];
  const perms = ((session?.user as any)?.permissions as string[] | undefined) ?? [];
  if (!session?.user) {
    const callbackUrl = encodeURIComponent("/dashboard/support/messages");
    redirect(`/login-v2?callbackUrl=${callbackUrl}`);
  }
  if (!roles.includes("super_admin") && !perms.includes("support.view") && !perms.includes("support.manage")) {
    redirect("/unauthorized");
  }

  await searchParams;
  return <MessagesPage />;
}
