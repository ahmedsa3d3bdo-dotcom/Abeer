import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Search, ShoppingBag } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[70vh] py-16">
      <div className="text-center max-w-2xl">
        {/* 404 Text */}
        <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
        
        {/* Message */}
        <h2 className="text-3xl font-bold mb-4">Page Not Found</h2>
        <p className="text-muted-foreground text-lg mb-8">
          Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button size="lg" className="gap-2">
              <Home className="h-5 w-5" />
              Back to Home
            </Button>
          </Link>
          <Link href="/shop">
            <Button size="lg" variant="outline" className="gap-2">
              <ShoppingBag className="h-5 w-5" />
              Browse Products
            </Button>
          </Link>
          <Link href="/search">
            <Button size="lg" variant="outline" className="gap-2">
              <Search className="h-5 w-5" />
              Search
            </Button>
          </Link>
        </div>

        {/* Popular Links */}
        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground mb-4">
            Popular pages you might be looking for:
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/shop">
              <Button variant="link" size="sm">Shop All</Button>
            </Link>
            <Link href="/account/orders">
              <Button variant="link" size="sm">My Orders</Button>
            </Link>
            <Link href="/wishlist">
              <Button variant="link" size="sm">Wishlist</Button>
            </Link>
            <Link href="/account">
              <Button variant="link" size="sm">My Account</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
