"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
    Download,
    FileText,
    Users,
    Loader2,
    Check,
    FileSpreadsheet,
    FileCode,
    CalendarIcon,
    UserPlus,
    Heart,
    Globe,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useReportGenerator, type ReportFormat, type ReportConfig } from "@/hooks/use-report-generator";
import { toast } from "sonner";

const customerReports: Array<ReportConfig & { description: string; formats: string[]; fields: string[]; icon: any }> = [
    {
        id: "customer-list",
        name: "Customer List Export",
        type: "customers",
        description: "Complete customer database with contact details",
        formats: ["XLSX", "CSV"],
        fields: ["Name", "Email", "Phone", "Address", "Join Date", "Status"],
        icon: Users,
    },
    {
        id: "customer-ltv",
        name: "Customer Lifetime Value Report",
        type: "customers",
        description: "Top customers ranked by total purchase value",
        formats: ["PDF", "XLSX"],
        fields: ["Customer", "Orders", "Total Spent", "Avg Order", "Last Purchase"],
        icon: Heart,
    },
    {
        id: "customer-acquisition",
        name: "Customer Acquisition Report",
        type: "customers",
        description: "New customer signups and sources over time",
        formats: ["PDF", "XLSX"],
        fields: ["Period", "New Customers", "Source", "Conversion Rate"],
        icon: UserPlus,
    },
    {
        id: "customer-segments",
        name: "Customer Segments Report",
        type: "customers",
        description: "Customer categorization by purchase behavior",
        formats: ["PDF", "XLSX"],
        fields: ["Segment", "Count", "Avg Value", "Revenue %", "Retention"],
        icon: Users,
    },
    {
        id: "geographic-distribution",
        name: "Geographic Distribution Report",
        type: "customers",
        description: "Customer locations and regional sales data",
        formats: ["PDF", "XLSX"],
        fields: ["Region", "Customers", "Orders", "Revenue", "Top City"],
        icon: Globe,
    },
];

const formatIcons: Record<string, any> = {
    PDF: FileText,
    XLSX: FileSpreadsheet,
    CSV: FileCode,
};

export default function CustomersReportsPage() {
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

    const handleGenerate = async (report: typeof customerReports[0]) => {
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
                    <h2 className="text-lg font-semibold">Customer Reports</h2>
                    <p className="text-sm text-muted-foreground">
                        Generate customer insights, segmentation, and acquisition reports
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
                {customerReports.map((report) => {
                    const isCurrentlyGenerating = isGenerating && currentReport === report.id;
                    const selectedFormat = getSelectedFormat(report.id, report.formats);
                    const ReportIcon = report.icon;

                    return (
                        <Card key={report.id} className={cn(isCurrentlyGenerating && "ring-2 ring-primary/20")}>
                            <CardContent className="p-5">
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2.5 rounded-lg bg-purple-500/10">
                                                <ReportIcon className="h-5 w-5 text-purple-600" />
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
                    <CardTitle className="text-sm font-medium">About Customer Reports</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>Customer List</strong> - Export for marketing campaigns or CRM integration</li>
                        <li>• <strong>LTV Report</strong> - Identify your most valuable customers</li>
                        <li>• <strong>Acquisition</strong> - Track growth and marketing effectiveness</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
