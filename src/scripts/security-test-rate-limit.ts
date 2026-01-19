type Opts = {
  baseUrl: string;
  count: number;
  delayMs: number;
};

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  return process.argv[i + 1] ?? "";
}

function positionalBaseUrl() {
  const v = process.argv[2];
  if (!v) return null;
  if (String(v).startsWith("--")) return null;
  return String(v);
}

function num(v: string | null, fallback: number) {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toOrigin(baseUrl: string) {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return baseUrl;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function opts(): Opts {
  const baseUrl = String(positionalBaseUrl() || arg("base") || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const count = Math.max(1, Math.trunc(num(arg("count"), 20)));
  const delayMs = Math.max(0, Math.trunc(num(arg("delay"), 100)));
  return { baseUrl, count, delayMs };
}

async function main() {
  const o = opts();
  const url = `${o.baseUrl}/api/storefront/contact`;
  const origin = toOrigin(o.baseUrl);

  let ok = 0;
  let rateLimited = 0;

  for (let i = 1; i <= o.count; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({
        name: "Security Test",
        email: `security.test+${Date.now()}@example.com`,
        subject: "Rate limit test",
        message: "This is a safe rate limit validation message.",
      }),
    });

    const status = res.status;
    if (status === 429) rateLimited += 1;
    if (status >= 200 && status < 300) ok += 1;

    const retryAfter = res.headers.get("retry-after");
    const body = await res.text().catch(() => "");

    process.stdout.write(
      `[${i}/${o.count}] status=${status}${retryAfter ? ` retry-after=${retryAfter}` : ""}${body ? ` body=${body.slice(0, 120)}` : ""}\n`,
    );

    if (o.delayMs) await sleep(o.delayMs);
  }

  process.stdout.write(`Done. ok=${ok} rate_limited=${rateLimited}\n`);
}

main().catch((e) => {
  process.stderr.write(String(e?.stack || e?.message || e) + "\n");
  process.exit(1);
});

export {};
