type Opts = {
  baseUrl: string;
  count: number;
  delayMs: number;
  id: string;
  slug: string | null;
};

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  return process.argv[i + 1] ?? "";
}

function positionalArgs() {
  return process.argv.slice(2).filter((v) => v && !String(v).startsWith("--"));
}

function isHttpUrlLike(v: string) {
  const s = String(v);
  return s.startsWith("http://") || s.startsWith("https://");
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

async function resolveAutoSlug(baseUrl: string, origin: string) {
  const url = `${baseUrl}/api/storefront/products?limit=1&page=1`;
  const res = await fetch(url, { headers: { origin } });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Failed to fetch product list for AUTO slug. status=${res.status} body=${text.slice(0, 200)}`);
  }
  const json = JSON.parse(text) as any;
  const slug = json?.data?.items?.[0]?.slug;
  if (typeof slug !== "string" || !slug) {
    throw new Error(`AUTO slug: could not find a product slug in response body=${text.slice(0, 200)}`);
  }
  return slug;
}

async function createReview(baseUrl: string, origin: string, slug: string) {
  const url = `${baseUrl}/api/storefront/products/${encodeURIComponent(slug)}/reviews`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ rating: 5, title: "Test", comment: "test" }),
  });
  const text = await res.text().catch(() => "");
  if (res.status !== 201) {
    throw new Error(`AUTO id: failed to create review. status=${res.status} body=${text.slice(0, 200)}`);
  }
  const json = JSON.parse(text) as any;
  const id = json?.data?.id;
  if (typeof id !== "string" || !id) {
    throw new Error(`AUTO id: created review but no id returned. body=${text.slice(0, 200)}`);
  }
  return id;
}

function extractCookie(setCookie: string | null, cookieName: string) {
  if (!setCookie) return null;
  const parts = setCookie.split(/,(?=\s*[^;]+=[^;]+)/g);
  for (const p of parts) {
    const trimmed = p.trim();
    if (trimmed.toLowerCase().startsWith(cookieName.toLowerCase() + "=")) {
      return trimmed.split(";")[0] || null;
    }
  }
  return null;
}

function opts(): Opts {
  const pos = positionalArgs();
  const baseFromFlag = arg("base") || process.env.BASE_URL;
  const baseFromPos = pos[0] && isHttpUrlLike(pos[0]) ? pos[0] : null;
  const baseUrl = String(baseFromPos || baseFromFlag || "http://localhost:3000").replace(/\/$/, "");

  const rest = baseFromPos ? pos.slice(1) : pos;
  const idFromFlag = arg("id") || process.env.TEST_REVIEW_ID;
  const id = String(idFromFlag || rest[0] || "00000000-0000-0000-0000-000000000000");

  const count = Math.max(1, Math.trunc(num(arg("count") || rest[1] || null, 20)));
  const delayMs = Math.max(0, Math.trunc(num(arg("delay") || rest[2] || null, 100)));
  const slug = String(arg("slug") || process.env.TEST_PRODUCT_SLUG || rest[3] || "") || null;
  return { baseUrl, id, count, delayMs, slug };
}

async function main() {
  const o = opts();
  const origin = toOrigin(o.baseUrl);

  const resolvedId =
    o.id === "AUTO"
      ? await createReview(
          o.baseUrl,
          origin,
          o.slug || (await resolveAutoSlug(o.baseUrl, origin))
        )
      : o.id;

  const url = `${o.baseUrl}/api/storefront/reviews/${encodeURIComponent(resolvedId)}/report`;

  const cookieName = "sf_rev_report";
  let cookieHeader: string | null = null;

  let ok = 0;
  let blocked = 0;
  let notFound = 0;

  for (let i = 1; i <= o.count; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        origin,
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
    });

    const status = res.status;
    if (status === 200) ok += 1;
    if (status === 404) notFound += 1;
    if (status === 429 || status === 403) blocked += 1;

    const retryAfter = res.headers.get("retry-after");
    const body = await res.text().catch(() => "");
    const setCookie = res.headers.get("set-cookie");
    const c = extractCookie(setCookie, cookieName);
    if (c) cookieHeader = c;

    process.stdout.write(
      `[${i}/${o.count}] status=${status}${retryAfter ? ` retry-after=${retryAfter}` : ""}${body ? ` body=${body.slice(0, 160)}` : ""}\n`,
    );

    if (o.delayMs) await sleep(o.delayMs);
  }

  process.stdout.write(`Done. ok=${ok} blocked=${blocked} not_found=${notFound}\n`);
}

main().catch((e) => {
  process.stderr.write(String(e?.stack || e?.message || e) + "\n");
  process.exit(1);
});

export {};
