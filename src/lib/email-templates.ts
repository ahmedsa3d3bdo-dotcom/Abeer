import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { eq, and } from "drizzle-orm";

function interpolate(tpl: string, vars: Record<string, any>) {
  return tpl.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}

export async function renderTemplate(
  slug: string,
  variables: Record<string, any>,
  fallbackSubject: string,
  fallbackBody: string
): Promise<{ subject: string; body: string }> {
  try {
    const [tpl] = await db
      .select()
      .from(schema.emailTemplates)
      .where(and(eq(schema.emailTemplates.slug, slug), eq(schema.emailTemplates.isActive, true)))
      .limit(1);
    if (!tpl) return { subject: fallbackSubject, body: fallbackBody };
    return {
      subject: interpolate(tpl.subject, variables),
      body: interpolate(tpl.body, variables),
    };
  } catch {
    return { subject: fallbackSubject, body: fallbackBody };
  }
}
