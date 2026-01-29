"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
    Download,
    FileText,
    ShoppingCart,
    Loader2,
    Check,
    FileSpreadsheet,
    FileCode,
    Receipt,
    Package,
    ArrowLeft,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAdminExport, type ExportFormat, type AdminExportConfig } from "@/hooks/use-admin-export";
import { toast } from "sonner";
import Link from "next/link";
import { siteConfig } from "@/config/site";

const formatIcons: Record<string, any> = {
    pdf: FileText,
    xlsx: FileSpreadsheet,
    csv: FileCode,
};

export default function OrderDetailExportPage() {
    const params = useParams();
    const orderId = params.orderId as string;

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedFormats, setSelectedFormats] = useState<Record<string, ExportFormat>>({});
    const [publicSettings, setPublicSettings] = useState<Record<string, string> | null>(null);

    useEffect(() => {
        async function fetchOrder() {
            try {
                setLoading(true);
                const res = await fetch(`/api/v1/orders/${orderId}/details`);
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error?.message || "Failed to load order");
                setOrder(data.data);
            } catch (e: any) {
                toast.error(e.message || "Failed to load order");
            } finally {
                setLoading(false);
            }
        }
        if (orderId) {
            void fetchOrder();
        }
    }, [orderId]);

    useEffect(() => {
        fetch("/api/storefront/settings/public", { cache: "no-store" })
            .then((r) => r.json())
            .then((json) => {
                const items = json?.data?.items;
                if (!Array.isArray(items)) return;
                const map: Record<string, string> = {};
                for (const it of items) {
                    if (it?.key && typeof it?.value === "string") map[String(it.key)] = it.value;
                }
                setPublicSettings(map);
            })
            .catch(() => setPublicSettings(null));
    }, []);

    const siteName = publicSettings?.site_name || siteConfig.name || "";

    const seller = useMemo(() => {
        const get = (key: string) => String(publicSettings?.[key] ?? "").trim();

        const name = get("seller.name") || get("seller_name") || get("site_name") || siteConfig.name || "";
        const email = get("seller.email") || get("seller_email") || get("email") || "support@example.com";
        const phone = get("seller.phone") || get("seller_phone") || get("phone") || "";

        const addressLine1 =
            get("seller.address_line1") ||
            get("seller.addressLine1") ||
            get("contact.address") ||
            get("address") ||
            "123 Commerce St.";

        const city = get("seller.city") || get("city") || "City";
        const province = get("seller.province") || get("seller.state") || get("province") || get("state") || "ST";
        const postalCode = get("seller.postal_code") || get("seller.postalCode") || get("postal_code") || get("postalCode");
        const country = get("seller.country") || get("app.country") || get("country") || "United States";

        const cityLine = `${[city, province].filter(Boolean).join(", ")}${postalCode ? ` ${postalCode}` : ""}`.trim();

        return { name, email, phone, addressLine1, cityLine, country };
    }, [publicSettings]);

    // Create dynamic export configs based on the loaded order
    const orderExports: Array<AdminExportConfig & { icon: any; iconBg: string }> = [
        {
            id: "order-details",
            name: "Order Details",
            type: "orders",
            description: "Complete order information with items and totals",
            formats: ["pdf", "xlsx"],
            fields: ["Order #", "Date", "Customer", "Items", "Totals"],
            columns: [
                { header: "Field", key: "field", width: 25 },
                { header: "Value", key: "value", width: 45 },
            ],
            icon: ShoppingCart,
            iconBg: "bg-blue-500/10",
            fetchData: async () => {
                const res = await fetch(`/api/v1/orders/${orderId}/details`);
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error?.message || "Failed to load order");

                const o = data.data;
                const ord = o.order || {};
                const shipping = o.shippingAddress || {};
                const currency = ord.currency || "CAD";

                const items = [
                    { field: "Order Number", value: ord.orderNumber || "—" },
                    { field: "Order Date", value: ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : "—" },
                    { field: "Status", value: ord.status || "—" },
                    { field: "Payment Status", value: ord.paymentStatus || "—" },
                    { field: "Customer", value: `${ord.customerFirstName || ""} ${ord.customerLastName || ""}`.trim() || ord.customerEmail || "—" },
                    { field: "Customer Email", value: ord.customerEmail || "—" },
                    { field: "Items Count", value: String((o.items || []).length) },
                    { field: "Subtotal", value: formatCurrency(Number(ord.subtotal || 0), { currency, locale: "en-CA" }) },
                    { field: "Shipping", value: formatCurrency(Number(ord.shippingAmount || 0), { currency, locale: "en-CA" }) },
                    { field: "Tax", value: formatCurrency(Number(ord.taxAmount || 0), { currency, locale: "en-CA" }) },
                    { field: "Discount", value: formatCurrency(Number(ord.discountAmount || 0), { currency, locale: "en-CA" }) },
                    { field: "Total", value: formatCurrency(Number(ord.totalAmount || 0), { currency, locale: "en-CA" }) },
                    { field: "Shipping Address", value: shipping.addressLine1 ? `${shipping.addressLine1}, ${shipping.city}, ${shipping.state} ${shipping.postalCode}` : "—" },
                ];

                const summary = [
                    { label: "Order #", value: ord.orderNumber || "Unknown", format: "text" as const },
                    { label: "Status", value: ord.status || "—", format: "text" as const },
                    { label: "Total", value: Number(ord.totalAmount || 0), format: "currency" as const },
                ];

                return { items, summary };
            },
        },
        {
            id: "order-items",
            name: "Order Items",
            type: "orders",
            description: "Detailed list of all items in this order",
            formats: ["pdf", "xlsx", "csv"],
            fields: ["Product", "SKU", "Qty", "Price", "Total"],
            columns: [
                { header: "Product", key: "productName", width: 32 },
                { header: "SKU", key: "sku", width: 18 },
                { header: "Qty", key: "quantity", format: "number" as const, align: "center" as const, width: 10 },
                { header: "Unit Price", key: "unitPrice", format: "currency" as const, align: "right" as const, width: 15 },
                { header: "Total", key: "totalPrice", format: "currency" as const, align: "right" as const, width: 15 },
            ],
            icon: Package,
            iconBg: "bg-emerald-500/10",
            fetchData: async () => {
                const res = await fetch(`/api/v1/orders/${orderId}/details`);
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error?.message || "Failed to load order");

                const o = data.data;
                const orderItems = o.items || [];

                const items = orderItems.map((i: any) => ({
                    productName: i.productName || i.name || "—",
                    sku: i.sku || "—",
                    quantity: i.quantity || 0,
                    unitPrice: Number(i.unitPrice || i.price || 0),
                    totalPrice: Number(i.totalPrice || (i.quantity * (i.unitPrice || i.price || 0)) || 0),
                }));

                const totalQty = items.reduce((acc: number, i: any) => acc + i.quantity, 0);
                const totalValue = items.reduce((acc: number, i: any) => acc + i.totalPrice, 0);

                const summary = [
                    { label: "Total Items", value: items.length, format: "number" as const },
                    { label: "Total Quantity", value: totalQty, format: "number" as const },
                    { label: "Items Value", value: totalValue, format: "currency" as const },
                ];

                return { items, summary };
            },
        },
        {
            id: "invoice",
            name: "Invoice",
            type: "orders",
            description: "Professional invoice document for this order",
            formats: ["pdf"],
            fields: ["Invoice", "Seller", "Buyer", "Items", "Totals"],
            columns: [
                { header: "Product", key: "productName", width: 32 },
                { header: "Qty", key: "quantity", format: "number" as const, align: "center" as const, width: 10 },
                { header: "Unit Price", key: "unitPrice", format: "currency" as const, align: "right" as const, width: 15 },
                { header: "Total", key: "totalPrice", format: "currency" as const, align: "right" as const, width: 15 },
            ],
            icon: Receipt,
            iconBg: "bg-violet-500/10",
            fetchData: async () => {
                const res = await fetch(`/api/v1/orders/${orderId}/details`);
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error?.message || "Failed to load order");

                const o = data.data;
                const ord = o.order || {};
                const orderItems = o.items || [];
                const currency = ord.currency || "CAD";

                const items = orderItems.map((i: any) => ({
                    productName: i.productName || i.name || "—",
                    quantity: i.quantity || 0,
                    unitPrice: Number(i.unitPrice || i.price || 0),
                    totalPrice: Number(i.totalPrice || (i.quantity * (i.unitPrice || i.price || 0)) || 0),
                }));

                const summary = [
                    { label: "Invoice #", value: ord.orderNumber || "Unknown", format: "text" as const },
                    { label: "Date", value: ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : "—", format: "text" as const },
                    { label: "Subtotal", value: Number(ord.subtotal || 0), format: "currency" as const },
                    { label: "Shipping", value: Number(ord.shippingAmount || 0), format: "currency" as const },
                    { label: "Tax", value: Number(ord.taxAmount || 0), format: "currency" as const },
                    { label: "Discount", value: Number(ord.discountAmount || 0), format: "currency" as const },
                    { label: "Total", value: Number(ord.totalAmount || 0), format: "currency" as const },
                ];

                return { items, summary };
            },
        },
    ];

    const { exportData, isExporting, progress, currentExport } = useAdminExport({
        onSuccess: (filename) => {
            toast.success(`Report downloaded: ${filename}`);
        },
        onError: (error) => {
            toast.error(`Failed to generate report: ${error.message}`);
        },
    });

    const handleExport = async (config: (typeof orderExports)[0]) => {
        const format = selectedFormats[config.id] || config.formats[0];
        await exportData(config, format);
    };

    const getSelectedFormat = (exportId: string, defaultFormats: ExportFormat[]): ExportFormat => {
        return selectedFormats[exportId] || defaultFormats[0];
    };

    const orderNumber = order?.order?.orderNumber || "Order";

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/orders">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold">Loading...</h2>
                        <p className="text-sm text-muted-foreground">Fetching order details</p>
                    </div>
                </div>
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/orders">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold">Export: Order #{orderNumber}</h2>
                        <p className="text-sm text-muted-foreground">
                            Generate reports and invoice for this order
                        </p>
                    </div>
                </div>
            </div>

            {/* Export Options Grid */}
            <div className="grid gap-4">
                {orderExports.map((config) => {
                    const isCurrentlyExporting = isExporting && currentExport === config.id;
                    const selectedFormat = getSelectedFormat(config.id, config.formats);
                    const Icon = config.icon;

                    return (
                        <Card key={config.id} className={cn(isCurrentlyExporting && "ring-2 ring-primary/20")}>
                            <CardContent className="p-5">
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={cn("p-2.5 rounded-lg", config.iconBg)}>
                                                <Icon className="h-5 w-5 text-foreground/80" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{config.name}</h3>
                                                <p className="text-sm text-muted-foreground mt-0.5">
                                                    {config.description}
                                                </p>
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {config.fields.map((field) => (
                                                        <Badge
                                                            key={field}
                                                            variant="secondary"
                                                            className="text-xs font-normal"
                                                        >
                                                            {field}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                                            <Select
                                                value={selectedFormat}
                                                onValueChange={(value) =>
                                                    setSelectedFormats((prev) => ({
                                                        ...prev,
                                                        [config.id]: value as ExportFormat,
                                                    }))
                                                }
                                                disabled={isCurrentlyExporting}
                                            >
                                                <SelectTrigger className="w-24">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {config.formats.map((fmt) => {
                                                        const FormatIcon = formatIcons[fmt] || FileText;
                                                        return (
                                                            <SelectItem key={fmt} value={fmt}>
                                                                <div className="flex items-center gap-2">
                                                                    <FormatIcon className="h-3.5 w-3.5" />
                                                                    {fmt.toUpperCase()}
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                size="sm"
                                                onClick={() => handleExport(config)}
                                                disabled={isExporting}
                                                className={cn(
                                                    "min-w-[120px]",
                                                    isCurrentlyExporting &&
                                                    progress === 100 &&
                                                    "bg-emerald-600 hover:bg-emerald-600"
                                                )}
                                            >
                                                {isCurrentlyExporting ? (
                                                    progress === 100 ? (
                                                        <>
                                                            <Check className="h-4 w-4 mr-2" />
                                                            Done!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Exporting...
                                                        </>
                                                    )
                                                ) : (
                                                    <>
                                                        <Download className="h-4 w-4 mr-2" />
                                                        Export
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {isCurrentlyExporting && progress < 100 && (
                                        <div className="space-y-1">
                                            <Progress value={progress} className="h-1.5" />
                                            <p className="text-xs text-muted-foreground text-right">{progress}%</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Info Card */}
            <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">About Order Exports</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>
                            • <strong>Order Details</strong> - Complete order information export
                        </li>
                        <li>
                            • <strong>Order Items</strong> - Detailed product list with quantities
                        </li>
                        <li>
                            • <strong>Invoice</strong> - Professional PDF invoice for customers
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
