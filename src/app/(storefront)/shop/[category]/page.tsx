import { permanentRedirect } from "next/navigation";
import { storefrontCategoriesService } from "@/server/storefront/services/categories.service";
import ShopPage from "../page";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { category: categorySlug } = await params;

  const category = await storefrontCategoriesService.getBySlug(categorySlug);
  if (!category?.id) {
    permanentRedirect("/shop");
  }

  await searchParams;
  return <ShopPage />;
}
