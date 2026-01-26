import type { Metadata } from "next";
import { PageHeader } from "@/components/storefront/static/page-header";
import { PageBreadcrumbs } from "@/components/storefront/static/breadcrumbs";
import { Toc } from "@/components/storefront/static/toc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how we collect, use, and protect your personal information.",
  alternates: {
    canonical: "/privacy",
  },
};

const LAST_UPDATED = "2025-11-09"; // TODO: replace with your official date

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-4">
        <PageBreadcrumbs items={[{ href: "/", label: "Home" }, { label: "Legal" }, { label: "Privacy" }]} />
      </div>
      <PageHeader title="Privacy Policy" subtitle="How we collect, use, and protect your personal information." />
      <p className="text-sm text-muted-foreground mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3">
          <Toc
            items={[
              { id: "overview", title: "Overview" },
              { id: "info-we-collect", title: "Information we collect" },
              { id: "how-we-use", title: "How we use information" },
              { id: "cookies", title: "Cookies & tracking" },
              { id: "sharing", title: "Sharing" },
              { id: "retention", title: "Retention" },
              { id: "your-rights", title: "Your rights" },
              { id: "contact", title: "Contact" },
              { id: "changes", title: "Changes" },
            ]}
          />
        </div>
        <div className="lg:col-span-9">
          <div className="rounded-xl border ring-1 ring-border bg-card p-6 lg:p-8 shadow-sm max-w-3xl">
            <div className="prose prose-neutral lg:prose-lg dark:prose-invert max-w-none">
              <h2 id="overview" className="scroll-mt-24">1. Overview</h2>
              <p>We respect your privacy and are committed to protecting your personal information. This policy explains what we collect, how we use it, and the choices you have.</p>
            </div>
            <div className="not-prose mt-4">
              <Alert>
                <AlertTitle>Summary</AlertTitle>
                <AlertDescription className="text-sm">This page summarizes how we handle your data. For any region-specific rights, contact us and we’ll assist promptly.</AlertDescription>
              </Alert>
            </div>
            <div className="prose prose-neutral lg:prose-lg dark:prose-invert max-w-none mt-6">
              <h2 id="info-we-collect" className="scroll-mt-24">2. Information we collect</h2>
              <ul>
                <li><strong>Information you provide</strong>: account details, orders, reviews, support messages.</li>
                <li><strong>Automatic data</strong>: device info, IP, usage analytics, cookies.</li>
                <li><strong>From partners</strong>: payment providers, shipping carriers, fraud prevention tools.</li>
              </ul>

              <h2 id="how-we-use" className="scroll-mt-24">3. How we use information</h2>
              <ul>
                <li>Provide and improve our services, fulfill orders, and personalize your experience.</li>
                <li>Communicate about orders, products, and promotions (you can opt out anytime).</li>
                <li>Maintain security, prevent fraud, and comply with legal obligations.</li>
              </ul>

              <hr className="my-6" />
              <h2 id="cookies" className="scroll-mt-24">4. Cookies & tracking</h2>
              <p>We use cookies and similar technologies for essential functionality, performance, and marketing. You can control cookies in your browser settings.</p>

              <hr className="my-6" />
              <h2 id="sharing" className="scroll-mt-24">5. Sharing</h2>
              <p>We share data with service providers (e.g., payment, shipping, analytics) under contracts requiring appropriate protections. We don’t sell your personal information.</p>

              <hr className="my-6" />
              <h2 id="retention" className="scroll-mt-24">6. Retention</h2>
              <p>We retain your data only as long as necessary for the purposes above or as required by law.</p>

              <hr className="my-6" />
              <h2 id="your-rights" className="scroll-mt-24">7. Your rights</h2>
              <p>Depending on your region, you may have rights to access, correct, delete, or export your data, and to object or restrict certain processing.</p>

              <hr className="my-6" />
              <h2 id="contact" className="scroll-mt-24">8. Contact</h2>
              <p>For privacy questions or requests, contact <a href="mailto:privacy@store.local">privacy@store.local</a>.</p>

              <hr className="my-6" />
              <h2 id="changes" className="scroll-mt-24">9. Changes to this policy</h2>
              <p>We may update this policy. We’ll post the latest version here and update the “Last updated” date.</p>
            </div>
            <div className="not-prose mt-8">
              <div className="rounded-lg border ring-1 ring-border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="font-medium">Still have privacy questions?</div>
                  <div className="text-sm text-muted-foreground">Reach out and we’ll get back within 1 business day.</div>
                </div>
                <a href="/contact" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow hover:opacity-95">Contact support</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
