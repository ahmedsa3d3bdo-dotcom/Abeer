type Opts = {
  baseUrl: string;
  count: number;
  delayMs: number;
  slug: string;
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

function opts(): Opts {
  const pos = positionalArgs();
  const baseFromFlag = arg("base") || process.env.BASE_URL;
  const baseFromPos = pos[0] && isHttpUrlLike(pos[0]) ? pos[0] : null;
  const baseUrl = String(baseFromPos || baseFromFlag || "http://localhost:3000").replace(/\/$/, "");

  const slugFromFlag = arg("slug") || process.env.TEST_PRODUCT_SLUG;
  const slugFromPos = baseFromPos ? pos[1] : pos[0];
  const slug = String(slugFromFlag || slugFromPos || "__invalid_slug__");

  const countFromPosRaw = baseFromPos ? pos[2] : pos[1];
  const delayFromPosRaw = baseFromPos ? pos[3] : pos[2];
  const count = Math.max(1, Math.trunc(num(arg("count") || countFromPosRaw || null, 20)));
  const delayMs = Math.max(0, Math.trunc(num(arg("delay") || delayFromPosRaw || null, 100)));
  return { baseUrl, slug, count, delayMs };
}

async function main() {
  const o = opts();
  const origin = toOrigin(o.baseUrl);
  const resolvedSlug = o.slug === "AUTO" ? await resolveAutoSlug(o.baseUrl, origin) : o.slug;
  const url = `${o.baseUrl}/api/storefront/products/${encodeURIComponent(resolvedSlug)}/reviews`;

  let created = 0;
  let firstCreatedId: string | null = null;
  let blocked = 0;
  let notFound = 0;

  for (let i = 1; i <= o.count; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ rating: 5, title: "Test", comment: "test" }),
    });

    const status = res.status;
    let bodyText = "";
    let createdId: string | null = null;
    if (status === 201) {
      const json = await res.json().catch(() => null);
      createdId = typeof (json as any)?.data?.id === "string" ? (json as any).data.id : null;
      created += 1;
      if (!firstCreatedId && createdId) firstCreatedId = createdId;
      bodyText = JSON.stringify(json);
    } else {
      bodyText = await res.text().catch(() => "");
    }
    if (status === 429 || status === 403) blocked += 1;
    if (status === 404) notFound += 1;

    const retryAfter = res.headers.get("retry-after");

    process.stdout.write(
      `[${i}/${o.count}] status=${status}${createdId ? ` reviewId=${createdId}` : ""}${retryAfter ? ` retry-after=${retryAfter}` : ""}${bodyText ? ` body=${bodyText.slice(0, 160)}` : ""}\n`,
    );

    if (o.delayMs) await sleep(o.delayMs);
  }

  process.stdout.write(
    `Done. created=${created} blocked=${blocked} not_found=${notFound}${firstCreatedId ? ` firstReviewId=${firstCreatedId}` : ""}\n`,
  );
}

main().catch((e) => {
  process.stderr.write(String(e?.stack || e?.message || e) + "\n");
  process.exit(1);
});

export {};
