import { systemLogsRepository, type ListSystemLogsParams } from "../repositories/system-logs.repository";
import { failure, success, type ServiceResult } from "../types";

const RETENTION_DAYS = 90;

class SystemLogsService {
  private lastPurgeAt: number | null = null;

  private async maybePurgeRetention() {
    const now = Date.now();
    if (this.lastPurgeAt && now - this.lastPurgeAt < 10 * 60_000) return;
    this.lastPurgeAt = now;
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await systemLogsRepository.purgeOlderThan(cutoff);
  }

  async list(params: ListSystemLogsParams): Promise<ServiceResult<{ items: any[]; total: number }>> {
    try {
      await this.maybePurgeRetention();
      const res = await systemLogsRepository.list(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_SYSTEM_LOGS_FAILED", e?.message || "Failed to list system logs");
    }
  }

  async getById(id: string): Promise<ServiceResult<any>> {
    try {
      const row = await systemLogsRepository.findById(id);
      if (!row) return failure("NOT_FOUND", "Log not found");
      return success(row);
    } catch (e: any) {
      return failure("GET_SYSTEM_LOG_FAILED", e?.message || "Failed to get system log");
    }
  }

  async create(input: Parameters<typeof systemLogsRepository.create>[0]): Promise<ServiceResult<any>> {
    try {
      await this.maybePurgeRetention();
      const row = await systemLogsRepository.create(input);
      return success(row);
    } catch (e: any) {
      return failure("WRITE_SYSTEM_LOG_FAILED", e?.message || "Failed to write system log");
    }
  }

  async purgeRetention(): Promise<ServiceResult<{ deleted: number }>> {
    try {
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const deleted = await systemLogsRepository.purgeOlderThan(cutoff);
      return success({ deleted });
    } catch (e: any) {
      return failure("PURGE_SYSTEM_LOGS_FAILED", e?.message || "Failed to purge system logs");
    }
  }
}

export const systemLogsService = new SystemLogsService();
