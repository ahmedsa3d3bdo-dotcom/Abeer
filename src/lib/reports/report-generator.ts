/**
 * Report Generation Utilities
 * Professional report creation with PDF, Excel, and CSV support
 * Includes branding, styling, and structured content
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// App branding configuration
export const BRAND_CONFIG = {
    name: "AbeerShop",
    tagline: "Home Goods & Living",
    colors: {
        primary: "#2563eb", // Blue
        secondary: "#1e40af",
        accent: "#3b82f6",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        text: "#1f2937",
        textLight: "#6b7280",
        background: "#ffffff",
        border: "#e5e7eb",
    },
    logoPath: "/Storefront/images/Complete-Logo.png",
};

// Report metadata type
export interface ReportMetadata {
    title: string;
    subtitle?: string;
    dateRange?: { from: Date; to: Date };
    generatedAt: Date;
    generatedBy?: string;
    reportType: "sales" | "products" | "customers" | "financial";
}

// Column definition for tables
export interface TableColumn {
    header: string;
    key: string;
    width?: number;
    align?: "left" | "center" | "right";
    format?: "currency" | "number" | "percentage" | "date" | "text";
}

// Summary card for KPIs
export interface SummaryItem {
    label: string;
    value: string | number;
    change?: number;
    format?: "currency" | "number" | "percentage" | "text";
    color?: "emerald" | "blue" | "purple" | "amber" | "red" | "cyan" | "pink" | "indigo";
}

// Chart data for analytics reports
export interface ChartData {
    title: string;
    type: "bar" | "line" | "pie" | "area";
    description?: string;
    imageData: string; // Base64 encoded image
    width?: number;
    height?: number;
}

/**
 * Format value based on type
 */
export function formatValue(
    value: any,
    format?: "currency" | "number" | "percentage" | "date" | "text"
): string {
    if (value === null || value === undefined) return "-";

    switch (format) {
        case "currency":
            return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
            }).format(Number(value));
        case "number":
            return new Intl.NumberFormat("en-US").format(Number(value));
        case "percentage":
            return `${Number(value).toFixed(1)}%`;
        case "date":
            return new Date(value).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        default:
            return String(value);
    }
}

/**
 * Load and convert image to base64
 */
