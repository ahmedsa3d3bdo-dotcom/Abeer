import { redirect } from "next/navigation";
import { storefrontCategoriesService } from "@/server/storefront/services/categories.service";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { category: categorySlug } = await params;
  const sp = await searchParams;

  const category = await storefrontCategoriesService.getBySlug(categorySlug);
  if (!category?.id) {
    redirect("/shop");
  }

  const qs = new URLSearchParams();
  qs.set("categorySlug", category.slug);

  for (const [k, v] of Object.entries(sp || {})) {
    if (v === undefined) continue;
    if (k === "categoryId") continue;
    if (k === "categorySlug") continue;
    if (Array.isArray(v)) {
      for (const vv of v) {
        if (vv !== undefined) qs.append(k, String(vv));
      }
    } else {
      qs.set(k, String(v));
    }
  }

  redirect(`/shop?${qs.toString()}`);
}
