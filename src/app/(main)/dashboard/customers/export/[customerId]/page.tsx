"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
    Download,
    FileText,
    User,
    Loader2,
    Check,
    FileSpreadsheet,
    FileCode,
    ShoppingBag,
    MapPin,
    ArrowLeft,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useAdminExport, type ExportFormat, type AdminExportConfig } from "@/hooks/use-admin-export";
import { toast } from "sonner";
import Link from "next/link";

const formatIcons: Record<string, any> = {
    pdf: FileText,
    xlsx: FileSpreadsheet,
    csv: FileCode,
};

export default function CustomerDetailExportPage() {
    const params = useParams();
    const customerId = params.customerId as string;

    const [customer, setCustomer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedFormats, setSelectedFormats] = useState<Record<string, ExportFormat>>({});

    useEffect(() => {
        async function fetchCustomer() {
            try {
                setLoading(true);
                const res = await fetch(`/api/v1/customers/${customerId}/details`);
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error?.message || "Failed to load customer");
                setCustomer(data.data);
            } catch (e: any) {
                toast.error(e.message || "Failed to load customer");
            } finally {
                setLoading(false);
            }
        }
        if (customerId) {
            void fetchCustomer();
        }
    }, [customerId]);

    // Create dynamic export configs based on the loaded customer
    const customerExports: Array<AdminExportConfig & { icon: any; iconBg: string }> = [
        {
            id: "customer-profile",
            name: "Customer Profile",
            type: "customers",
            description: "Complete customer profile with contact and address info",
            formats: ["pdf", "xlsx"],
            fields: ["Name", "Email", "Phone", "Status", "Addresses"],
            columns: [
                { header: "Field", key: "field", width: 25 },
                { header: "Value", key: "value", width: 45 },
            ],
            icon: User,
            iconBg: "bg-blue-500/10",
            fetchData: async () => {
                const res = await fetch(`/api/v1/customers/${customerId}/details`);
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error?.message || "Failed to load customer");

                const c = data.data;
                const user = c.user || {};
                const shipping = c.shippingAddress || {};
                const billing = c.billingAddress || {};
                const agg = c.aggregates || {};

                const items = [
                    { field: "Full Name", value: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "—" },
                    { field: "Email", value: user.email || "—" },
                    { field: "Phone", value: user.phone || "—" },
                    { field: "Status", value: user.isActive ? "Active" : "Inactive" },
                    { field: "Member Since", value: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—" },
                    { field: "Total Orders", value: String(agg.ordersCount ?? 0) },
                    { field: "Total Spent", value: formatCurrency(Number(agg.totalSpent ?? 0), { currency: c.currency || "CAD", locale: "en-CA" }) },
                    { field: "Avg Order Value", value: formatCurrency(Number(agg.avgOrderValue ?? 0), { currency: c.currency || "CAD", locale: "en-CA" }) },
                    { field: "Shipping Address", value: shipping.addressLine1 ? `${shipping.addressLine1}, ${shipping.city}, ${shipping.state} ${shipping.postalCode}` : "—" },
                    { field: "Billing Address", value: billing.addressLine1 ? `${billing.addressLine1}, ${billing.city}, ${billing.state} ${billing.postalCode}` : "—" },
                ];

                const summary = [
                    { label: "Customer", value: user.email || "Unknown", format: "text" as const },
                    { label: "Total Orders", value: agg.ordersCount ?? 0, format: "number" as const },
                    { label: "Total Spent", value: Number(agg.totalSpent ?? 0), format: "currency" as const },
                ];

                return { items, summary };
            },
        },
        {
            id: "customer-orders",
            name: "Customer Order History",
            type: "orders",
            description: "All orders placed by this customer",
            formats: ["pdf", "xlsx", "csv"],
            fields: ["Order #", "Date", "Status", "Payment", "Total"],
            columns: [
                { header: "Order #", key: "orderNumber", width: 18 },
                { header: "Date", key: "createdAt", format: "date" as const, width: 18 },
                { header: "Status", key: "status", width: 14 },
                { header: "Payment", key: "paymentStatus", width: 14 },
                { header: "Total", key: "totalAmount", format: "currency" as const, align: "right" as const, width: 16 },
            ],
            icon: ShoppingBag,
            iconBg: "bg-emerald-500/10",
            fetchData: async () => {
                const params = new URLSearchParams();
                params.set("userId", customerId);
                params.set("sort", "createdAt.desc");
                params.set("limit", "100");

                const res = await fetch(`/api/v1/orders?${params.toString()}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error?.message || "Failed to load orders");

                const items = (data.data?.items || []).map((o: any) => ({
                    orderNumber: o.orderNumber,
                    createdAt: o.createdAt,
                    status: o.status,
                    paymentStatus: o.paymentStatus,
                    totalAmount: Number(o.totalAmount || 0),
                }));

                const totalValue = items.reduce((acc: number, o: any) => acc + o.totalAmount, 0);

                const summary = [
                    { label: "Total Orders", value: items.length, format: "number" as const },
                    { label: "Total Value", value: totalValue, format: "currency" as const },
                ];

                return { items, summary };
            },
        },
        {
            id: "customer-addresses",
            name: "Customer Addresses",
            type: "general",
            description: "Shipping and billing addresses for this customer",
            formats: ["pdf", "xlsx"],
            fields: ["Type", "Name", "Address", "City", "Country"],
            columns: [
                { header: "Type", key: "type", width: 12 },
                { header: "Name", key: "name", width: 22 },
                { header: "Address", key: "address", width: 28 },
                { header: "City", key: "city", width: 15 },
                { header: "Country", key: "country", width: 15 },
            ],
            icon: MapPin,
            iconBg: "bg-violet-500/10",
            fetchData: async () => {
                const res = await fetch(`/api/v1/customers/${customerId}/details`);
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error?.message || "Failed to load customer");

                const c = data.data;
                const items: any[] = [];

                if (c.shippingAddress) {
                    const s = c.shippingAddress;
                    items.push({
                        type: "Shipping",
                        name: `${s.firstName || ""} ${s.lastName || ""}`.trim() || "—",
                        address: `${s.addressLine1 || ""}${s.addressLine2 ? `, ${s.addressLine2}` : ""}`,
                        city: `${s.city || ""}, ${s.state || ""} ${s.postalCode || ""}`,
                        country: s.country || "—",
                    });
                }

                if (c.billingAddress) {
                    const b = c.billingAddress;
                    items.push({
                        type: "Billing",
                        name: `${b.firstName || ""} ${b.lastName || ""}`.trim() || "—",
                        address: `${b.addressLine1 || ""}${b.addressLine2 ? `, ${b.addressLine2}` : ""}`,
                        city: `${b.city || ""}, ${b.state || ""} ${b.postalCode || ""}`,
                        country: b.country || "—",
                    });
                }

                const summary = [
                    { label: "Addresses", value: items.length, format: "number" as const },
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

    const handleExport = async (config: (typeof customerExports)[0]) => {
        const format = selectedFormats[config.id] || config.formats[0];
        await exportData(config, format);
    };

    const getSelectedFormat = (exportId: string, defaultFormats: ExportFormat[]): ExportFormat => {
        return selectedFormats[exportId] || defaultFormats[0];
    };

    const customerName = customer?.user
        ? `${customer.user.firstName || ""} ${customer.user.lastName || ""}`.trim() || customer.user.email
        : "Customer";

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/customers">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold">Loading...</h2>
                        <p className="text-sm text-muted-foreground">Fetching customer details</p>
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
                    <Link href="/dashboard/customers">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold">Export: {customerName}</h2>
                        <p className="text-sm text-muted-foreground">
                            Generate reports for this customer
                        </p>
                    </div>
                </div>
            </div>

            {/* Export Options Grid */}
            <div className="grid gap-4">
                {customerExports.map((config) => {
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
                    <CardTitle className="text-sm font-medium">About Customer Exports</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>
                            • <strong>PDF</strong> - Professional customer reports with summary
                        </li>
                        <li>
                            • <strong>XLSX</strong> - Excel spreadsheets for analysis
                        </li>
                        <li>
                            • <strong>CSV</strong> - Raw data for other systems
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
