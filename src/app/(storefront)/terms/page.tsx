import type { Metadata } from "next";
import { PageHeader } from "@/components/storefront/static/page-header";
import { PageBreadcrumbs } from "@/components/storefront/static/breadcrumbs";
import { Toc } from "@/components/storefront/static/toc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Terms of Service" };

const LAST_UPDATED = "2025-11-09"; // TODO: replace with your official date

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-4">
        <PageBreadcrumbs items={[{ href: "/", label: "Home" }, { label: "Legal" }, { label: "Terms" }]} />
      </div>
      <PageHeader title="Terms of Service" subtitle="Please read these terms carefully before using our services." />
      <p className="text-sm text-muted-foreground mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3">
          <Toc
            items={[
              { id: "agreement", title: "Agreement to Terms" },
              { id: "eligibility", title: "Eligibility" },
              { id: "accounts", title: "Accounts" },
              { id: "orders", title: "Orders & Payments" },
              { id: "shipping", title: "Shipping & Delivery" },
              { id: "returns", title: "Returns & Exchanges" },
              { id: "ip", title: "Intellectual Property" },
              { id: "user-content", title: "User Content" },
              { id: "prohibited", title: "Prohibited Activities" },
              { id: "disclaimers", title: "Disclaimers" },
              { id: "liability", title: "Limitation of Liability" },
              { id: "indemnity", title: "Indemnification" },
              { id: "law", title: "Governing Law" },
              { id: "changes", title: "Changes to Terms" },
              { id: "contact", title: "Contact" },
            ]}
          />
        </div>
        <div className="lg:col-span-9">
          <div className="rounded-xl border ring-1 ring-border bg-card p-6 lg:p-8 shadow-sm max-w-3xl">
            <div className="prose prose-neutral lg:prose-lg dark:prose-invert max-w-none">
              <h2 id="agreement" className="scroll-mt-24">1. Agreement to Terms</h2>
              <p>By accessing or using our services, you agree to be bound by these Terms. If you do not agree, do not use the services.</p>
            </div>
            <div className="not-prose mt-4">
              <Alert>
                <AlertTitle>Summary</AlertTitle>
                <AlertDescription className="text-sm">These Terms govern your use of our services. They include information on orders, returns, intellectual property, and your responsibilities.</AlertDescription>
              </Alert>
            </div>

            <div className="prose prose-neutral lg:prose-lg dark:prose-invert max-w-none mt-6">
            <h2 id="eligibility" className="scroll-mt-24">2. Eligibility</h2>
            <p>You must be at least the age of majority in your jurisdiction to create an account and make purchases.</p>

            <h2 id="accounts" className="scroll-mt-24">3. Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your credentials and for all activities under your account.</p>

            <h2 id="orders" className="scroll-mt-24">4. Orders & Payments</h2>
            <p>All orders are subject to availability and acceptance. Prices may change without notice. You authorize us and our payment processors to charge your selected payment method.</p>

            <h2 id="shipping" className="scroll-mt-24">5. Shipping & Delivery</h2>
            <p>Estimated delivery times are not guaranteed. Risk of loss passes to you upon delivery to the carrier.</p>

            <h2 id="returns" className="scroll-mt-24">6. Returns & Exchanges</h2>
            <p>Returns are accepted within 30 days on eligible items per our Returns & Exchanges policy.</p>

            <h2 id="ip" className="scroll-mt-24">7. Intellectual Property</h2>
            <p>All content and trademarks are owned by us or our licensors. You may not use them without permission.</p>

            <h2 id="user-content" className="scroll-mt-24">8. User Content</h2>
            <p>By submitting reviews or other content, you grant us a worldwide, royalty-free license to use and display such content.</p>

            <h2 id="prohibited" className="scroll-mt-24">9. Prohibited Activities</h2>
            <p>You agree not to misuse the services, including interfering with security or engaging in illegal activities.</p>

            <h2 id="disclaimers" className="scroll-mt-24">10. Disclaimers</h2>
            <p>The services are provided “as is” without warranties of any kind, to the fullest extent permitted by law.</p>

            <h2 id="liability" className="scroll-mt-24">11. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, we are not liable for indirect, incidental, special, or consequential damages.</p>

            <h2 id="indemnity" className="scroll-mt-24">12. Indemnification</h2>
            <p>You agree to defend and hold us harmless from claims arising from your use of the services or violation of these Terms.</p>

            <h2 id="law" className="scroll-mt-24">13. Governing Law</h2>
            <p>These Terms are governed by the laws of your store’s jurisdiction, without regard to conflict of law rules.</p>

            <h2 id="changes" className="scroll-mt-24">14. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Continued use constitutes acceptance of the revised Terms.</p>

            <h2 id="contact" className="scroll-mt-24">15. Contact</h2>
            <p>Questions about these Terms? Contact <a href="mailto:legal@store.local">legal@store.local</a>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
