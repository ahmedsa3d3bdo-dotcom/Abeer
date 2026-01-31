"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Download,
    FileText,
    ShoppingCart,
    CalendarIcon,
    Loader2,
    Check,
    FileSpreadsheet,
    FileCode,
    Users,
    TrendingUp,
    CreditCard,
    Package,
    ArrowLeft,
    Search,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAdminExport, type ExportFormat, type AdminExportConfig, ADMIN_EXPORT_COLUMNS } from "@/hooks/use-admin-export";
import { toast } from "sonner";
import Link from "next/link";

// Helper function to fetch all pages of data
async function fetchAllPages<T>(
    baseUrl: string,
    params: URLSearchParams,
    mapFn: (item: any) => T,
    maxPages = 20 // Safety limit
): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    let hasMore = true;

    // Use a reasonable page size
    params.set("limit", "100");

    while (hasMore && page <= maxPages) {
        params.set("page", String(page));
        const res = await fetch(`${baseUrl}?${params.toString()}`);
        const data = await res.json();

        const items = data.data?.items || [];
        const total = data.data?.total || 0;

        allItems.push(...items.map(mapFn));

        // Check if there are more pages
        hasMore = allItems.length < total && items.length > 0;
        page++;
    }

    return allItems;
}

// Available order exports
const orderExports: Array<AdminExportConfig & { icon: any; iconBg: string }> = [
    {
        id: "all-orders",
        name: "All Orders Export",
        type: "orders",
        description: "Complete list of all orders with customer and payment details",
        formats: ["pdf", "xlsx", "csv"],
        fields: ["Order #", "Date", "Customer", "Status", "Payment", "Total"],
        columns: ADMIN_EXPORT_COLUMNS.orders.all,
        icon: ShoppingCart,
        iconBg: "bg-blue-500/10",
        fetchData: async (dateRange) => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");
            if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().split("T")[0]);
            if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().split("T")[0]);

            // Fetch metrics separately (doesn't need pagination)
            const metricsParams = new URLSearchParams();
            if (dateRange?.from) metricsParams.set("dateFrom", dateRange.from.toISOString().split("T")[0]);
            if (dateRange?.to) metricsParams.set("dateTo", dateRange.to.toISOString().split("T")[0]);
            const metricsRes = await fetch(`/api/v1/orders/metrics?${metricsParams.toString()}`);
            const metricsData = await metricsRes.json();

            const items = await fetchAllPages(
                "/api/v1/orders",
                params,
                (o: any) => ({
                    orderNumber: o.orderNumber,
                    createdAt: o.createdAt,
                    customerName: `${o.customerFirstName || ""} ${o.customerLastName || ""}`.trim() || o.customerEmail || "—",
                    customerEmail: o.customerEmail || "—",
                    status: o.status,
                    paymentStatus: o.paymentStatus,
                    totalAmount: Number(o.totalAmount || 0),
                })
            );

            const metrics = metricsData.data || {};
            const summary = [
                { label: "Total Orders", value: metrics.totalOrders ?? items.length, format: "number" as const },
                { label: "Total Sales", value: Number(metrics.revenueTotal ?? 0), format: "currency" as const },
                { label: "Avg Order Value", value: Number(metrics.avgOrderValue ?? 0), format: "currency" as const },
                { label: "Paid Orders", value: Number(metrics.paidOrders ?? 0), format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "pending-orders",
        name: "Pending Orders",
        type: "orders",
        description: "Orders awaiting processing or shipment",
        formats: ["pdf", "xlsx"],
        fields: ["Order #", "Date", "Customer", "Payment Status", "Total"],
        columns: ADMIN_EXPORT_COLUMNS.orders.all,
        icon: Package,
        iconBg: "bg-amber-500/10",
        fetchData: async (dateRange) => {
            const params = new URLSearchParams();
            params.set("status", "pending");
            params.set("sort", "createdAt.desc");
            if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().split("T")[0]);
            if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().split("T")[0]);

            const items = await fetchAllPages(
                "/api/v1/orders",
                params,
                (o: any) => ({
                    orderNumber: o.orderNumber,
                    createdAt: o.createdAt,
                    customerName: `${o.customerFirstName || ""} ${o.customerLastName || ""}`.trim() || o.customerEmail || "—",
                    customerEmail: o.customerEmail || "—",
                    status: o.status,
                    paymentStatus: o.paymentStatus,
                    totalAmount: Number(o.totalAmount || 0),
                })
            );

            const totalValue = items.reduce((acc, o) => acc + o.totalAmount, 0);
            const summary = [
                { label: "Pending Orders", value: items.length, format: "number" as const },
                { label: "Total Value", value: totalValue, format: "currency" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "paid-orders",
        name: "Paid Orders",
        type: "orders",
        description: "Successfully paid orders for accounting",
        formats: ["pdf", "xlsx", "csv"],
        fields: ["Order #", "Date", "Customer", "Total", "Payment Method"],
        columns: ADMIN_EXPORT_COLUMNS.orders.all,
        icon: CreditCard,
        iconBg: "bg-emerald-500/10",
        fetchData: async (dateRange) => {
            const params = new URLSearchParams();
            params.set("paymentStatus", "paid");
            params.set("sort", "createdAt.desc");
            if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().split("T")[0]);
            if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().split("T")[0]);

            const items = await fetchAllPages(
                "/api/v1/orders",
                params,
                (o: any) => ({
                    orderNumber: o.orderNumber,
                    createdAt: o.createdAt,
                    customerName: `${o.customerFirstName || ""} ${o.customerLastName || ""}`.trim() || o.customerEmail || "—",
                    customerEmail: o.customerEmail || "—",
                    status: o.status,
                    paymentStatus: o.paymentStatus,
                    totalAmount: Number(o.totalAmount || 0),
                })
            );

            const totalRevenue = items.reduce((acc, o) => acc + o.totalAmount, 0);
            const avgOrder = items.length > 0 ? totalRevenue / items.length : 0;

            const summary = [
                { label: "Paid Orders", value: items.length, format: "number" as const },
                { label: "Total Sales", value: totalRevenue, format: "currency" as const },
                { label: "Avg Order Value", value: avgOrder, format: "currency" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "orders-by-customer",
        name: "Orders by Customer",
        type: "orders",
        description: "Order summary grouped by customer",
        formats: ["xlsx", "csv"],
        fields: ["Customer", "Email", "Order Count", "Total Spent", "Last Order"],
        columns: [
            { header: "Customer", key: "name", width: 25 },
            { header: "Email", key: "email", width: 28 },
            { header: "Orders", key: "orderCount", format: "number" as const, align: "center" as const, width: 12 },
            { header: "Total Spent", key: "totalSpent", format: "currency" as const, align: "right" as const, width: 18 },
            { header: "Last Order", key: "lastOrderDate", format: "date" as const, width: 15 },
        ],
        icon: Users,
        iconBg: "bg-violet-500/10",
        fetchData: async (dateRange, customerId?: string) => {
            const params = new URLSearchParams();
            params.set("sort", "totalSpent.desc");
            
            // If a specific customer is selected, filter by that customer
            if (customerId) {
                params.set("id", customerId);
            }

            const items = await fetchAllPages(
                "/api/v1/customers",
                params,
                (c: any) => ({
                    name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email,
                    email: c.email,
                    orderCount: c.ordersCount || 0,
                    totalSpent: Number(c.totalSpent || 0),
                    lastOrderDate: c.lastOrderAt,
                })
            );

            const filteredItems = items.filter((c) => c.orderCount > 0);
            const totalCustomers = filteredItems.length;
            const totalOrders = filteredItems.reduce((acc, c) => acc + c.orderCount, 0);
            const totalRevenue = filteredItems.reduce((acc, c) => acc + c.totalSpent, 0);

            const summary = [
                { label: "Customers with Orders", value: totalCustomers, format: "number" as const },
                { label: "Total Orders", value: totalOrders, format: "number" as const },
                { label: "Total Sales", value: totalRevenue, format: "currency" as const },
            ];

            return { items: filteredItems, summary };
        },
    },
    {
        id: "customer-orders-detail",
        name: "Customer Orders Detail",
        type: "orders",
        description: "Comprehensive order history with full details for a specific customer",
        formats: ["pdf", "xlsx"],
        fields: ["Order #", "Date", "Products", "Quantity", "Amount", "Status"],
        columns: ADMIN_EXPORT_COLUMNS.orders.all,
        icon: Users,
        iconBg: "bg-purple-500/10",
        requiresCustomer: true,
        supportsOrderDetails: true,
        landscape: true,
        fetchData: async (dateRange, customerId?: string, includeDetails?: boolean) => {
            if (!customerId) {
                throw new Error("Please select a customer first");
            }

            // Fetch customer details
            const customerRes = await fetch(`/api/v1/customers/${customerId}`);
            const customerData = await customerRes.json();
            const customer = customerData.data?.user;

            if (!customer) {
                throw new Error("Customer not found");
            }

            const params = new URLSearchParams();
            params.set("userId", customerId);
            params.set("sort", "createdAt.desc");
            if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().split("T")[0]);
            if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().split("T")[0]);

            // Fetch all orders for the customer
            const ordersData = await fetchAllPages(
                "/api/v1/orders",
                params,
                (o: any) => o
            );

            if (!includeDetails) {
                // Simple order summary without item details
                const items = ordersData.map((o: any) => ({
                    orderNumber: o.orderNumber,
                    orderDate: o.createdAt,
                    itemsCount: o.itemsCount || 0,
                    subtotal: Number(o.subtotalAmount || 0),
                    shipping: Number(o.shippingAmount || 0),
                    tax: Number(o.taxAmount || 0),
                    discount: Number(o.discountAmount || 0),
                    total: Number(o.totalAmount || 0),
                    status: o.status,
                    paymentStatus: o.paymentStatus,
                }));

                const totalOrders = items.length;
                const totalSpent = items.reduce((acc, o) => acc + o.total, 0);
                const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

                const summary = [
                    { label: "Customer", value: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.email, format: "text" as const },
                    { label: "Email", value: customer.email, format: "text" as const },
                    { label: "Total Orders", value: totalOrders, format: "number" as const },
                    { label: "Total Spent", value: totalSpent, format: "currency" as const },
                    { label: "Avg Order Value", value: avgOrderValue, format: "currency" as const },
                ];

                return { 
                    items, 
                    summary,
                    columns: [
                        { header: "Order #", key: "orderNumber", width: 16 },
                        { header: "Date", key: "orderDate", format: "date" as const, width: 14 },
                        { header: "Items", key: "itemsCount", format: "number" as const, align: "center" as const, width: 10 },
                        { header: "Subtotal", key: "subtotal", format: "currency" as const, align: "right" as const, width: 12 },
                        { header: "Shipping", key: "shipping", format: "currency" as const, align: "right" as const, width: 12 },
                        { header: "Tax", key: "tax", format: "currency" as const, align: "right" as const, width: 10 },
                        { header: "Discount", key: "discount", format: "currency" as const, align: "right" as const, width: 12 },
                        { header: "Total", key: "total", format: "currency" as const, align: "right" as const, width: 12 },
                        { header: "Status", key: "status", width: 12 },
                        { header: "Payment", key: "paymentStatus", width: 12 },
                    ]
                };
            }

            // Detailed report with all order items - fetch full details for each order
            const detailedItems: any[] = [];
            let totalQuantity = 0;
            let orderIndex = 0;

            for (const order of ordersData) {
                // Fetch full order details including items using the /details endpoint
                const orderDetailRes = await fetch(`/api/v1/orders/${order.id}/details`);
                const orderDetailData = await orderDetailRes.json();
                const orderDetails = orderDetailData.data;

                if (orderDetails?.items && orderDetails.items.length > 0) {
                    let isFirstItemInOrder = true;
                    
                    for (const item of orderDetails.items) {
                        const qty = Number(item.quantity || 0);
                        totalQuantity += qty;
                        
                        detailedItems.push({
                            // Only show order number for the first item in each order
                            orderNumber: isFirstItemInOrder ? order.orderNumber : "",
                            orderDate: isFirstItemInOrder ? order.createdAt : "",
                            productName: item.productName || "Unknown Product",
                            variantName: item.variantName || "Default",
                            sku: item.sku || "—",
                            quantity: qty,
                            unitPrice: Number(item.unitPrice || 0),
                            itemTotal: Number(item.totalPrice || 0),
                            orderStatus: isFirstItemInOrder ? order.status : "",
                            paymentStatus: isFirstItemInOrder ? order.paymentStatus : "",
                            _orderIndex: orderIndex, // Hidden field for grouping
                            _isFirstItem: isFirstItemInOrder,
                        });
                        
                        isFirstItemInOrder = false;
                    }
                    orderIndex++;
                }
            }

            const totalOrders = ordersData.length;
            const totalSpent = ordersData.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);
            const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

            const summary = [
                { label: "Customer", value: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.email, format: "text" as const },
                { label: "Email", value: customer.email, format: "text" as const },
                { label: "Total Orders", value: totalOrders, format: "number" as const },
                { label: "Total Items", value: totalQuantity, format: "number" as const },
                { label: "Total Spent", value: totalSpent, format: "currency" as const },
                { label: "Avg Order Value", value: avgOrderValue, format: "currency" as const },
            ];

            return { 
                items: detailedItems, 
                summary,
                columns: [
                    { header: "Order #", key: "orderNumber", width: 18 },
                    { header: "Date", key: "orderDate", format: "date" as const, width: 14 },
                    { header: "Product", key: "productName", width: 30 },
                    { header: "Variant", key: "variantName", width: 20 },
                    { header: "SKU", key: "sku", width: 16 },
                    { header: "Qty", key: "quantity", format: "number" as const, align: "center" as const, width: 8 },
                    { header: "Unit Price", key: "unitPrice", format: "currency" as const, align: "right" as const, width: 14 },
                    { header: "Item Total", key: "itemTotal", format: "currency" as const, align: "right" as const, width: 14 },
                    { header: "Status", key: "orderStatus", width: 12 },
                    { header: "Payment", key: "paymentStatus", width: 14 },
                ]
            };
        },
    },
];

