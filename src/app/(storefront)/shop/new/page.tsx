import { redirect } from "next/navigation";

export default function NewArrivalsRedirectPage() {
  // Keep as server component redirect
  redirect("/shop?sortBy=newest");
}
