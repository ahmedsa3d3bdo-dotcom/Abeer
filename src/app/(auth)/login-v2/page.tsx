"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Apple } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function LoginV2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [enabled, setEnabled] = useState<{ google: boolean; apple: boolean }>({ google: false, apple: false });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/providers", { cache: "no-store" });
        const data = await res.json();
        setEnabled({ google: !!data?.google, apple: !!data?.apple });
      } catch {
        setEnabled({ google: false, apple: false });
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid credentials", {
          description: "Please check your email and password",
        });
      } else {
        const callbackUrl = searchParams.get("callbackUrl") || "/";
        toast.success("Signed in", { description: "Redirecting..." });
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error) {
      toast.error("Something went wrong", {
        description: "Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <div>
            <Link href="/" className="flex items-center gap-3 text-2xl font-bold">
              <img src="/Storefront/images/Complete-Logo.png" alt={siteConfig.name} className="h-16 w-auto" />
              <span>{siteConfig.name}</span>
            </Link>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight">
              Welcome back
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">Sign in to continue shopping, track orders, and manage your account.</p>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-primary transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center lg:hidden">
            <Link href="/" className="inline-flex items-center">
              <img src="/Storefront/images/Complete-Logo.png" alt={siteConfig.name} className="h-16 w-auto" />
            </Link>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Sign in</h2>
            <p className="text-muted-foreground">Enter your credentials to access your account</p>
          </div>

          {/* Social sign-in */}
          <div className="space-y-3">
            {enabled.google && (
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => signIn("google", { callbackUrl: searchParams.get("callbackUrl") || "/" })}
            >
              <img src="/Storefront/images/google.svg" alt="Google" className="h-5 w-5 mr-2" />
              Continue with Google
            </Button>
            )}
            {enabled.apple && (
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => signIn("apple", { callbackUrl: searchParams.get("callbackUrl") || "/" })}
            >
              <Apple className="h-5 w-5 mr-2" /> Continue with Apple
            </Button>
            )}
            {!enabled.google && !enabled.apple && (
              <p className="text-xs text-muted-foreground text-center">Social login is not configured. Please sign in with email.</p>
            )}
            <p className="text-xs text-muted-foreground text-center">By continuing, you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>
          </div>

          <div className="relative py-1 text-center">
            <span className="bg-background px-3 text-xs text-muted-foreground relative z-10">or continue with email</span>
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={isLoading}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link href="/register-v2" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
