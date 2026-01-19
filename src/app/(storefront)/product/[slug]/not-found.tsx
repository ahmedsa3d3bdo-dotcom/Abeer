import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function ProductNotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[60vh] py-16">
      <AlertCircle className="h-16 w-16 text-muted-foreground mb-6" />
      <h1 className="text-3xl font-bold mb-2">Product Not Found</h1>
      <p className="text-muted-foreground text-center mb-8 max-w-md">
        The product you're looking for doesn't exist or has been removed.
      </p>
      <div className="flex gap-4">
        <Link href="/shop">
          <Button size="lg">Browse All Products</Button>
        </Link>
        <Link href="/">
          <Button variant="outline" size="lg">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
