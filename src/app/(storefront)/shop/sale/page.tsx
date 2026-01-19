import { redirect } from "next/navigation";

export default function SaleRedirectPage() {
  redirect("/shop?onSale=true&sortBy=newest");
}
