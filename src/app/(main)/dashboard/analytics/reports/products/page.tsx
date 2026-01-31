"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
    Download,
    FileText,
    Package,
    Loader2,
    Check,
    FileSpreadsheet,
    FileCode,
    AlertTriangle,
    BarChart3,
    Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReportGenerator, type ReportFormat, type ReportConfig } from "@/hooks/use-report-generator";
import { toast } from "sonner";

const productReports: Array<ReportConfig & { description: string; formats: string[]; fields: string[]; icon: any; color: string }> = [
    {
        id: "product-catalog",
        name: "Product Catalog Export",
        type: "products",
        description: "Complete product listing with all details",
        formats: ["XLSX", "CSV"],
        fields: ["Name", "SKU", "Price", "Cost", "Stock", "Status", "Category"],
        icon: Package,
        color: "blue",
    },
    {
        id: "inventory-levels",
        name: "Inventory Levels Report",
        type: "products",
        description: "Current stock quantities across all products",
        formats: ["PDF", "XLSX"],
        fields: ["Product", "SKU", "Stock", "Reserved", "Available", "Value"],
        icon: Boxes,
        color: "purple",
    },
    {
        id: "low-stock-alert",
        name: "Low Stock Alert Report",
        type: "products",
        description: "Products below their reorder threshold",
        formats: ["PDF", "XLSX", "CSV"],
        fields: ["Product", "SKU", "Current Stock", "Threshold", "Reorder Qty"],
        icon: AlertTriangle,
        color: "amber",
    },
    {
        id: "product-performance",
        name: "Product Performance Report",
        type: "products",
        description: "Sales performance metrics by product",
        formats: ["PDF", "XLSX"],
        fields: ["Product", "Units Sold", "Revenue", "Profit", "Margin %", "Views"],
        icon: BarChart3,
        color: "emerald",
    },
    {
        id: "category-breakdown",
        name: "Category Breakdown Report",
        type: "products",
        description: "Product distribution and sales by category",
        formats: ["PDF", "XLSX"],
        fields: ["Category", "Products", "Revenue", "Profit", "Units", "Margin %"],
        icon: Package,
        color: "cyan",
    },
];

const colorClasses: Record<string, { bg: string; text: string }> = {
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
    cyan: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400" },
    pink: { bg: "bg-pink-500/10", text: "text-pink-600 dark:text-pink-400" },
};

const formatIcons: Record<string, any> = {
    PDF: FileText,
    XLSX: FileSpreadsheet,
    CSV: FileCode,
};

export default function ProductsReportsPage() {
    const [selectedFormats, setSelectedFormats] = useState<Record<string, ReportFormat>>({});

    const { generateReport, isGenerating, progress, currentReport } = useReportGenerator({
        onSuccess: (filename) => {
            toast.success(`Report downloaded: ${filename}`);
        },
        onError: (error) => {
            toast.error(`Failed to generate report: ${error.message}`);
        },
    });

    const handleGenerate = async (report: typeof productReports[0]) => {
        const format = (selectedFormats[report.id] || report.formats[0].toLowerCase()) as ReportFormat;
        await generateReport(report, format);
    };

    const getSelectedFormat = (reportId: string, defaultFormats: string[]): ReportFormat => {
        return (selectedFormats[reportId] || defaultFormats[0].toLowerCase()) as ReportFormat;
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-semibold">Product Reports</h2>
                <p className="text-sm text-muted-foreground">
                    Generate inventory, performance, and catalog reports
                </p>
            </div>

            {/* Reports Grid */}
            <div className="grid gap-4">
                {productReports.map((report) => {
                    const isCurrentlyGenerating = isGenerating && currentReport === report.id;
                    const selectedFormat = getSelectedFormat(report.id, report.formats);
                    const ReportIcon = report.icon;
                    const colors = colorClasses[report.color] || colorClasses.blue;

                    return (
                        <Card key={report.id} className={cn(isCurrentlyGenerating && "ring-2 ring-primary/20")}>
                            <CardContent className="p-5">
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={cn("p-2.5 rounded-lg", colors.bg)}>
                                                <ReportIcon className={cn("h-5 w-5", colors.text)} />
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
                    <CardTitle className="text-sm font-medium">About Product Reports</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>Catalog Export</strong> - Full product data for backup or import elsewhere</li>
                        <li>• <strong>Low Stock</strong> - Items needing restock with supplier info</li>
                        <li>• <strong>Performance</strong> - Best and worst selling products with metrics</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
