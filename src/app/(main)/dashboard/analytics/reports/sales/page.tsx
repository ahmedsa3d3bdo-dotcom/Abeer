"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
    Download,
    FileText,
    TrendingUp,
    CalendarIcon,
    Loader2,
    Check,
    FileSpreadsheet,
    FileCode,
    Calendar as CalendarDays,
    BarChart3,
    Package,
    Layers,
    ListOrdered,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useReportGenerator, type ReportFormat, type ReportConfig } from "@/hooks/use-report-generator";
import { toast } from "sonner";

const salesReports: Array<ReportConfig & { description: string; formats: string[]; fields: string[]; color: string; icon: string }> = [
    {
        id: "daily-summary",
        name: "Daily Sales Summary",
        type: "sales",
        description: "Overview of daily sales, revenue, and orders",
        formats: ["PDF", "XLSX"],
        fields: ["Date", "Orders", "Revenue", "Profit", "Average Order Value", "Top Products"],
        color: "emerald",
        icon: "calendar",
    },
    {
        id: "weekly-report",
        name: "Weekly Revenue Report",
        type: "sales",
        description: "Detailed weekly breakdown with comparisons",
        formats: ["PDF", "XLSX"],
        fields: ["Week", "Revenue", "Profit", "Orders", "Growth %", "Best Day"],
        color: "blue",
        icon: "trending",
    },
    {
        id: "monthly-report",
        name: "Monthly Sales Report",
        type: "sales",
        description: "Comprehensive monthly analysis with trends",
        formats: ["PDF", "XLSX"],
        fields: ["Month", "Revenue", "Profit", "Orders", "New Customers", "Profit Margin"],
        color: "purple",
        icon: "chart",
    },
    {
        id: "order-details",
        name: "Order Details Export",
        type: "sales",
        description: "Complete list of all orders with line items",
        formats: ["CSV", "XLSX"],
        fields: ["Order ID", "Date", "Customer", "Products", "Total", "Discount", "Status"],
        color: "amber",
        icon: "list",
    },
    {
        id: "revenue-by-product",
        name: "Revenue by Product",
        type: "sales",
        description: "Sales breakdown by individual products",
        formats: ["CSV", "XLSX"],
        fields: ["Product", "SKU", "Units Sold", "Revenue", "Cost", "Profit", "Margin %"],
        color: "cyan",
        icon: "package",
    },
    {
        id: "revenue-by-category",
        name: "Revenue by Category",
        type: "sales",
        description: "Sales performance by product category",
        formats: ["PDF", "XLSX"],
        fields: ["Category", "Products", "Units", "Revenue", "Profit", "Margin %", "Share %"],
        color: "pink",
        icon: "layers",
    },
];

const formatIcons: Record<string, any> = {
    PDF: FileText,
    XLSX: FileSpreadsheet,
    CSV: FileCode,
};

const reportIcons: Record<string, any> = {
    calendar: CalendarDays,
    trending: TrendingUp,
    chart: BarChart3,
    list: ListOrdered,
    package: Package,
    layers: Layers,
};

const colorClasses: Record<string, { bg: string; text: string }> = {
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
    cyan: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400" },
    pink: { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400" },
};

export default function SalesReportsPage() {
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
    });
    const [selectedFormats, setSelectedFormats] = useState<Record<string, ReportFormat>>({});

    const { generateReport, isGenerating, progress, currentReport } = useReportGenerator({
        onSuccess: (filename) => {
            toast.success(`Report downloaded: ${filename}`);
        },
        onError: (error) => {
            toast.error(`Failed to generate report: ${error.message}`);
        },
    });

    const handleGenerate = async (report: typeof salesReports[0]) => {
        const format = (selectedFormats[report.id] || report.formats[0].toLowerCase()) as ReportFormat;
        await generateReport(report, format, dateRange);
    };

    const getSelectedFormat = (reportId: string, defaultFormats: string[]): ReportFormat => {
        return (selectedFormats[reportId] || defaultFormats[0].toLowerCase()) as ReportFormat;
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
                </div>
            </div>

            {/* Reports Grid */}
            <div className="grid gap-4">
                {salesReports.map((report) => {
                    const isCurrentlyGenerating = isGenerating && currentReport === report.id;
                    const selectedFormat = getSelectedFormat(report.id, report.formats);
                    const Icon = reportIcons[report.icon] || TrendingUp;
                    const colors = colorClasses[report.color] || colorClasses.emerald;

                    return (
                        <Card key={report.id} className={cn(isCurrentlyGenerating && "ring-2 ring-primary/20")}>
                            <CardContent className="p-5">
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={cn("p-2.5 rounded-lg", colors.bg)}>
                                                <Icon className={cn("h-5 w-5", colors.text)} />
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
                                            {/* Format selector */}
                                            <Select
                                                value={selectedFormat}
                                                onValueChange={(value) =>
                                                    setSelectedFormats((prev) => ({ ...prev, [report.id]: value as ReportFormat }))
                                                }
                                                disabled={isCurrentlyGenerating}
                                            >
                                                <SelectTrigger className="w-24">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {report.formats.map((fmt) => {
                                                        const Icon = formatIcons[fmt] || FileText;
                                                        return (
                                                            <SelectItem key={fmt} value={fmt.toLowerCase()}>
                                                                <div className="flex items-center gap-2">
                                                                    <Icon className="h-3.5 w-3.5" />
                                                                    {fmt}
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                size="sm"
                                                onClick={() => handleGenerate(report)}
                                                disabled={isGenerating}
                                                className={cn(
                                                    "min-w-[120px]",
                                                    isCurrentlyGenerating && progress === 100 && "bg-emerald-600 hover:bg-emerald-600"
                                                )}
                                            >
                                                {isCurrentlyGenerating ? (
                                                    progress === 100 ? (
                                                        <>
                                                            <Check className="h-4 w-4 mr-2" />
                                                            Done!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Generating...
                                                        </>
                                                    )
                                                ) : (
                                                    <>
                                                        <Download className="h-4 w-4 mr-2" />
                                                        Generate
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Progress bar when generating */}
                                    {isCurrentlyGenerating && progress < 100 && (
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
                    <CardTitle className="text-sm font-medium">About Sales Reports</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>PDF</strong> - Professional branded reports with charts and summaries</li>
                        <li>• <strong>XLSX</strong> - Excel spreadsheets with multiple sheets and formatting</li>
                        <li>• <strong>CSV</strong> - Raw data exports for custom analysis</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
