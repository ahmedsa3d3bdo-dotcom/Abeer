import { redirect } from "next/navigation";

export default function AnalyticsPage() {
    // Redirect to Sales analytics by default
    redirect("/dashboard/analytics/sales");
}
