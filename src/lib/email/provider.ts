export type EmailPayload = {
  to: string;
  from: string;
  subject: string;
  body: string; // HTML or text
};

export interface EmailProvider {
  sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }>; 
}

class ConsoleProvider implements EmailProvider {
  async sendEmail(payload: EmailPayload) {
    console.log("[ConsoleEmail]", payload.subject, "→", payload.to);
    return { ok: true };
  }
}

class SendgridProvider implements EmailProvider {
  constructor(private apiKey: string) {}
  async sendEmail(payload: EmailPayload) {
    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: payload.to }] }],
          from: { email: payload.from },
          subject: payload.subject,
          content: [{ type: "text/html", value: payload.body }],
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        return { ok: false, error: `SendGrid error ${res.status}: ${txt}` };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "SendGrid request failed" };
    }
  }
}

export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase() || "console";
  if (provider === "sendgrid" && process.env.SENDGRID_API_KEY) {
    return new SendgridProvider(process.env.SENDGRID_API_KEY);
  }
  return new ConsoleProvider();
}