async function loadImageAsBase64(imagePath: string): Promise<string | null> {
    try {
        const response = await fetch(imagePath);
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

/**
 * Generate Analytics PDF Report with charts and tables
 */
export async function generateAnalyticsPDFReport(
    metadata: ReportMetadata,
    summary: SummaryItem[],
    charts: ChartData[],
    tables: Array<{
        title: string;
        columns: TableColumn[];
        data: Record<string, any>[];
    }>,
    logoBase64?: string
): Promise<Blob> {
    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - 2 * margin;
    let currentY = margin;

    // Try to load logo if not provided
    let logo: string | undefined = logoBase64;
    if (!logo) {
        const loadedLogo = await loadImageAsBase64(BRAND_CONFIG.logoPath);
        logo = loadedLogo ?? undefined;
    }

    // Helper to add new page if needed
    const checkPageBreak = (requiredHeight: number) => {
        if (currentY + requiredHeight > pageHeight - 20) {
            pdf.addPage();
            currentY = margin + 5;
            addPageHeader();
        }
    };

    // Compact page header for subsequent pages
    const addPageHeader = () => {
        pdf.setFillColor(37, 99, 235);
        pdf.rect(0, 0, pageWidth, 12, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text(BRAND_CONFIG.name, margin, 8);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text(metadata.title, pageWidth - margin, 8, { align: "right" });
        currentY = 18;
    };

    // Main header with logo and branding (first page only)
    const addMainHeader = () => {
        const headerHeight = 40;

        // Header background with gradient effect
        pdf.setFillColor(37, 99, 235);
        pdf.rect(0, 0, pageWidth, headerHeight, "F");

        // Darker accent strip at bottom
        pdf.setFillColor(30, 64, 175);
        pdf.rect(0, headerHeight - 3, pageWidth, 3, "F");

        // Logo - larger and positioned nicely
        const logoSize = 28;
        const logoX = margin;
        const logoY = 6;

        if (logo) {
            try {
                pdf.addImage(logo, "PNG", logoX, logoY, logoSize, logoSize);
            } catch {
                // Fallback: draw styled circle with initial
                pdf.setFillColor(255, 255, 255);
                pdf.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, "F");
                pdf.setTextColor(37, 99, 235);
                pdf.setFontSize(16);
                pdf.setFont("helvetica", "bold");
                pdf.text("A", logoX + logoSize / 2 - 4, logoY + logoSize / 2 + 5);
            }
        } else {
            // Fallback: draw styled circle with initial
            pdf.setFillColor(255, 255, 255);
            pdf.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, "F");
            pdf.setTextColor(37, 99, 235);
            pdf.setFontSize(16);
            pdf.setFont("helvetica", "bold");
            pdf.text("A", logoX + logoSize / 2 - 4, logoY + logoSize / 2 + 5);
        }

        // Report info (right side)
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        const rightMargin = pageWidth - margin;
        pdf.text(
            `Generated: ${metadata.generatedAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            })} at ${metadata.generatedAt.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
            })}`,
            rightMargin,
            15,
            { align: "right" }
        );

        if (metadata.dateRange) {
            pdf.text(
                `Period: ${metadata.dateRange.from.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                })} - ${metadata.dateRange.to.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                })}`,
                rightMargin,
                22,
                { align: "right" }
            );
        }

        currentY = headerHeight + 8;
    };

    // Add footer
    const addFooter = (pageNumber: number, totalPages: number) => {
        const footerY = pageHeight - 10;

        // Footer line
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.3);
        pdf.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(
            `© ${new Date().getFullYear()} ${BRAND_CONFIG.name} • Confidential Analytics Report`,
            margin,
            footerY
        );
        pdf.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, footerY, {
            align: "right",
        });
    };

    // Start building the PDF
    addMainHeader();

    // Report Title Section
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(margin, currentY, contentWidth, metadata.subtitle ? 24 : 18, 2, 2, "F");

    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(metadata.title, margin + 6, currentY + 10);

    if (metadata.subtitle) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        pdf.text(metadata.subtitle, margin + 6, currentY + 18);
        currentY += 30;
    } else {
        currentY += 24;
    }

    // Summary Cards Section
    if (summary.length > 0) {
        const cardCount = Math.min(summary.length, 5);
        const cardSpacing = 4;
        const cardWidth = (contentWidth - (cardCount - 1) * cardSpacing) / cardCount;
        const cardHeight = 28;

        // Color mapping for cards
        const colorMap: Record<string, [number, number, number]> = {
            emerald: [16, 185, 129],
            blue: [59, 130, 246],
            purple: [139, 92, 246],
            amber: [245, 158, 11],
            red: [239, 68, 68],
            cyan: [6, 182, 212],
            pink: [236, 72, 153],
        };

        summary.slice(0, 5).forEach((item, index) => {
            const cardX = margin + index * (cardWidth + cardSpacing);

            // Card background with subtle border
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(229, 231, 235);
            pdf.setLineWidth(0.3);
            pdf.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, "FD");

            // Colored top accent based on item color or default
            const accentColor = (item.color && colorMap[item.color]) ? colorMap[item.color] : colorMap.blue;
            pdf.setFillColor(...accentColor);
            pdf.rect(cardX, currentY, cardWidth, 3, "F");
            // Round top corners manually
            pdf.setFillColor(255, 255, 255);
            pdf.rect(cardX, currentY + 2, cardWidth, 2, "F");
            pdf.setFillColor(...accentColor);
            pdf.roundedRect(cardX, currentY, cardWidth, 3, 2, 2, "F");

            // Label
            pdf.setTextColor(107, 114, 128);
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            pdf.text(item.label, cardX + 6, currentY + 12);

            // Value
            pdf.setTextColor(31, 41, 55);
            pdf.setFontSize(13);
            pdf.setFont("helvetica", "bold");
            const displayValue = formatValue(item.value, item.format);
            pdf.text(displayValue, cardX + 6, currentY + 22);

            // Change indicator (if present)
            if (item.change !== undefined) {
                const isPositive = item.change >= 0;
                pdf.setTextColor(isPositive ? 16 : 239, isPositive ? 185 : 68, isPositive ? 129 : 68);
                pdf.setFontSize(7);
                pdf.text(
                    `${isPositive ? "▲" : "▼"} ${Math.abs(item.change).toFixed(1)}%`,
                    cardX + cardWidth - 6,
                    currentY + 12,
                    { align: "right" }
                );
            }
        });

        currentY += cardHeight + 10;
    }

    // Charts Section - Each chart on its own section with color coding
    const chartColors: [number, number, number][] = [
        [37, 99, 235],   // Blue
        [16, 185, 129],  // Green
        [139, 92, 246],  // Purple
        [245, 158, 11],  // Amber
    ];

    for (let chartIndex = 0; chartIndex < charts.length; chartIndex++) {
        const chart = charts[chartIndex];
        const chartHeight = 120;
        
        checkPageBreak(chartHeight + 20);

        // Section header with color accent
        const sectionColor = chartColors[chartIndex % chartColors.length];
        pdf.setFillColor(...sectionColor);
        pdf.roundedRect(margin, currentY, 4, 12, 1, 1, "F");

        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text(chart.title, margin + 8, currentY + 8);

        if (chart.description) {
            pdf.setTextColor(107, 114, 128);
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            pdf.text(chart.description, pageWidth - margin, currentY + 8, { align: "right" });
        }

        currentY += 16;

        // Chart container with border
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(margin, currentY, contentWidth, chartHeight, 2, 2, "S");

        // Add chart image
        try {
            if (chart.imageData && chart.imageData.length > 0) {
                const chartWidth = contentWidth - 4;
                const chartImgHeight = chartHeight - 4;
                // Ensure the image data is a valid base64 string
                if (chart.imageData.startsWith("data:image/")) {
                    pdf.addImage(chart.imageData, "PNG", margin + 2, currentY + 2, chartWidth, chartImgHeight);
                } else {
                    throw new Error("Invalid image data format");
                }
            } else {
                throw new Error("No image data provided");
            }
        } catch (error) {
            console.error("Failed to add chart image:", error);
            // Draw placeholder
            pdf.setFillColor(248, 250, 252);
            pdf.roundedRect(margin + 2, currentY + 2, contentWidth - 4, chartHeight - 4, 2, 2, "F");
            pdf.setTextColor(107, 114, 128);
            pdf.setFontSize(10);
            pdf.text("Chart unavailable", margin + contentWidth / 2, currentY + chartHeight / 2, { align: "center" });
        }

        currentY += chartHeight + 12;
    }

    // Tables Section with rotating colors
    const tableColors: [number, number, number][] = [
        [37, 99, 235],   // Blue
        [16, 185, 129],  // Emerald
        [139, 92, 246],  // Purple
        [245, 158, 11],  // Amber
        [6, 182, 212],   // Cyan
        [236, 72, 153],  // Pink
    ];

    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
        const table = tables[tableIndex];

        if (table.data.length === 0) continue;

        checkPageBreak(40);

        // Get color for this table
        const tableColor = tableColors[tableIndex % tableColors.length];

        // Table title with colored accent bar
        pdf.setFillColor(...tableColor);
        pdf.roundedRect(margin, currentY, 4, 12, 1, 1, "F");

        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text(table.title, margin + 8, currentY + 8);

        // Record count
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(`${table.data.length} records`, pageWidth - margin, currentY + 8, { align: "right" });

        currentY += 16;

        // Generate table with full width
        const headers = table.columns.map((col) => col.header);
        const body = table.data.map((row) =>
            table.columns.map((col) => formatValue(row[col.key], col.format))
        );

        // Calculate column widths proportionally to fill page
        const totalDefinedWidth = table.columns.reduce((sum, col) => sum + (col.width || 20), 0);
        const columnStyles = table.columns.reduce((acc, col, index) => {
            const proportion = (col.width || 20) / totalDefinedWidth;
            acc[index] = {
                halign: col.align || "left",
                cellWidth: contentWidth * proportion,
            };
            return acc;
        }, {} as Record<number, any>);

        autoTable(pdf, {
            startY: currentY,
            head: [headers],
            body: body,
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: {
                fontSize: 8,
                cellPadding: 3,
                lineColor: [229, 231, 235],
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: tableColor,
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: "bold",
                halign: "left",
                cellPadding: 4,
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [31, 41, 55],
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            columnStyles: columnStyles,
        });

        currentY = (pdf as any).lastAutoTable.finalY + 12;
    }

    // Add footers to all pages
    const totalPages = (pdf as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        (pdf as any).setPage(i);
        addFooter(i, totalPages);
    }

    return pdf.output("blob");
}

