"use client";

import { useState } from "react";
import { Mail, CheckCircle, Sparkles } from "lucide-react";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hp, setHp] = useState(""); // honeypot

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOk(null);
    setErr(null);
    if (!isValidEmail(email)) {
      setErr("Please enter a valid email address.");
      return;
    }
    if (hp) return; // bot
    try {
      setLoading(true);
      const res = await fetch("/api/storefront/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || "Subscription failed");
      setOk("Thanks for subscribing! You'll hear from us soon.");
      setEmail("");
      setName("");
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    "Weekly highlights & curated picks",
    "Member-only exclusive discounts",
    "Early access to new arrivals",
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/50 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 p-6 sm:p-8 lg:p-12">
          {/* Left: Content */}
          <div className="flex flex-col justify-center gap-4 sm:gap-6">
            <div className="inline-flex items-center gap-2 w-fit px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Stay in the loop
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Subscribe to our Newsletter
            </h2>

            <p className="text-muted-foreground text-sm sm:text-base max-w-md">
              Get early access to drops, exclusive offers, and style guides. No spam, unsubscribe anytime.
            </p>

            {/* Benefits List */}
            <ul className="space-y-2 sm:space-y-3">
              {benefits.map((benefit, i) => (
                <li key={i} className="flex items-center gap-3 text-sm sm:text-base text-muted-foreground">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Form */}
          <div className="flex flex-col justify-center">
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Form Fields */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm px-4 py-3.5 text-sm sm:text-base outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                  autoComplete="name"
                />
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm pl-11 pr-4 py-3.5 text-sm sm:text-base outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                    autoComplete="email"
                  />
                </div>
                {/* Honeypot */}
                <input
                  type="text"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  className="hidden"
                  tabIndex={-1}
                  aria-hidden
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 sm:px-8 py-3.5 font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:opacity-95 disabled:opacity-60 transition-all duration-300"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  "Subscribe Now"
                )}
              </button>

              {/* Status Messages */}
              {ok && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  {ok}
                </div>
              )}
              {err && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {err}
                </div>
              )}

              {/* Privacy Note */}
              <p className="text-xs text-muted-foreground pt-2">
                By subscribing you agree to our Terms and the occasional email. You can unsubscribe at any time.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

