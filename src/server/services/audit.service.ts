import { auditRepository } from "../repositories/audit.repository";
import { success, failure, type ServiceResult } from "../types";

export interface ListAuditParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  resource?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  sort?: "createdAt.desc" | "createdAt.asc";
}

class AuditService {
  async list(params: ListAuditParams): Promise<ServiceResult<{ items: any[]; total: number }>> {
    try {
      const res = await auditRepository.list(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_AUDIT_FAILED", e?.message || "Failed to list audit logs");
    }
  }
}

export const auditService = new AuditService();
