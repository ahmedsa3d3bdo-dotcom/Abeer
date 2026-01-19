"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { siteConfig } from "@/config/site";

export default function RegisterV2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [publicSettings, setPublicSettings] = useState<Record<string, string> | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [passwordStrength, setPasswordStrength] = useState({
    hasLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
  });

  const siteName = publicSettings?.site_name || siteConfig.name || "";

  useEffect(() => {
    let alive = true;
    fetch("/api/storefront/settings/public", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        const items = json?.data?.items;
        if (!alive || !Array.isArray(items)) return;
        const map: Record<string, string> = {};
        for (const it of items) {
          if (it?.key && typeof it?.value === "string") map[String(it.key)] = it.value;
        }
        setPublicSettings(map);
      })
      .catch(() => {
        if (!alive) return;
        setPublicSettings(null);
      });

    return () => {
      alive = false;
    };
  }, []);

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password });
    setPasswordStrength({
      hasLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match", {
        description: "Please make sure both passwords are the same",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error("Registration failed", {
          description: result.error?.message || "Please try again",
        });
        return;
      }

      toast.success("Account created successfully!", {
        description: "You can now sign in",
      });

      const callbackUrl = searchParams.get("callbackUrl") || "/";
      setTimeout(() => {
        router.push(`/login-v2?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }, 800);
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
            <h1 className="text-4xl font-bold leading-tight">{siteName ? `Join ${siteName}` : "Create your account"}</h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Create your account to shop faster, track orders, and manage your preferences.
            </p>
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

      {/* Right Side - Register Form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center lg:hidden">
            <Link href="/" className="inline-flex items-center">
              <img src="/Storefront/images/Complete-Logo.png" alt={siteConfig.name} className="h-16 w-auto" />
            </Link>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Create an account</h2>
            <p className="text-muted-foreground">Enter your details to get started</p>
          </div>

          {/* Social sign-in */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => signIn("google", { callbackUrl: searchParams.get("callbackUrl") || "/" })}
            >
              <img src="/Storefront/images/google.svg" alt="Google" className="h-5 w-5 mr-2" />
              Continue with Google
            </Button>
            <p className="text-xs text-muted-foreground text-center">By continuing, you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>
          </div>

          <div className="relative py-1 text-center">
            <span className="bg-background px-3 text-xs text-muted-foreground relative z-10">or continue with email</span>
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>
            </div>

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
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
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

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-center gap-1 ${passwordStrength.hasLength ? "text-green-600" : "text-muted-foreground"}`}>
                      <CheckCircle2 className="h-3 w-3" />
                      <span>8+ characters</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.hasUppercase ? "text-green-600" : "text-muted-foreground"}`}>
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Uppercase</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.hasLowercase ? "text-green-600" : "text-muted-foreground"}`}>
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Lowercase</span>
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.hasNumber ? "text-green-600" : "text-muted-foreground"}`}>
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Number</span>
                    </div>
                    <div
                      className={`flex items-center gap-1 col-span-2 ${passwordStrength.hasSpecial ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Special character</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login-v2" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
