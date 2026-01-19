type Opts = {
  baseUrl: string;
  origin: string;
};

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  return process.argv[i + 1] ?? "";
}

function opts(): Opts {
  const baseUrl = String(arg("base") || process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
  const origin = String(arg("origin") || "https://evil.example").replace(/\/$/, "");
  return { baseUrl, origin };
}

async function main() {
  const o = opts();
  const url = `${o.baseUrl}/api/storefront/newsletter/subscribe`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: o.origin,
    },
    body: JSON.stringify({ email: `origin.test+${Date.now()}@example.com` }),
  });

  const txt = await res.text().catch(() => "");
  process.stdout.write(`status=${res.status}\n`);
  process.stdout.write(`body=${txt.slice(0, 400)}\n`);
}

main().catch((e) => {
  process.stderr.write(String(e?.stack || e?.message || e) + "\n");
  process.exit(1);
});

export {};
