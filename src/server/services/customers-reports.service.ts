import { customersReportsRepository } from "../repositories/customers-reports.repository";
import { success, failure, type ServiceResult } from "../types";

class CustomersReportsService {
  async generateList(): Promise<ServiceResult<any>> {
    try {
      const customers = await customersReportsRepository.getAllCustomers();

      return success({
        summary: {
          totalCustomers: customers.length,
          verifiedCustomers: customers.filter(c => c.emailVerified).length,
        },
        customers: customers.map((c) => ({
          name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || "Unknown",
          email: c.email,
          phone: c.phone || "N/A",
          address: "N/A",
          joinDate: c.createdAt?.toISOString().split("T")[0] || "",
          status: c.emailVerified ? "verified" : "unverified",
        })),
        reportTitle: "Customer List Export",
        reportType: "customers",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate customer list");
    }
  }

  async generateLTV(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      const customers = await customersReportsRepository.getTopCustomers(from, to);
      const totalRevenue = customers.reduce((sum, c) => sum + Number(c.totalSpent), 0);

      return success({
        summary: {
          totalCustomers: customers.length,
          totalRevenue,
          avgLTV: customers.length > 0 ? totalRevenue / customers.length : 0,
        },
        customers: customers.map((c) => ({
          customer: String(c.name || "Unknown").trim() || "Unknown",
          email: c.email,
          orders: Number(c.orders),
          totalSpent: Number(c.totalSpent),
          avgOrder: Number(c.avgOrder),
          lastPurchase: c.lastPurchase || "",
        })),
        reportTitle: "Customer Lifetime Value Report",
        reportType: "customers",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate LTV report");
    }
  }

  async generateAcquisition(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      const acquisitions = await customersReportsRepository.getNewCustomers(from, to);
      const totalNew = acquisitions.reduce((sum, d) => sum + Number(d.newCustomers), 0);

      return success({
        summary: {
          totalNewCustomers: totalNew,
          avgPerDay: acquisitions.length > 0 ? totalNew / acquisitions.length : 0,
        },
        acquisitions: acquisitions.map((d) => ({
          period: d.date,
          newCustomers: Number(d.newCustomers),
          source: "Direct",
          conversionRate: 0,
        })),
        reportTitle: "Customer Acquisition Report",
        reportType: "customers",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate acquisition report");
    }
  }

  async generateSegments(): Promise<ServiceResult<any>> {
    try {
      const segments = await customersReportsRepository.getCustomerSegments();

      const vip = segments.filter(s => Number(s.totalSpent) > 1000);
      const regular = segments.filter(s => Number(s.totalSpent) > 100 && Number(s.totalSpent) <= 1000);
      const occasional = segments.filter(s => Number(s.totalSpent) > 0 && Number(s.totalSpent) <= 100);
      const inactive = segments.filter(s => Number(s.orders) === 0);

      const totalRevenue = segments.reduce((sum, s) => sum + Number(s.totalSpent), 0);

      return success({
        summary: {
          totalCustomers: segments.length,
          totalRevenue,
        },
        segments: [
          {
            segment: "VIP Customers",
            count: vip.length,
            avgValue: vip.length > 0 ? vip.reduce((sum, s) => sum + Number(s.totalSpent), 0) / vip.length : 0,
            revenuePercent: totalRevenue > 0 ? (vip.reduce((sum, s) => sum + Number(s.totalSpent), 0) / totalRevenue) * 100 : 0,
            retention: 95,
          },
          {
            segment: "Regular Customers",
            count: regular.length,
            avgValue: regular.length > 0 ? regular.reduce((sum, s) => sum + Number(s.totalSpent), 0) / regular.length : 0,
            revenuePercent: totalRevenue > 0 ? (regular.reduce((sum, s) => sum + Number(s.totalSpent), 0) / totalRevenue) * 100 : 0,
            retention: 70,
          },
          {
            segment: "Occasional Buyers",
            count: occasional.length,
            avgValue: occasional.length > 0 ? occasional.reduce((sum, s) => sum + Number(s.totalSpent), 0) / occasional.length : 0,
            revenuePercent: totalRevenue > 0 ? (occasional.reduce((sum, s) => sum + Number(s.totalSpent), 0) / totalRevenue) * 100 : 0,
            retention: 30,
          },
          {
            segment: "Inactive",
            count: inactive.length,
            avgValue: 0,
            revenuePercent: 0,
            retention: 0,
          },
        ],
        reportTitle: "Customer Segments Report",
        reportType: "customers",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate segments report");
    }
  }

  async generateGeographic(): Promise<ServiceResult<any>> {
    try {
      return success({
        summary: {
          totalRegions: 1,
          totalCustomers: 0,
          totalRevenue: 0,
        },
        regions: [
          {
            region: "Not Available",
            customers: 0,
            orders: 0,
            revenue: 0,
            topCity: "N/A",
          },
        ],
        reportTitle: "Geographic Distribution Report",
        reportType: "customers",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate geographic report");
    }
  }
}

export const customersReportsService = new CustomersReportsService();
