import type { Metadata } from "next";
import { PageHeader } from "@/components/storefront/static/page-header";
import { PageBreadcrumbs } from "@/components/storefront/static/breadcrumbs";
import FaqClient from "@/components/storefront/static/faq-client";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-4">
        <PageBreadcrumbs items={[{ href: "/", label: "Home" }, { label: "Help" }, { label: "FAQ" }]} />
      </div>
      <PageHeader title="Frequently Asked Questions" subtitle="Search or browse by category to find answers fast." />
      <FaqClient />
    </div>
  );
}
