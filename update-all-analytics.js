// This file documents the changes needed for all analytics pages
// Run manually or use as reference

const updates = {
  products: {
    file: 'src/app/(main)/dashboard/analytics/products/page.tsx',
    changes: 'Remove chart capture, export tables only with all product data'
  },
  customers: {
    file: 'src/app/(main)/dashboard/analytics/customers/page.tsx',
    changes: 'Remove chart capture, export tables only with customer data'
  },
  marketing: {
    file: 'src/app/(main)/dashboard/analytics/marketing/page.tsx',
    changes: 'Remove chart capture, export tables only with discount data'
  }
};

console.log('Analytics pages to update:', updates);
