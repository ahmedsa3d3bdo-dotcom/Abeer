/**
 * Simple Chart Export - Export charts as PNG without html2canvas
 * Uses native browser APIs to convert SVG charts to images
 */

/**
 * Export a chart element as PNG image
 */
export async function exportChartAsPNG(elementId: string, filename: string): Promise<void> {
    const element = document.getElementById(elementId);
    
    if (!element) {
        throw new Error(`Chart element not found: ${elementId}`);
    }

    try {
        // Find all SVG elements in the chart
        const svgs = element.querySelectorAll('svg');
        
        if (svgs.length === 0) {
            throw new Error('No SVG chart found in element');
        }

        // Get the main chart SVG (usually the largest one)
        const chartSvg = Array.from(svgs).reduce((largest, current) => {
            const largestSize = largest.getBoundingClientRect().width * largest.getBoundingClientRect().height;
            const currentSize = current.getBoundingClientRect().width * current.getBoundingClientRect().height;
            return currentSize > largestSize ? current : largest;
        });

        // Clone the SVG to avoid modifying the original
        const clonedSvg = chartSvg.cloneNode(true) as SVGElement;
        
        // Get dimensions
        const bbox = chartSvg.getBoundingClientRect();
        const width = bbox.width;
        const height = bbox.height;

        // Set explicit dimensions on cloned SVG
        clonedSvg.setAttribute('width', width.toString());
        clonedSvg.setAttribute('height', height.toString());
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        // Convert SVG to string
        const svgString = new XMLSerializer().serializeToString(clonedSvg);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        // Create an image and canvas
        const img = new Image();
        img.width = width * 2; // 2x for better quality
        img.height = height * 2;

        await new Promise<void>((resolve, reject) => {
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = width * 2;
                    canvas.height = height * 2;
                    const ctx = canvas.getContext('2d');
                    
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }

                    // Fill white background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Draw the image
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Convert to PNG and download
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Failed to create image blob'));
                            return;
                        }

                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${filename}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        URL.revokeObjectURL(svgUrl);
                        resolve();
                    }, 'image/png');
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => {
                reject(new Error('Failed to load SVG image'));
            };

            img.src = svgUrl;
        });
    } catch (error) {
        console.error('Chart export failed:', error);
        throw error;
    }
}
