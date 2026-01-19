"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/stores/cart.store";
import { ShippingForm } from "@/components/storefront/organisms/shipping-form";
import { ShippingMethodSelector } from "@/components/storefront/organisms/shipping-method-selector";
import { PaymentForm } from "@/components/storefront/organisms/payment-form";
import { OrderReview } from "@/components/storefront/organisms/order-review";
import { CheckoutStepper } from "@/components/storefront/organisms/checkout-stepper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBuyNow = (searchParams.get("mode") || "") === "buy-now";
  const cart = useCartStore((state) => state.cart);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const applyDiscount = useCartStore((state) => state.applyDiscount);
  const removeDiscount = useCartStore((state) => state.removeDiscount);
  const cartError = useCartStore((state) => state.error);
  const [shippingAddress, setShippingAddress] = useState<any>(null);
  const [shippingMethod, setShippingMethod] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);

  const steps = [
    { id: "shipping", label: "Shipping", number: 1 },
    { id: "shipping-method", label: "Delivery", number: 2 },
    { id: "payment", label: "Payment", number: 3 },
    { id: "review", label: "Review", number: 4 },
  ];
  const [currentStep, setCurrentStep] = useState<string>("shipping");

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Prefill saved shipping address if logged in (also prefill email from profile)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [addrRes, profileRes] = await Promise.all([
          fetch("/api/storefront/account/shipping-address", { cache: "no-store" }),
          fetch("/api/storefront/account/profile", { cache: "no-store" }),
        ]);

        const addrJson = addrRes.ok ? await addrRes.json() : null;
        const profileJson = profileRes.ok ? await profileRes.json() : null;
        const email: string | undefined = profileJson?.data?.email || addrJson?.data?.email;

        if (!cancelled) {
          if (addrJson?.success && addrJson.data) {
            setShippingAddress({ ...addrJson.data, ...(email ? { email } : {}) });
          } else if (email) {
            // No saved address but we can still prefill email
            setShippingAddress({ email } as any);
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (cart && cart.items.length === 0) {
      router.push("/cart");
    }
  }, [cart, router]);

  const handlePlaceOrder = async () => {
    const addressReady = Boolean(
      shippingAddress?.firstName &&
        shippingAddress?.lastName &&
        shippingAddress?.addressLine1 &&
        shippingAddress?.city &&
        shippingAddress?.state &&
        shippingAddress?.postalCode &&
        shippingAddress?.country &&
        shippingAddress?.phone &&
        shippingAddress?.email,
    );
    const shippingReady = Boolean(shippingMethod?.id);
    const paymentReady = Boolean(paymentMethod?.type);

    if (!addressReady) {
      toast.error("Please enter your shipping address");
      return;
    }
    if (!shippingReady) {
      toast.error("Please select a shipping method");
      return;
    }
    if (!paymentReady) {
      toast.error("Please choose a payment method");
      return;
    }

    setIsPlacingOrder(true);
    try {
      const method = shippingMethod
        ? {
            id: String(shippingMethod.id),
            name: String(shippingMethod.name),
            price: Number(shippingMethod.price) || 0,
            description: shippingMethod.description ?? undefined,
            estimatedDays:
              shippingMethod.estimatedDays !== undefined && shippingMethod.estimatedDays !== null
                ? Number(shippingMethod.estimatedDays)
                : undefined,
            carrier: shippingMethod.carrier ?? undefined,
          }
        : null;

      const res = await fetch("/api/storefront/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress,
          shippingMethod: method,
          paymentMethod,
          customerEmail: shippingAddress?.email,
          customerPhone: shippingAddress?.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const serverMsg = data?.error?.message || "Failed to place order";
        const details = Array.isArray(data?.error?.details)
          ? data.error.details.map((d: any) => d?.message).filter(Boolean).join("; ")
          : undefined;
        throw new Error(details ? `${serverMsg}: ${details}` : serverMsg);
      }

      // If this was a Buy Now flow, restore the previous cart cookie before redirect
      if (isBuyNow) {
        try {
          await fetch("/api/storefront/buy-now/restore", { method: "POST" });
          await fetchCart();
        } catch {}
      }
      const orderId = data.data?.id || data.data?.orderNumber;
      toast.success("Order placed successfully");
      router.push(`/order/${orderId}`);
    } catch (error) {
      console.error("Failed to place order:", error);
      toast.error(error instanceof Error ? error.message : "Failed to place order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (!cart) {
    return (
      <div className="container py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const addressReady = Boolean(
    shippingAddress?.firstName &&
      shippingAddress?.lastName &&
      shippingAddress?.addressLine1 &&
      shippingAddress?.city &&
      shippingAddress?.state &&
      shippingAddress?.postalCode &&
      shippingAddress?.country &&
      shippingAddress?.phone &&
      shippingAddress?.email,
  );
  const shippingReady = Boolean(shippingMethod?.id);
  const paymentReady = Boolean(paymentMethod?.type);
  const canPlaceOrder = addressReady && shippingReady && paymentReady && !isPlacingOrder;

  const selectedShipping = Number(shippingMethod?.price ?? 0);
  const computedTotal = cart.subtotal + cart.taxAmount + selectedShipping - cart.discountAmount;

  return (
    <div className="container py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/cart"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          onClick={async (e) => {
            if (!isBuyNow) return;
            e.preventDefault();
            try {
              await fetch("/api/storefront/buy-now/restore", { method: "POST" });
              await fetchCart();
            } catch {}
            router.push("/cart");
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cart
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Checkout</h1>
          {isBuyNow && <Badge variant="secondary">Buy Now</Badge>}
        </div>

        <div className="mt-6 overflow-x-auto no-scrollbar">
          <div className="min-w-[520px]">
            <CheckoutStepper steps={steps} currentStep={currentStep} />
          </div>
        </div>
      </div>

      {/* Checkout Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mt-8">
        <div className="lg:col-span-2">
          {currentStep === "shipping" && (
            <ShippingForm
              initialData={shippingAddress}
              onSubmit={(data) => {
                setShippingAddress(data);
                (async () => {
                  try {
                    await fetch("/api/storefront/account/shipping-address", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(data),
                    });
                  } catch {}
                })();
                setCurrentStep("shipping-method");
              }}
            />
          )}

          {currentStep === "shipping-method" && (
            <ShippingMethodSelector
              selectedMethod={shippingMethod}
              onSelect={(method) => {
                setShippingMethod(method);
              }}
              onBack={() => setCurrentStep("shipping")}
              onContinue={() => setCurrentStep("payment")}
            />
          )}

          {currentStep === "payment" && (
            <PaymentForm
              onSubmit={(data) => {
                setPaymentMethod(data);
              }}
              onBack={() => setCurrentStep("shipping-method")}
              onContinue={() => setCurrentStep("review")}
            />
          )}

          {currentStep === "review" && (
            <OrderReview
              cart={cart}
              shippingAddress={shippingAddress}
              shippingMethod={shippingMethod}
              paymentMethod={paymentMethod}
              onBack={() => setCurrentStep("payment")}
              onPlaceOrder={handlePlaceOrder}
              isPlacingOrder={isPlacingOrder}
            />
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <div className="border rounded-lg p-5 sm:p-6 lg:sticky lg:top-4">
            <h2 className="font-semibold mb-4">Order Summary</h2>

            <div className="mb-5">
              <Label htmlFor="checkout-discount" className="mb-2 block text-sm">
                Discount code
              </Label>
              <div className="flex gap-2">
                <Input
                  id="checkout-discount"
                  placeholder="Enter code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={promoLoading || (cart.appliedDiscounts?.length || 0) > 0}
                />
                {(cart.appliedDiscounts?.length || 0) > 0 ? (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setPromoLoading(true);
                      try {
                        await removeDiscount();
                        toast.success("Discount removed");
                      } catch {}
                      setPromoLoading(false);
                    }}
                    disabled={promoLoading}
                  >
                    {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!promoCode.trim()) return;
                      setPromoLoading(true);
                      try {
                        await applyDiscount(promoCode);
                        setPromoCode("");
                        toast.success("Discount applied");
                      } catch {}
                      setPromoLoading(false);
                    }}
                    disabled={!promoCode.trim() || promoLoading}
                  >
                    {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </Button>
                )}
              </div>
              {cartError && <p className="mt-2 text-xs text-destructive">{cartError}</p>}
              {cart.appliedDiscounts?.length ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Applied: <span className="font-medium">{cart.appliedDiscounts[0].code}</span>
                </p>
              ) : null}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Items ({cart.itemCount})
                </span>
                <span>${cart.subtotal.toFixed(2)}</span>
              </div>
              {cart.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-${cart.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {shippingMethod ? (
                    selectedShipping === 0 ? "FREE" : `$${selectedShipping.toFixed(2)}`
                  ) : (
                    <span className="text-xs">Calculated next</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>${cart.taxAmount.toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Total</span>
                <span>${computedTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6">
              <Button className="w-full" onClick={() => void handlePlaceOrder()} disabled={!canPlaceOrder}>
                {isPlacingOrder ? "Placing..." : "Place Order"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
