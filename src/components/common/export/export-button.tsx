"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
    Download,
    FileText,
    FileSpreadsheet,
    FileCode,
    Loader2,
    ChevronDown,
} from "lucide-react";
import { useExport, type ExportColumn, type ExportFormat } from "./export-provider";
import type { SummaryItem } from "@/lib/reports/report-generator";

interface ExportButtonProps {
    /** Title for the exported report */
    title: string;
    /** Optional subtitle/description */
    subtitle?: string;
    /** Type of data being exported */
    type?: "orders" | "products" | "customers" | "discounts" | "reviews" | "users" | "refunds" | "returns" | "shipping" | "support" | "generic";
    /** Column definitions for the export */
    columns: ExportColumn[];
    /** Data to export */
    data: Record<string, any>[];
    /** Optional summary KPIs to include (PDF only) */
    summary?: SummaryItem[];
    /** Available formats (defaults to all) */
    formats?: ExportFormat[];
    /** Variant of the button */
    variant?: "default" | "outline" | "secondary" | "ghost";
    /** Size of the button */
    size?: "default" | "sm" | "lg" | "icon";
    /** Show loading state */
    loading?: boolean;
    /** Disabled state */
    disabled?: boolean;
    /** Optional class name */
    className?: string;
}

export function ExportButton({
    title,
    subtitle,
    type = "generic",
    columns,
    data,
    summary,
    formats = ["pdf", "xlsx", "csv"],
    variant = "outline",
    size = "sm",
    loading = false,
    disabled = false,
    className,
}: ExportButtonProps) {
    const { exportData, isExporting, progress } = useExport();
    const [isOpen, setIsOpen] = useState(false);

    const handleExport = async (format: ExportFormat) => {
        setIsOpen(false);
        await exportData(
            {
                title,
                subtitle,
                type,
                columns,
                data,
                summary,
            },
            format
        );
    };

    const formatIcons: Record<ExportFormat, typeof FileText> = {
        pdf: FileText,
        xlsx: FileSpreadsheet,
        csv: FileCode,
    };

    const formatLabels: Record<ExportFormat, string> = {
        pdf: "PDF Document",
        xlsx: "Excel Spreadsheet",
        csv: "CSV File",
    };

    const formatDescriptions: Record<ExportFormat, string> = {
        pdf: "Professional branded report",
        xlsx: "Editable spreadsheet with formatting",
        csv: "Raw data for analysis",
    };

    const isLoading = loading || isExporting;
    const isDisabled = disabled || isLoading || data.length === 0;

    return (
        <div className="relative">
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant={variant}
                        size={size}
                        disabled={isDisabled}
                        className={className}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4 mr-2" />
                        )}
                        Export
                        <ChevronDown className="h-3 w-3 ml-1.5 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex items-center justify-between">
                        <span>Export Format</span>
                        <span className="text-xs font-normal text-muted-foreground">
                            {data.length} {data.length === 1 ? "record" : "records"}
                        </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {formats.map((format) => {
                        const Icon = formatIcons[format];
                        return (
                            <DropdownMenuItem
                                key={format}
                                onClick={() => handleExport(format)}
                                className="flex items-start gap-3 py-2.5"
                            >
                                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                <div className="flex flex-col">
                                    <span className="font-medium">{formatLabels[format]}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDescriptions[format]}
                                    </span>
                                </div>
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Progress indicator */}
            {isExporting && progress > 0 && progress < 100 && (
                <div className="absolute -bottom-2 left-0 right-0">
                    <Progress value={progress} className="h-0.5" />
                </div>
            )}
        </div>
    );
}

/**
 * Simpler export button that exports to a single format directly
 */
interface QuickExportButtonProps {
    title: string;
    subtitle?: string;
    type?: "orders" | "products" | "customers" | "discounts" | "reviews" | "users" | "refunds" | "returns" | "shipping" | "support" | "generic";
    columns: ExportColumn[];
    data: Record<string, any>[];
    summary?: SummaryItem[];
    format: ExportFormat;
    variant?: "default" | "outline" | "secondary" | "ghost";
    size?: "default" | "sm" | "lg" | "icon";
    loading?: boolean;
    disabled?: boolean;
    className?: string;
    children?: React.ReactNode;
}

export function QuickExportButton({
    title,
    subtitle,
    type = "generic",
    columns,
    data,
    summary,
    format,
    variant = "outline",
    size = "sm",
    loading = false,
    disabled = false,
    className,
    children,
}: QuickExportButtonProps) {
    const { exportData, isExporting } = useExport();

    const handleClick = async () => {
        await exportData(
            {
                title,
                subtitle,
                type,
                columns,
                data,
                summary,
            },
            format
        );
    };

    const Icon = format === "pdf" ? FileText : format === "xlsx" ? FileSpreadsheet : FileCode;
    const isLoading = loading || isExporting;
    const isDisabled = disabled || isLoading || data.length === 0;

    return (
        <Button
            variant={variant}
            size={size}
            disabled={isDisabled}
            onClick={handleClick}
            className={className}
        >
            {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
                <Icon className="h-4 w-4 mr-2" />
            )}
            {children || `Export ${format.toUpperCase()}`}
        </Button>
    );
}
