/**
 * Chart Capture Utilities
 * Capture chart visualizations as images for PDF reports
 */

import html2canvas from "html2canvas";

/**
 * Wait for charts to fully render before capturing
 */
export async function waitForChartsToRender(delay: number = 1000): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Inject temporary stylesheet to override oklch colors with RGB equivalents
 */
function injectCompatibleColors(): () => void {
    const style = document.createElement('style');
    style.id = 'chart-capture-compat';
    style.textContent = `
        .chart-capture-mode * {
            --background: #fcfcfd !important;
            --foreground: #383839 !important;
            --card: #fefefe !important;
            --card-foreground: #383839 !important;
            --muted: #f6f6f7 !important;
            --muted-foreground: #808184 !important;
            --border: #e5e5e6 !important;
            --primary: #4f7396 !important;
            --primary-foreground: #fcfcfd !important;
            --secondary: #eeeeef !important;
            --secondary-foreground: #404041 !important;
            --accent: #e8e9ec !important;
            --accent-foreground: #404041 !important;
            --destructive: #a84848 !important;
            --ring: #6b8aaa !important;
            --chart-1: #4f7396 !important;
            --chart-2: #b87d4a !important;
            --chart-3: #8b7ec8 !important;
            --chart-4: #d4b85e !important;
            --chart-5: #b86ba8 !important;
        }
        .dark .chart-capture-mode * {
            --background: #2e2e2f !important;
            --foreground: #f2f2f3 !important;
            --card: #383839 !important;
            --card-foreground: #f2f2f3 !important;
            --muted: #474748 !important;
            --muted-foreground: #bfbfc0 !important;
            --border: rgba(242, 242, 243, 0.12) !important;
            --primary: #8eadc9 !important;
            --primary-foreground: #2e2e2f !important;
        }
    `;
    document.head.appendChild(style);
    
    return () => {
        const el = document.getElementById('chart-capture-compat');
        if (el) el.remove();
    };
}

/**
 * Capture a single chart element as base64 PNG image
 */
export async function captureChart(elementId: string): Promise<string> {
    const element = document.getElementById(elementId);
    
    if (!element) {
        console.warn(`Chart element not found: ${elementId}`);
        return "";
    }

    const cleanup = injectCompatibleColors();
    element.classList.add('chart-capture-mode');

    try {
        // Wait for styles to apply
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(element, {
            backgroundColor: "#ffffff",
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true,
        });

        const dataUrl = canvas.toDataURL("image/png");
        
        if (!dataUrl || dataUrl === "data:," || dataUrl.length < 100) {
            throw new Error("Canvas produced invalid image");
        }

        return dataUrl;
    } catch (error) {
        console.error(`Failed to capture chart ${elementId}:`, error);
        return "";
    } finally {
        element.classList.remove('chart-capture-mode');
        cleanup();
    }
}

/**
 * Capture multiple charts in sequence
 */
export async function captureMultipleCharts(elementIds: string[]): Promise<string[]> {
    const images: string[] = [];

    for (const id of elementIds) {
        const imageData = await captureChart(id);
        images.push(imageData);
    }

    return images;
}

/**
 * Capture all charts on the page with a specific class
 */
export async function captureChartsByClass(className: string): Promise<Record<string, string>> {
    const elements = document.querySelectorAll(`.${className}`);
    const charts: Record<string, string> = {};

    for (const element of Array.from(elements)) {
        const id = element.id;
        if (id) {
            const imageData = await captureChart(id);
            charts[id] = imageData;
        }
    }

    return charts;
}
