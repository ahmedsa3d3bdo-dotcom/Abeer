import type { Metadata } from "next";
import { PageHeader } from "@/components/storefront/static/page-header";
import { PageBreadcrumbs } from "@/components/storefront/static/breadcrumbs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/shared/db";
import { shippingMethods } from "@/shared/db/schema/shipping";
import { eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Shipping Information" };

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ShippingPage() {
  const methods = await db
    .select({
      id: shippingMethods.id,
      name: shippingMethods.name,
      description: shippingMethods.description,
      price: shippingMethods.price,
      estimatedDays: shippingMethods.estimatedDays,
      carrier: shippingMethods.carrier,
    })
    .from(shippingMethods)
    .where(eq(shippingMethods.isActive, true))
    .orderBy(shippingMethods.sortOrder);

  const days = methods.map((m) => (m.estimatedDays == null ? null : Number(m.estimatedDays))).filter((v): v is number => Number.isFinite(v));
  const minDays = days.length ? Math.min(...days) : null;
  const maxDays = days.length ? Math.max(...days) : null;
  const domesticText =
    minDays == null
      ? "Shipping methods will appear here once enabled."
      : minDays === maxDays
        ? `${minDays} business days via trusted carriers.`
        : `${minDays}–${maxDays} business days via trusted carriers.`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-4">
        <PageBreadcrumbs items={[{ href: "/", label: "Home" }, { label: "Help" }, { label: "Shipping" }]} />
      </div>
      <PageHeader title="Shipping Information" subtitle="Clear timelines, transparent rates, and reliable tracking on every order." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border ring-1 ring-border p-5 bg-card">
          <h2 className="font-semibold mb-2">Domestic</h2>
          <p className="text-sm text-muted-foreground">{domesticText}</p>
        </div>
        <div className="rounded-xl border ring-1 ring-border p-5 bg-card">
          <h2 className="font-semibold mb-2">Tracking</h2>
          <p className="text-sm text-muted-foreground">A tracking link is emailed as soon as your order ships. Updates in real time.</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border ring-1 ring-border p-6 bg-card">
        <h2 className="font-semibold mb-4">Shipping Rates</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead>Delivery Time</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {methods.length ? (
              methods.map((m) => {
                const d = m.estimatedDays == null ? null : Number(m.estimatedDays);
                const priceNum = Number(m.price);
                const priceLabel = Number.isFinite(priceNum) ? (priceNum <= 0 ? "Free" : `$${priceNum.toFixed(2)}`) : String(m.price);
                const deliveryLabel = d == null || !Number.isFinite(d) ? "—" : `${d} business days`;
                return (
                  <TableRow key={m.id}>
                    <TableCell>{m.name}</TableCell>
                    <TableCell>{deliveryLabel}</TableCell>
                    <TableCell>{priceLabel}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                  No active shipping methods.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableCaption className="text-xs">Delivery timeframes are estimates once your order has shipped.</TableCaption>
        </Table>
      </div>
    </div>
  );
}
