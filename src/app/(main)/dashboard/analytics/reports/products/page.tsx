"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Download,
    Package,
    Loader2,
    Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const productReports = [
    {
        id: "product-performance",
        name: "Product Performance",
        description: "Sales performance metrics for all products",
        formats: ["XLSX", "CSV"],
        fields: ["Product", "SKU", "Views", "Orders", "Revenue", "Conversion Rate"],
    },
    {
        id: "inventory-valuation",
        name: "Inventory Valuation",
        description: "Current inventory value and stock levels",
        formats: ["PDF", "XLSX"],
        fields: ["Product", "SKU", "Stock", "Cost", "Total Value", "Last Restocked"],
    },
    {
        id: "low-stock",
        name: "Low Stock Report",
        description: "Products below reorder threshold",
        formats: ["CSV", "PDF"],
        fields: ["Product", "SKU", "Current Stock", "Reorder Point", "Recommended Order"],
    },
    {
        id: "out-of-stock",
        name: "Out of Stock Report",
        description: "Products with zero inventory",
        formats: ["CSV"],
        fields: ["Product", "SKU", "Last In Stock", "Pending Orders"],
    },
    {
        id: "category-performance",
        name: "Category Performance",
        description: "Performance breakdown by category",
        formats: ["PDF", "XLSX"],
        fields: ["Category", "Products", "Revenue", "Units", "Avg Price"],
    },
    {
        id: "product-catalog",
        name: "Full Product Catalog",
        description: "Complete export of all products",
        formats: ["CSV", "XLSX"],
        fields: ["Name", "SKU", "Price", "Categories", "Status", "Created"],
    },
];

export default function ProductReportsPage() {
    const [generating, setGenerating] = useState<string | null>(null);
    const [generated, setGenerated] = useState<string | null>(null);
    const [exportFormat, setExportFormat] = useState("XLSX");

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
                    <h2 className="text-lg font-semibold">Product Reports</h2>
                    <p className="text-sm text-muted-foreground">
                        Generate inventory, performance, and catalog reports
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
                {productReports.map((report) => (
                    <Card key={report.id}>
                        <CardContent className="p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-2.5 rounded-lg bg-purple-500/10">
                                        <Package className="h-5 w-5 text-purple-600" />
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
                                            generated === report.id && "bg-purple-600 hover:bg-purple-600"
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
