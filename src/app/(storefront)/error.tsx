"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="container flex flex-col items-center justify-center min-h-[70vh] py-16">
      <div className="text-center max-w-2xl">
        {/* Error Icon */}
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-destructive/10 rounded-full">
            <AlertTriangle className="h-16 w-16 text-destructive" />
          </div>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold mb-4">Something Went Wrong</h1>
        <p className="text-muted-foreground text-lg mb-8">
          We encountered an unexpected error. Don't worry, our team has been notified and we're working to fix it.
        </p>

        {/* Error Details (Development only) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mb-8 p-4 bg-muted rounded-lg text-left">
            <p className="text-sm font-mono text-destructive break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={reset} className="gap-2">
            <RefreshCw className="h-5 w-5" />
            Try Again
          </Button>
          <Link href="/">
            <Button size="lg" variant="outline" className="gap-2">
              <Home className="h-5 w-5" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Help Text */}
        <p className="mt-8 text-sm text-muted-foreground">
          If the problem persists, please{" "}
          <Link href="/contact" className="underline hover:text-foreground">
            contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
