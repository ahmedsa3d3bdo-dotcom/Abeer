import { db } from "@/shared/db";
import { sql } from "drizzle-orm";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function pad6(n: number) {
  return String(n).padStart(6, "0");
}

export async function nextDocumentNumber(prefix: string, at: Date = new Date()): Promise<string> {
  const year = at.getFullYear();
  const month = at.getMonth() + 1;

  const result = await db.execute(sql`
    WITH upsert AS (
      INSERT INTO document_sequences (doc_type, year, month, next_seq, created_at, updated_at)
      VALUES (${prefix}, ${year}, ${month}, 2, now(), now())
      ON CONFLICT (doc_type, year, month)
      DO UPDATE SET next_seq = document_sequences.next_seq + 1, updated_at = now()
      RETURNING next_seq
    )
    SELECT (next_seq - 1) AS seq FROM upsert;
  `);

  const seq = Number((result.rows?.[0] as any)?.seq || 1);

  return `${prefix}-${String(year).slice(-2)}-${pad2(month)}-${pad6(seq)}`;
}
