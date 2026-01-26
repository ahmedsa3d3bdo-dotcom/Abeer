import type { Metadata } from "next";
import ContactForm from "@/components/storefront/static/contact-form";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { PageBreadcrumbs } from "@/components/storefront/static/breadcrumbs";
import { settingsRepository } from "@/server/repositories/settings.repository";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get help with orders, shipping, returns, and product questions. Reach us by email, phone, or chat.",
  alternates: {
    canonical: "/contact",
  },
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ContactPage() {
  const { items } = await settingsRepository.list({ page: 1, limit: 500, isPublic: true, sort: "createdAt.asc" });
  const settings: Record<string, string> = {};
  for (const s of items as any[]) {
    settings[String(s.key)] = String(s.value ?? "");
  }

  const email: string = String(settings["email"] || "support@store.local");
  const phone: string = String(settings["phone"] || "+1 (555) 000-0000");
  const city: string = String(settings["city"] || "City");
  const province: string = String(settings["province"] || "");
  const country: string = String(settings["app.country"] || settings["country"] || "");
  const timezone: string = String(settings["contact.timezone"] || settings["app.time_zone"] || "");
  const hours: string = String(settings["contact.hours"] || settings["hours"] || "Mon–Fri, 9:00–18:00");
  const address: string = String(
    settings["contact.address"] ||
      settings["address"] ||
      [city, province, country].filter(Boolean).join(", ") ||
      "123 Commerce St, City",
  );
  const responseTime: string = String(settings["contact.response_time"] || "Our team responds within 24 hours on business days.");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-4">
        <PageBreadcrumbs items={[{ href: "/", label: "Home" }, { label: "Contact" }]} />
      </div>
      {/* Hero header */}
      <div className="rounded-2xl border ring-1 ring-border bg-gradient-to-br from-primary/10 via-background to-primary/10 p-8 sm:p-10 mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">We're here to help</h1>
        <p className="text-muted-foreground mt-2">{responseTime}</p>
      </div>

      {/* Channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="rounded-xl border ring-1 ring-border p-5 bg-card">
          <div className="flex items-center gap-3 mb-2"><MessageSquare className="h-5 w-5" /><div className="font-semibold">Live chat</div></div>
          <p className="text-sm text-muted-foreground">Chat with us {hours}{timezone ? ` (${timezone})` : ""}.</p>
        </div>
        <div className="rounded-xl border ring-1 ring-border p-5 bg-card">
          <div className="flex items-center gap-3 mb-2"><Mail className="h-5 w-5" /><div className="font-semibold">Email</div></div>
          <p className="text-sm text-muted-foreground">{email} — we reply within 24h.</p>
        </div>
        <div className="rounded-xl border ring-1 ring-border p-5 bg-card">
          <div className="flex items-center gap-3 mb-2"><Phone className="h-5 w-5" /><div className="font-semibold">Phone</div></div>
          <p className="text-sm text-muted-foreground">{phone} — {hours}{timezone ? ` (${timezone})` : ""}.</p>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="rounded-xl border ring-1 ring-border p-4 space-y-3 bg-card">
            <div><div className="text-sm font-medium">Email</div><div className="text-sm text-muted-foreground">{email}</div></div>
            <div><div className="text-sm font-medium">Hours</div><div className="text-sm text-muted-foreground">{hours}</div></div>
            <div><div className="text-sm font-medium">Address</div><div className="text-sm text-muted-foreground">{address}</div></div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-2xl border ring-1 ring-border p-6 bg-card">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
