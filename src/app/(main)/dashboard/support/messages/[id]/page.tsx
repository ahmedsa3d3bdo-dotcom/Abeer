import { notFound } from "next/navigation";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { eq, sql } from "drizzle-orm";
import { MessageDetailClient } from "./_client/message-detail-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata = { title: "Message Detail" };

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Guard: only proceed for UUID-like IDs to avoid matching non-id routes
  const uuidLike = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidLike.test(id)) return notFound();
  const [msg] = await db
    .select({
      id: schema.contactMessages.id,
      name: schema.contactMessages.name,
      email: schema.contactMessages.email,
      subject: schema.contactMessages.subject,
      message: schema.contactMessages.message,
      status: schema.contactMessages.status,
      priority: schema.contactMessages.priority,
      assigneeUserId: schema.contactMessages.assigneeUserId,
      createdAt: schema.contactMessages.createdAt,
      respondedAt: schema.contactMessages.respondedAt,
    })
    .from(schema.contactMessages)
    .where(eq(schema.contactMessages.id, id))
    .limit(1);

  if (!msg) return notFound();

  const staffRows = await db
    .select({ id: schema.users.id, firstName: schema.users.firstName, lastName: schema.users.lastName, email: schema.users.email, role: schema.roles.slug })
    .from(schema.users)
    .innerJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
    .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
    .where(sql`${schema.roles.slug} IN ${["admin", "super_admin"]}`)
    .limit(200);
  const seen = new Set<string>();
  const staff = staffRows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  const userOptions = staff.map((u) => ({ id: u.id, label: `${[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email} <${u.email}>` }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Message</h1>
        <p className="text-sm text-muted-foreground">From {msg.name ? `${msg.name} <${msg.email}>` : msg.email}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subject</CardTitle>
              <CardDescription className="sr-only">Message subject</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="font-medium">{msg.subject || "(no subject)"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Message</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm">{msg.message}</pre>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <MessageDetailClient
            id={msg.id}
            email={msg.email}
            name={msg.name}
            subject={msg.subject || ""}
            message={msg.message}
            users={userOptions}
            initialAssigneeUserId={msg.assigneeUserId}
            initialStatus={String(msg.status)}
            initialPriority={String(msg.priority)}
          />
        </div>
      </div>
    </div>
  );
}
