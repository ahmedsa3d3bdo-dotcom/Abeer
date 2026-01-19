type Opts = {
  baseUrl: string;
  email: string;
  password: string;
  attempts: number;
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
  const email = String(arg("email") || process.env.TEST_EMAIL || "lockout.test@example.com");
  const password = String(arg("password") || process.env.TEST_PASSWORD || "wrong-password");
  const attempts = Math.max(1, Math.trunc(num(arg("attempts"), 25)));
  const delayMs = Math.max(0, Math.trunc(num(arg("delay"), 150)));
  return { baseUrl, email, password, attempts, delayMs };
}

async function main() {
  const o = opts();
  const url = `${o.baseUrl}/api/v1/auth/login`;
  const origin = toOrigin(o.baseUrl);

  for (let i = 1; i <= o.attempts; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ email: o.email, password: o.password }),
    });

    const retryAfter = res.headers.get("retry-after");
    const body = await res.text().catch(() => "");

    process.stdout.write(
      `[${i}/${o.attempts}] status=${res.status}${retryAfter ? ` retry-after=${retryAfter}` : ""}${body ? ` body=${body.slice(0, 180)}` : ""}\n`,
    );

    if (o.delayMs) await sleep(o.delayMs);
  }
}

main().catch((e) => {
  process.stderr.write(String(e?.stack || e?.message || e) + "\n");
  process.exit(1);
});

export {};