/**
 * Generate PDF Report with professional styling (original function for backward compatibility)
 */
export async function generatePDFReport(
    metadata: ReportMetadata,
    summary: SummaryItem[],
    tables: Array<{
        title: string;
        columns: TableColumn[];
        data: Record<string, any>[];
    }>,
    logoBase64?: string,
    orientation: "portrait" | "landscape" = "portrait"
): Promise<Blob> {
    const pdf = new jsPDF({
        orientation: orientation,
        unit: "mm",
        format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - 2 * margin;
    let currentY = margin;

    // Try to load logo if not provided
    let logo: string | undefined = logoBase64;
    if (!logo) {
        const loadedLogo = await loadImageAsBase64(BRAND_CONFIG.logoPath);
        logo = loadedLogo ?? undefined;
    }

    // Helper to add new page if needed
    const checkPageBreak = (requiredHeight: number) => {
        if (currentY + requiredHeight > pageHeight - 20) {
            pdf.addPage();
            currentY = margin + 5;
            addPageHeader();
        }
    };

    // Compact page header for subsequent pages
    const addPageHeader = () => {
        pdf.setFillColor(37, 99, 235);
        pdf.rect(0, 0, pageWidth, 12, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text(BRAND_CONFIG.name, margin, 8);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text(metadata.title, pageWidth - margin, 8, { align: "right" });
        currentY = 18;
    };

    // Main header with logo and branding (first page only)
    const addMainHeader = () => {
        const headerHeight = 40;

        // Header background with gradient effect
        pdf.setFillColor(37, 99, 235);
        pdf.rect(0, 0, pageWidth, headerHeight, "F");

        // Darker accent strip at bottom
        pdf.setFillColor(30, 64, 175);
        pdf.rect(0, headerHeight - 3, pageWidth, 3, "F");

        // Logo - larger and positioned nicely
        const logoSize = 28;
        const logoX = margin;
        const logoY = 6;

        if (logo) {
            try {
                pdf.addImage(logo, "PNG", logoX, logoY, logoSize, logoSize);
            } catch {
                // Fallback: draw styled circle with initial
                pdf.setFillColor(255, 255, 255);
                pdf.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, "F");
                pdf.setTextColor(37, 99, 235);
                pdf.setFontSize(16);
                pdf.setFont("helvetica", "bold");
                pdf.text("A", logoX + logoSize / 2 - 4, logoY + logoSize / 2 + 5);
            }
        } else {
            // Fallback: draw styled circle with initial
            pdf.setFillColor(255, 255, 255);
            pdf.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, "F");
            pdf.setTextColor(37, 99, 235);
            pdf.setFontSize(16);
            pdf.setFont("helvetica", "bold");
            pdf.text("A", logoX + logoSize / 2 - 4, logoY + logoSize / 2 + 5);
        }

        // Report info (right side)
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        const rightMargin = pageWidth - margin;
        pdf.text(
            `Generated: ${metadata.generatedAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            })} at ${metadata.generatedAt.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
            })}`,
            rightMargin,
            15,
            { align: "right" }
        );

        if (metadata.dateRange) {
            pdf.text(
                `Period: ${metadata.dateRange.from.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                })} - ${metadata.dateRange.to.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                })}`,
                rightMargin,
                22,
                { align: "right" }
            );
        }

        currentY = headerHeight + 8;
    };

    // Add footer
    const addFooter = (pageNumber: number, totalPages: number) => {
        const footerY = pageHeight - 10;

        // Footer line
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.3);
        pdf.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(
            `© ${new Date().getFullYear()} ${BRAND_CONFIG.name} • Confidential Business Report`,
            margin,
            footerY
        );
        pdf.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, footerY, {
            align: "right",
        });
    };

    // Start building the PDF
    addMainHeader();

    // Report Title Section
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(margin, currentY, contentWidth, metadata.subtitle ? 24 : 18, 2, 2, "F");

    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(metadata.title, margin + 6, currentY + 10);

    if (metadata.subtitle) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(107, 114, 128);
        pdf.text(metadata.subtitle, margin + 6, currentY + 18);
        currentY += 30;
    } else {
        currentY += 24;
    }

    // Summary Cards Section
    if (summary.length > 0) {
        const cardCount = Math.min(summary.length, 4);
        const cardSpacing = 4;
        const cardWidth = (contentWidth - (cardCount - 1) * cardSpacing) / cardCount;
        const cardHeight = 28;

        summary.slice(0, 4).forEach((item, index) => {
            const cardX = margin + index * (cardWidth + cardSpacing);

            // Card background with subtle border
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(229, 231, 235);
            pdf.setLineWidth(0.3);
            pdf.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, "FD");

            // Colored top accent
            const accentColors: [number, number, number][] = [
                [37, 99, 235],   // Blue
                [16, 185, 129],  // Green
                [245, 158, 11], // Amber
                [139, 92, 246],  // Purple
            ];
            pdf.setFillColor(...accentColors[index % 4]);
            pdf.rect(cardX, currentY, cardWidth, 3, "F");
            // Round top corners manually
            pdf.setFillColor(255, 255, 255);
            pdf.rect(cardX, currentY + 2, cardWidth, 2, "F");
            pdf.setFillColor(...accentColors[index % 4]);
            pdf.roundedRect(cardX, currentY, cardWidth, 3, 2, 2, "F");

            // Label
            pdf.setTextColor(107, 114, 128);
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            pdf.text(item.label, cardX + 6, currentY + 12);

            // Value
            pdf.setTextColor(31, 41, 55);
            pdf.setFontSize(13);
            pdf.setFont("helvetica", "bold");
            const displayValue = formatValue(item.value, item.format);
            pdf.text(displayValue, cardX + 6, currentY + 22);

            // Change indicator (if present)
            if (item.change !== undefined) {
                const isPositive = item.change >= 0;
                pdf.setTextColor(isPositive ? 16 : 239, isPositive ? 185 : 68, isPositive ? 129 : 68);
                pdf.setFontSize(7);
                pdf.text(
                    `${isPositive ? "▲" : "▼"} ${Math.abs(item.change).toFixed(1)}%`,
                    cardX + cardWidth - 6,
                    currentY + 12,
                    { align: "right" }
                );
            }
        });

        currentY += cardHeight + 10;
    }

    // Tables Section
    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
        const table = tables[tableIndex];

        if (table.data.length === 0) continue;

        checkPageBreak(40);

        // Table title with icon-like decoration
        pdf.setFillColor(37, 99, 235);
        pdf.roundedRect(margin, currentY, 3, 12, 1, 1, "F");

        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text(table.title, margin + 7, currentY + 8);

        // Record count
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text(`${table.data.length} records`, pageWidth - margin, currentY + 8, { align: "right" });

        currentY += 16;

        // Generate table with full width
        const headers = table.columns.map((col) => col.header);
        const body = table.data.map((row) =>
            table.columns.map((col) => formatValue(row[col.key], col.format))
        );

        // Calculate column widths proportionally to fill page
        const totalDefinedWidth = table.columns.reduce((sum, col) => sum + (col.width || 20), 0);
        const columnStyles = table.columns.reduce((acc, col, index) => {
            const proportion = (col.width || 20) / totalDefinedWidth;
            acc[index] = {
                halign: col.align || "left",
                cellWidth: contentWidth * proportion,
            };
            return acc;
        }, {} as Record<number, any>);

        autoTable(pdf, {
            startY: currentY,
            head: [headers],
            body: body,
            margin: { left: margin, right: margin },
            tableWidth: contentWidth,
            styles: {
                fontSize: 9,
                cellPadding: 4,
                lineColor: [229, 231, 235],
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: [37, 99, 235],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: "bold",
                halign: "left",
                cellPadding: 5,
            },
            bodyStyles: {
                fontSize: 9,
                textColor: [31, 41, 55],
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            columnStyles: columnStyles,
            didDrawPage: () => {
                // Add compact header on new pages
            },
        });

        currentY = (pdf as any).lastAutoTable.finalY + 12;
    }

    // Add footers to all pages
    const totalPages = (pdf as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        (pdf as any).setPage(i);
        addFooter(i, totalPages);
    }

    return pdf.output("blob");
}

