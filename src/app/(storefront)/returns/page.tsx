import type { Metadata } from "next";
import { PageHeader } from "@/components/storefront/static/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageBreadcrumbs } from "@/components/storefront/static/breadcrumbs";

export const metadata: Metadata = { title: "Returns & Exchanges" };

export default function ReturnsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-4">
        <PageBreadcrumbs items={[{ href: "/", label: "Home" }, { label: "Help" }, { label: "Returns & Exchanges" }]} />
      </div>
      <PageHeader title="Returns & Exchanges" subtitle="Hassle-free returns within 30 days. Free exchanges on eligible items." />

      <Tabs defaultValue="returns" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="exchanges">Exchanges</TabsTrigger>
        </TabsList>

        <TabsContent value="returns">
          <div className="rounded-xl border ring-1 ring-border p-6 bg-card">
            <h2 className="font-semibold mb-3">How returns work</h2>
            <ol className="list-decimal ml-5 space-y-2 text-sm text-muted-foreground">
              <li>Start your return from <Link href="/account/orders" className="underline">Order History</Link> within 30 days.</li>
              <li>Print the prepaid label and pack your items securely with tags intact.</li>
              <li>Drop off at the carrier. Refunds are issued 3–5 business days after inspection.</li>
            </ol>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-2">Eligibility</h3>
                <ul className="list-disc ml-5 text-sm text-muted-foreground space-y-1">
                  <li>Unused, unwashed, tags attached</li>
                  <li>Original packaging where applicable</li>
                  <li>Final-sale items excluded</li>
                </ul>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-2">Refunds</h3>
                <ul className="list-disc ml-5 text-sm text-muted-foreground space-y-1">
                  <li>Original payment method</li>
                  <li>Gift orders refunded as store credit</li>
                  <li>Shipping fees non-refundable (unless defective)</li>
                </ul>
              </div>
            </div>
            <div className="mt-6">
              <Button asChild size="lg"><Link href="/account/orders">Start a return</Link></Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="exchanges">
          <div className="rounded-xl border ring-1 ring-border p-6 bg-card">
            <h2 className="font-semibold mb-3">How exchanges work</h2>
            <ol className="list-decimal ml-5 space-y-2 text-sm text-muted-foreground">
              <li>Choose a different size or color from <Link href="/account/orders" className="underline">Order History</Link>.</li>
              <li>We’ll reserve your replacement item for 7 days.</li>
              <li>Ship back your original item using the prepaid label.</li>
            </ol>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-2">Free exchanges</h3>
                <p className="text-sm text-muted-foreground">Size/color exchanges are free for domestic orders.</p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-2">Stock availability</h3>
                <p className="text-sm text-muted-foreground">If a replacement goes out of stock, we’ll issue a refund.</p>
              </div>
            </div>
            <div className="mt-6">
              <Button asChild size="lg" variant="outline"><Link href="/account/orders">Start an exchange</Link></Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
