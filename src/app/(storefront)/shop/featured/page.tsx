import { redirect } from "next/navigation";

export default function FeaturedRedirectPage() {
  redirect("/shop?isFeatured=true&sortBy=newest");
}