/**
 * Generate Excel Report with professional styling
 */
export function generateExcelReport(
    metadata: ReportMetadata,
    summary: SummaryItem[],
    sheets: Array<{
        name: string;
        columns: TableColumn[];
        data: Record<string, any>[];
    }>
): Blob {
    const workbook = XLSX.utils.book_new();

    // Create Summary sheet
    const summaryData = [
        [BRAND_CONFIG.name],
        [metadata.title],
        [""],
        [`Generated: ${metadata.generatedAt.toLocaleDateString("en-US", { dateStyle: "full" })} at ${metadata.generatedAt.toLocaleTimeString("en-US", { timeStyle: "short" })}`],
        metadata.dateRange
            ? [`Period: ${metadata.dateRange.from.toLocaleDateString()} - ${metadata.dateRange.to.toLocaleDateString()}`]
            : [],
        [""],
        ["═══════════════════════════════════════"],
        ["KEY METRICS"],
        ["═══════════════════════════════════════"],
        ...summary.map((item) => [item.label, formatValue(item.value, item.format)]),
        [""],
        ["───────────────────────────────────────"],
        [`© ${new Date().getFullYear()} ${BRAND_CONFIG.name} - Confidential`],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    // Set column widths
    summarySheet["!cols"] = [{ wch: 35 }, { wch: 25 }];

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    // Create data sheets
    for (const sheet of sheets) {
        if (sheet.data.length === 0) continue;

        const headers = sheet.columns.map((col) => col.header);
        const rows = sheet.data.map((row) =>
            sheet.columns.map((col) => {
                const value = row[col.key];
                // Keep numbers as numbers for Excel
                if (col.format === "currency" || col.format === "number" || col.format === "percentage") {
                    return Number(value) || 0;
                }
                return formatValue(value, col.format);
            })
        );

        const sheetData = [headers, ...rows];
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

        // Set column widths
        worksheet["!cols"] = sheet.columns.map((col) => ({
            wch: Math.max(col.width || 15, col.header.length + 2),
        }));

        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
    }

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    return new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
}

/**
 * Generate CSV Report
 */
export function generateCSVReport(
    columns: TableColumn[],
    data: Record<string, any>[]
): Blob {
    const headers = columns.map((col) => `"${col.header}"`).join(",");
    const rows = data.map((row) =>
        columns
            .map((col) => {
                const value = formatValue(row[col.key], col.format);
                // Escape quotes and wrap in quotes
                return `"${String(value).replace(/"/g, '""')}"`;
            })
            .join(",")
    );

    const csv = [headers, ...rows].join("\n");
    return new Blob([csv], { type: "text/csv;charset=utf-8;" });
}

/**
 * Download a file blob
 */
export function downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Get filename with timestamp
 */
export function getReportFilename(
    reportType: string,
    format: "pdf" | "xlsx" | "csv"
): string {
    const timestamp = new Date().toISOString().split("T")[0];
    const name = `${BRAND_CONFIG.name}-${reportType}-Report-${timestamp}`;
    return `${name}.${format}`;
}