const formatIcons: Record<string, any> = {
    pdf: FileText,
    xlsx: FileSpreadsheet,
    csv: FileCode,
};

export default function OrdersExportPage() {
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
    });
    const [selectedFormats, setSelectedFormats] = useState<Record<string, ExportFormat>>({});
    const [selectedCustomers, setSelectedCustomers] = useState<Record<string, string>>({});
    const [customers, setCustomers] = useState<Array<{ id: string; name: string; email: string }>>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const [includeOrderDetails, setIncludeOrderDetails] = useState<Record<string, boolean>>({});

    // Fetch customers for selection
    const fetchCustomers = async (search?: string) => {
        setLoadingCustomers(true);
        try {
            const params = new URLSearchParams();
            params.set("limit", "100");
            params.set("sort", "totalSpent.desc");
            if (search) {
                params.set("q", search);
            }
            const res = await fetch(`/api/v1/customers?${params.toString()}`);
            const data = await res.json();
            const items = data.data?.items || [];
            setCustomers(
                items
                    .filter((c: any) => c.ordersCount > 0)
                    .map((c: any) => ({
                        id: c.id,
                        name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email,
                        email: c.email,
                    }))
            );
        } catch (error) {
            console.error("Failed to fetch customers:", error);
        } finally {
            setLoadingCustomers(false);
        }
    };

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
        const customerId = selectedCustomers[config.id];
        const includeDetails = includeOrderDetails[config.id] || false;
        
        if ((config as any).requiresCustomer && !customerId) {
            toast.error("Please select a customer first");
            return;
        }
        
        await exportData(config, format, dateRange, customerId, includeDetails);
    };

    const getSelectedFormat = (exportId: string, defaultFormats: ExportFormat[]): ExportFormat => {
        return selectedFormats[exportId] || defaultFormats[0];
    };

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
                        <h2 className="text-lg font-semibold">Orders Export</h2>
                        <p className="text-sm text-muted-foreground">
                            Generate professional order reports and data exports
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="range"
                                selected={{ from: dateRange.from, to: dateRange.to }}
                                onSelect={(range) => {
                                    if (range?.from && range?.to) {
                                        setDateRange({ from: range.from, to: range.to });
                                    }
                                }}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
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
                                            {/* Customer selector for reports that require it */}
                                            {(config as any).requiresCustomer && (
                                                <div className="flex flex-col gap-2">
                                                    <Select
                                                        value={selectedCustomers[config.id] || ""}
                                                        onValueChange={(value) => {
                                                            setSelectedCustomers((prev) => ({
                                                                ...prev,
                                                                [config.id]: value,
                                                            }));
                                                        }}
                                                        disabled={isCurrentlyExporting}
                                                        onOpenChange={(open) => {
                                                            if (open && customers.length === 0) {
                                                                fetchCustomers();
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-[200px]">
                                                            <SelectValue placeholder="Select customer..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <div className="flex items-center px-3 pb-2">
                                                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                                <Input
                                                                    placeholder="Search customers..."
                                                                    value={customerSearch}
                                                                    onChange={(e) => {
                                                                        setCustomerSearch(e.target.value);
                                                                        fetchCustomers(e.target.value);
                                                                    }}
                                                                    className="h-8"
                                                                />
                                                            </div>
                                                            {loadingCustomers ? (
                                                                <SelectItem value="loading" disabled>
                                                                    Loading customers...
                                                                </SelectItem>
                                                            ) : customers.length === 0 ? (
                                                                <SelectItem value="none" disabled>
                                                                    No customers found
                                                                </SelectItem>
                                                            ) : (
                                                                customers.map((customer) => (
                                                                    <SelectItem key={customer.id} value={customer.id}>
                                                                        <div className="flex flex-col">
                                                                            <span>{customer.name}</span>
                                                                            <span className="text-xs text-muted-foreground">{customer.email}</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    
                                                    {/* Checkbox for including order details */}
                                                    {(config as any).supportsOrderDetails && (
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`details-${config.id}`}
                                                                checked={includeOrderDetails[config.id] || false}
                                                                onCheckedChange={(checked) => {
                                                                    setIncludeOrderDetails((prev) => ({
                                                                        ...prev,
                                                                        [config.id]: checked === true,
                                                                    }));
                                                                }}
                                                                disabled={isCurrentlyExporting}
                                                            />
                                                            <Label
                                                                htmlFor={`details-${config.id}`}
                                                                className="text-sm font-normal cursor-pointer"
                                                            >
                                                                Include order items
                                                            </Label>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Format selector */}
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
                                                <SelectTrigger className="w-[100px]">
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

                                    {/* Progress bar when exporting */}
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
                            • <strong>PDF</strong> - Professional branded reports with logo and summary cards
                        </li>
                        <li>
                            • <strong>XLSX</strong> - Excel spreadsheets with formatted tables and styling
                        </li>
                        <li>
                            • <strong>CSV</strong> - Raw data exports for custom analysis and integrations
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
