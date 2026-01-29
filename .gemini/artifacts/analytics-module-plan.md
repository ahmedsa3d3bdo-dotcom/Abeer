# Analytics & Reports Module - Implementation Plan

## Overview

Build a comprehensive, multi-page Analytics module inspired by Shopify, WooCommerce Admin, and Google Analytics. The module will provide actionable insights with dedicated sub-pages and integrated reports.

---

## 1. Module Structure

### Navigation Hierarchy

```
📊 Analytics (new sidebar group)
├── 📈 Overview          - Quick metrics & KPIs dashboard (replaces current Default)
├── 💰 Sales Analytics   - Revenue, orders, AOV trends
├── 🛍️ Products          - Product performance, inventory insights
├── 👥 Customers         - Customer behavior, acquisition, retention
├── 🎯 Marketing         - Discounts, campaigns, traffic sources
└── 📋 Reports           - Download & schedule reports
    ├── Sales Reports
    ├── Product Reports
    ├── Customer Reports
    └── Financial Reports
```

---

## 2. Page Breakdown

### 2.1 Overview Dashboard (`/dashboard/analytics`)
**Purpose:** High-level KPI cards and quick insights

**Components:**
- KPI Cards Row (Total Revenue, Orders, Customers, AOV)
- Live sales indicator
- Quick performance charts (mini sparklines)
- Recent activity feed
- Quick actions (view reports, export)

---

### 2.2 Sales Analytics (`/dashboard/analytics/sales`)
**Purpose:** Deep dive into revenue and orders

**Tabs:**
1. **Revenue** - Revenue trends, comparisons, forecasts
2. **Orders** - Order volume, status breakdown, fulfillment rates
3. **Payments** - Payment method breakdown, success/failure rates

**Charts:**
- Revenue over time (line/area chart with comparison)
- Orders by status (donut chart)
- Revenue by channel/source (bar chart)
- Average order value trend
- Sales by day of week / hour of day (heatmap)

**Filters:** Date range, compare periods, currency

---

### 2.3 Product Analytics (`/dashboard/analytics/products`)
**Purpose:** Product performance insights

**Tabs:**
1. **Performance** - Top/bottom sellers, revenue by product
2. **Inventory** - Stock levels, turnover, alerts
3. **Categories** - Category performance comparison

**Components:**
- Top products table (sortable by revenue, units, views)
- Product performance matrix (revenue vs. units scatter)
- Low stock alerts
- Category breakdown pie chart
- Inventory value timeline

---

### 2.4 Customer Analytics (`/dashboard/analytics/customers`)
**Purpose:** Customer behavior and lifecycle

**Tabs:**
1. **Overview** - New vs returning, lifetime value
2. **Acquisition** - How customers find you
3. **Retention** - Repeat purchase rates, churn

**Charts:**
- Customer acquisition timeline
- Customer lifetime value distribution
- Cohort retention table
- Geographic distribution map
- Purchase frequency histogram

---

### 2.5 Marketing Analytics (`/dashboard/analytics/marketing`)
**Purpose:** Discount and campaign performance

**Tabs:**
1. **Discounts** - Discount usage, savings, ROI
2. **Campaigns** - Email campaigns, newsletter performance
3. **Traffic** - (Future: acquisition sources)

**Components:**
- Top performing discounts
- Discount usage over time
- Discount type breakdown (migrate from current default)
- Campaign success metrics

---

### 2.6 Reports Hub (`/dashboard/analytics/reports`)
**Purpose:** Generate, download, and schedule reports

**Features:**
- Report templates (pre-built)
- Custom report builder
- Export formats: PDF, CSV, Excel
- Scheduled reports (email delivery)
- Report history

**Report Categories:**
1. **Sales Reports**
   - Daily/Weekly/Monthly sales summary
   - Sales by product
   - Sales by category
   - Order details report

2. **Product Reports**
   - Inventory valuation
   - Low stock report
   - Product performance
   - Category performance

3. **Customer Reports**
   - Customer list with metrics
   - Customer acquisition report
   - Customer lifetime value

4. **Financial Reports**
   - Revenue summary
   - Discount impact analysis
   - Tax collected
   - Shipping revenue

---

## 3. Default Dashboard Redesign

The current `/dashboard/default` will become a **clean overview** with:

