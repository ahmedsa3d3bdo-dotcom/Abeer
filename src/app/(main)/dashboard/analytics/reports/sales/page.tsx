"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Download,
    FileSpreadsheet,
    FileText,
    TrendingUp,
    CalendarIcon,
    Loader2,
    Check,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const salesReports = [
    {
        id: "daily-summary",
        name: "Daily Sales Summary",
        description: "Overview of daily sales, revenue, and orders",
        formats: ["PDF", "XLSX"],
        fields: ["Date", "Orders", "Revenue", "Average Order Value", "Top Products"],
    },
    {
        id: "weekly-report",
        name: "Weekly Revenue Report",
        description: "Detailed weekly breakdown with comparisons",
        formats: ["PDF", "XLSX"],
        fields: ["Week", "Revenue", "Orders", "Growth %", "Best Day"],
    },
    {
        id: "monthly-report",
        name: "Monthly Sales Report",
        description: "Comprehensive monthly analysis with trends",
        formats: ["PDF", "XLSX"],
        fields: ["Month", "Revenue", "Orders", "New Customers", "Profit Margin"],
    },
    {
        id: "order-details",
        name: "Order Details Export",
        description: "Complete list of all orders with line items",
        formats: ["CSV", "XLSX"],
        fields: ["Order ID", "Date", "Customer", "Products", "Total", "Status"],
    },
    {
        id: "revenue-by-product",
        name: "Revenue by Product",
        description: "Sales breakdown by individual products",
        formats: ["CSV", "XLSX"],
        fields: ["Product", "SKU", "Units Sold", "Revenue", "Profit"],
    },
    {
        id: "revenue-by-category",
        name: "Revenue by Category",
        description: "Sales performance by product category",
        formats: ["PDF", "XLSX"],
        fields: ["Category", "Products", "Units", "Revenue", "Share %"],
    },
];

export default function SalesReportsPage() {
    const [generating, setGenerating] = useState<string | null>(null);
    const [generated, setGenerated] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
    });
    const [exportFormat, setExportFormat] = useState("PDF");

    const handleGenerate = async (reportId: string) => {
        setGenerating(reportId);
        // Simulate generation
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setGenerating(null);
        setGenerated(reportId);
        setTimeout(() => setGenerated(null), 3000);
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Sales Reports</h2>
                    <p className="text-sm text-muted-foreground">
                        Generate revenue, orders, and transaction reports
                    </p>
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
                    <Select value={exportFormat} onValueChange={setExportFormat}>
                        <SelectTrigger className="w-24">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PDF">PDF</SelectItem>
                            <SelectItem value="XLSX">XLSX</SelectItem>
                            <SelectItem value="CSV">CSV</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Reports Grid */}
            <div className="grid gap-4">
                {salesReports.map((report) => (
                    <Card key={report.id}>
                        <CardContent className="p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 rounded-lg bg-emerald-500/10">
                                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{report.name}</h3>
                                        <p className="text-sm text-muted-foreground mt-0.5">{report.description}</p>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {report.fields.map((field) => (
                                                <Badge key={field} variant="secondary" className="text-xs font-normal">
                                                    {field}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                                    <div className="flex gap-1">
                                        {report.formats.map((fmt) => (
                                            <Badge key={fmt} variant="outline" className="text-xs">
                                                {fmt}
                                            </Badge>
                                        ))}
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleGenerate(report.id)}
                                        disabled={generating === report.id}
                                        className={cn(
                                            "min-w-[100px]",
                                            generated === report.id && "bg-emerald-600 hover:bg-emerald-600"
                                        )}
                                    >
                                        {generating === report.id ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Generating...
                                            </>
                                        ) : generated === report.id ? (
                                            <>
                                                <Check className="h-4 w-4 mr-2" />
                                                Download
                                            </>
                                        ) : (
                                            <>
                                                <Download className="h-4 w-4 mr-2" />
                                                Generate
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
