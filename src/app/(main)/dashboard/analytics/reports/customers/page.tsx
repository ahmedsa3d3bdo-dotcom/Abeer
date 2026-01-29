"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Download,
    Users,
    Loader2,
    Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const customerReports = [
    {
        id: "customer-list",
        name: "Customer List Export",
        description: "Complete list of all registered customers",
        formats: ["CSV", "XLSX"],
        fields: ["Name", "Email", "Phone", "Created", "Orders", "Total Spent"],
    },
    {
        id: "customer-ltv",
        name: "Customer Lifetime Value",
        description: "Customer LTV analysis and rankings",
        formats: ["XLSX", "PDF"],
        fields: ["Customer", "Orders", "Total Spent", "LTV", "Last Order", "Segment"],
    },
    {
        id: "acquisition-report",
        name: "Acquisition Report",
        description: "How and when customers signed up",
        formats: ["PDF", "XLSX"],
        fields: ["Period", "New Customers", "Source", "First Order Rate"],
    },
    {
        id: "repeat-customers",
        name: "Repeat Customer Analysis",
        description: "Customers with multiple purchases",
        formats: ["XLSX", "CSV"],
        fields: ["Customer", "Orders", "Frequency", "Avg Order Value", "Loyalty Score"],
    },
    {
        id: "customer-segments",
        name: "Customer Segments",
        description: "Customers grouped by behavior and value",
        formats: ["PDF", "XLSX"],
        fields: ["Segment", "Customers", "Revenue", "Avg LTV", "Churn Risk"],
    },
    {
        id: "geographic-distribution",
        name: "Geographic Distribution",
        description: "Customer locations and regional analysis",
        formats: ["PDF", "CSV"],
        fields: ["Region", "Customers", "Orders", "Revenue", "AOV"],
    },
];

export default function CustomerReportsPage() {
    const [generating, setGenerating] = useState<string | null>(null);
    const [generated, setGenerated] = useState<string | null>(null);
    const [exportFormat, setExportFormat] = useState("CSV");

    const handleGenerate = async (reportId: string) => {
        setGenerating(reportId);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setGenerating(null);
        setGenerated(reportId);
        setTimeout(() => setGenerated(null), 3000);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Customer Reports</h2>
                    <p className="text-sm text-muted-foreground">
                        Generate customer lists, segments, and behavior reports
                    </p>
                </div>
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

            <div className="grid gap-4">
                {customerReports.map((report) => (
                    <Card key={report.id}>
                        <CardContent className="p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 rounded-lg bg-blue-500/10">
                                        <Users className="h-5 w-5 text-blue-600" />
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
                                            generated === report.id && "bg-blue-600 hover:bg-blue-600"
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