### Layout:
```
┌─────────────────────────────────────────────────────────────┐
│  KPI Cards (4-5 cards with sparklines)                      │
├─────────────────────────────────────────────────────────────┤
│  Main Chart: Revenue & Orders (area chart)        [filters] │
├─────────────────────────┬───────────────────────────────────┤
│  Recent Orders (compact)│  Quick Insights                   │
│                         │  • Top product today              │
│                         │  • New customers this week        │
│                         │  • Active discounts               │
├─────────────────────────┴───────────────────────────────────┤
│  Quick Links to Analytics Pages                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Technical Implementation

### New Files to Create:

```
src/app/(main)/dashboard/analytics/
├── page.tsx                    # Overview (redirects or main)
├── layout.tsx                  # Analytics layout with sub-nav
├── sales/
│   ├── page.tsx
│   └── _components/
├── products/
│   ├── page.tsx
│   └── _components/
├── customers/
│   ├── page.tsx
│   └── _components/
├── marketing/
│   ├── page.tsx
│   └── _components/
└── reports/
    ├── page.tsx
    ├── sales/page.tsx
    ├── products/page.tsx
    ├── customers/page.tsx
    └── financial/page.tsx

src/app/api/v1/analytics/
├── overview/route.ts
├── sales/route.ts
├── products/route.ts
├── customers/route.ts
├── marketing/route.ts
└── reports/
    ├── generate/route.ts
    └── scheduled/route.ts
```

### Shared Components:
- `AnalyticsCard` - Reusable metric card with sparkline
- `DateRangePicker` - Consistent date filtering
- `ChartContainer` - Wrapper with loading/error states
- `ComparisonBadge` - Show % change vs previous period
- `ExportButton` - Download data as CSV/PDF

---

## 5. Design Principles

1. **Glanceable** - Key metrics visible immediately
2. **Actionable** - Insights lead to actions
3. **Consistent** - Same patterns across all pages
4. **Fast** - Optimistic loading, skeleton states
5. **Responsive** - Works on all devices
6. **Exportable** - Everything can be downloaded

---

## 6. Implementation Order

### Phase 1: Structure ✅ COMPLETED
1. ✅ Created analytics folder structure
2. ✅ Added analytics navigation group to sidebar
3. ✅ Created layout with sub-navigation tabs
4. ✅ Built Sales Analytics page with API
5. ✅ Built Products Analytics page with API
6. ✅ Built Customers Analytics page with API
7. ✅ Built Marketing Analytics page with API (migrated discount analytics)
8. ✅ Built Reports Hub with sub-pages (Sales, Products, Customers, Financial)
9. ✅ Redesigned Default dashboard with Analytics quick links

### Phase 2: Enhancements (Future)
- Add real-time data updates
- Implement actual report generation (PDF/Excel export)
- Add scheduled reports functionality
- Add comparison period feature
- Add custom date range pickers
- Implement cohort analysis for customers

---

## 7. Files Created

### Analytics Pages
- `src/app/(main)/dashboard/analytics/layout.tsx` - Layout with tabbed navigation
- `src/app/(main)/dashboard/analytics/page.tsx` - Redirect to Sales
- `src/app/(main)/dashboard/analytics/sales/page.tsx` - Sales Analytics
- `src/app/(main)/dashboard/analytics/products/page.tsx` - Products Analytics
- `src/app/(main)/dashboard/analytics/customers/page.tsx` - Customers Analytics
- `src/app/(main)/dashboard/analytics/marketing/page.tsx` - Marketing Analytics
- `src/app/(main)/dashboard/analytics/reports/page.tsx` - Reports Hub
- `src/app/(main)/dashboard/analytics/reports/sales/page.tsx` - Sales Reports
- `src/app/(main)/dashboard/analytics/reports/products/page.tsx` - Product Reports
- `src/app/(main)/dashboard/analytics/reports/customers/page.tsx` - Customer Reports
- `src/app/(main)/dashboard/analytics/reports/financial/page.tsx` - Financial Reports

### API Endpoints
- `src/app/api/v1/analytics/sales/route.ts` - Sales data API
- `src/app/api/v1/analytics/products/route.ts` - Products data API
- `src/app/api/v1/analytics/customers/route.ts` - Customers data API
- `src/app/api/v1/analytics/marketing/route.ts` - Marketing/Discounts data API

### Modified Files
- `src/navigation/sidebar/sidebar-items.ts` - Added Analytics section
- `src/app/(main)/dashboard/default/page.tsx` - Redesigned with Analytics quick links

---

## 8. UI/UX Reference

Inspired by:
- **Shopify Admin** - Clean KPI cards, tabbed analytics
- **WooCommerce Analytics** - Category-based navigation
- **Google Analytics 4** - Cards, charts, comparison tools
- **Stripe Dashboard** - Revenue charts, payment insights
- **Plausible Analytics** - Simple, fast, privacy-focused

