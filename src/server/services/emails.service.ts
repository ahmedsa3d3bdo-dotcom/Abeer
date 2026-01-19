import { emailsRepository } from "../repositories/notifications.repository";
import { success, failure } from "../types";
import { sendMail } from "../utils/mailer";
import { writeAudit } from "../utils/audit";
import type { ActorContext } from "./role.service";

class EmailsService {
  async listTemplates(params: { page?: number; limit?: number; search?: string; isActive?: boolean }) {
    try {
      const res = await emailsRepository.listTemplates(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_EMAIL_TEMPLATES_FAILED", e?.message || "Failed to list email templates");
    }
  }

  async getTemplate(id: string) {
    try {
      const row = await emailsRepository.getTemplate(id);
      if (!row) return failure("NOT_FOUND", "Template not found");
      return success(row);
    } catch (e: any) {
      return failure("GET_EMAIL_TEMPLATE_FAILED", e?.message || "Failed to get template");
    }
  }

  async createTemplate(input: { name: string; slug: string; subject: string; body: string; variables?: Record<string, string>; isActive?: boolean }, actor?: ActorContext) {
    try {
      const row = await emailsRepository.createTemplate(input);
      await writeAudit({ action: "create", resource: "email.template", resourceId: row.id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, changes: input as any });
      return success(row);
    } catch (e: any) {
      return failure("CREATE_EMAIL_TEMPLATE_FAILED", e?.message || "Failed to create template");
    }
  }

  async updateTemplate(id: string, patch: Partial<{ name: string; slug: string; subject: string; body: string; variables: Record<string, string>; isActive: boolean }>, actor?: ActorContext) {
    try {
      const row = await emailsRepository.updateTemplate(id, patch);
      if (!row) return failure("NOT_FOUND", "Template not found");
      await writeAudit({ action: "update", resource: "email.template", resourceId: id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, changes: patch as any });
      return success(row);
    } catch (e: any) {
      return failure("UPDATE_EMAIL_TEMPLATE_FAILED", e?.message || "Failed to update template");
    }
  }

  async deleteTemplate(id: string, actor?: ActorContext) {
    try {
      const ok = await emailsRepository.deleteTemplate(id);
      if (!ok) return failure("NOT_FOUND", "Template not found");
      await writeAudit({ action: "delete", resource: "email.template", resourceId: id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined });
      return success({ id });
    } catch (e: any) {
      return failure("DELETE_EMAIL_TEMPLATE_FAILED", e?.message || "Failed to delete template");
    }
  }

  async listLogs(params: { page?: number; limit?: number; to?: string; status?: string; search?: string }) {
    try {
      const res = await emailsRepository.listLogs(params);
      return success(res);
    } catch (e: any) {
      return failure("LIST_EMAIL_LOGS_FAILED", e?.message || "Failed to list email logs");
    }
  }

  async send(input: { to: string; subject: string; html?: string; text?: string; fromOverride?: string; userId?: string | null; templateId?: string | null; metadata?: any }, actor?: ActorContext) {
    try {
      const pending = await emailsRepository.logEmail({ userId: input.userId ?? null, templateId: input.templateId ?? null, to: input.to, from: input.fromOverride || process.env.EMAIL_FROM || "", subject: input.subject, body: input.html || input.text || "", status: "pending", metadata: input.metadata ?? null });
      try {
        const info = await sendMail({ to: input.to, subject: input.subject, html: input.html, text: input.text, fromOverride: input.fromOverride });
        await emailsRepository.updateLog(pending.id, { status: "sent", sentAt: new Date(), metadata: { ...(pending as any).metadata, transport: info } });
        await writeAudit({ action: "create", resource: "email.send", resourceId: pending.id, userId: actor?.userId, ipAddress: actor?.ip ?? undefined, userAgent: actor?.userAgent ?? undefined, metadata: { to: input.to, subject: input.subject } });
        return success({ id: pending.id, info });
      } catch (err: any) {
        await emailsRepository.updateLog(pending.id, { status: "failed", error: err?.message || String(err) });
        return failure("EMAIL_SEND_FAILED", err?.message || "Failed to send email");
      }
    } catch (e: any) {
      return failure("EMAIL_SEND_FAILED", e?.message || "Failed to send email");
    }
  }
}

export const emailsService = new EmailsService();
