"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, Package, Copy, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { LocalDate, LocalDateTime } from "@/components/common/local-datetime";

export default function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const [orderId, setOrderId] = useState<string>("");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [tracking, setTracking] = useState<any>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState<any>(null);

  useEffect(() => {
    params.then((p) => {
      setOrderId(p.id);
      setOrderNumber(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/storefront/orders/${orderId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.success) return;
        const num = data?.data?.orderNumber;
        if (!cancelled && num) setOrderNumber(String(num));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingTracking(true);
        const res = await fetch(`/api/storefront/orders/${orderId}/tracking`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error?.message || "Failed to load tracking");
        if (!cancelled) {
          setTracking(data.data);
          setTrackingError(null);
        }
      } catch (e: any) {
        if (!cancelled) setTrackingError(e?.message || "Failed to load tracking");
      } finally {
        if (!cancelled) setLoadingTracking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // Poll tracking until delivered
  const isDelivered = useMemo(() => {
    if (!tracking?.shipments?.length) return false;
    return tracking.shipments.every((s: any) => Boolean(s.deliveredAt) || String(s.status).toLowerCase() === "delivered");
  }, [tracking]);

  useEffect(() => {
    if (!orderId) return;
    if (isDelivered) return; // stop polling when delivered
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/storefront/orders/${orderId}/tracking`, { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data?.success) {
          setTracking(data.data);
          setTrackingError(null);
        }
      } catch {}
    }, 10000);
    return () => clearInterval(id);
  }, [orderId, isDelivered]);

  // Fetch last used shipping address for summary (if user is logged in)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/storefront/account/shipping-address", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.success) setShippingAddress(data.data);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const carrierTrackUrl = (carrier?: string, trackingNumber?: string) => {
    if (!carrier || !trackingNumber) return undefined;
    const c = carrier.toLowerCase();
    if (c.includes("ups")) return `https://www.ups.com/track?loc=en_US&tracknum=${encodeURIComponent(trackingNumber)}`;
    if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`;
    if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`;
    if (c.includes("dhl")) return `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(trackingNumber)}`;
    return undefined;
  };

  return (
    <div className="container py-16">
      <div className="max-w-3xl mx-auto">
        {/* Success Message */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-20 w-20 text-green-600" />
          </div>

        <div className="border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Tracking</h2>
          {loadingTracking && (
            <p className="text-sm text-muted-foreground">Loading tracking...</p>
          )}
          {trackingError && (
            <p className="text-sm text-destructive">{trackingError}</p>
          )}
          {!loadingTracking && !trackingError && (!tracking || tracking.shipments?.length === 0) && (
            <div className="space-y-2">
              {tracking?.selectedShippingMethod ? (
                <div className="border rounded-md p-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" /> {tracking.selectedShippingMethod.name || "Shipping"}
                    </span>
                    <span className="text-muted-foreground">Preparing shipment</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {(tracking.selectedShippingMethod.carrier || "").toString()}
                  </div>
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground">Tracking information will appear once your order ships.</p>
            </div>
          )}
          {!loadingTracking && !trackingError && tracking?.shipments?.length > 0 && (
            <div className="space-y-6">
              {tracking.shipments.map((s: any) => (
                <div key={s.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" /> {s.methodName || "Shipment"}
                    </span>
                    <span className="text-muted-foreground">
                      {(s.carrier || "").toString()}
                      {s.trackingNumber ? ` • ${s.trackingNumber}` : ""}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.estimatedDeliveryAt ? (
                      <>
                        Est. delivery: <LocalDate value={s.estimatedDeliveryAt} />
                      </>
                    ) : null}
                  </div>
                  {(s.trackingNumber || s.carrier) && (
                    <div className="flex gap-2 mt-2">
                      {s.trackingNumber && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!s.trackingNumber) return;
                            void navigator.clipboard.writeText(String(s.trackingNumber));
                            toast.success("Tracking number copied");
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" /> Copy tracking
                        </Button>
                      )}
                      {carrierTrackUrl(s.carrier, s.trackingNumber) && (
                        <Button asChild variant="outline" size="sm">
                          <a href={carrierTrackUrl(s.carrier, s.trackingNumber)} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" /> Track on carrier
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="space-y-3">
                    {(s.updates || []).map((u: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                        <div className="flex-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{u.status}</span>
                            <span className="text-xs text-muted-foreground"><LocalDateTime value={u.occurredAt} /></span>
                          </div>
                          {(u.description || u.location) && (
                            <p className="text-sm text-muted-foreground">
                              {u.description}
                              {u.location ? ` — ${u.location}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-lg text-muted-foreground mb-4">
            Thank you for your purchase
          </p>
          <p className="text-sm text-muted-foreground">
            Order #{orderNumber || orderId}
          </p>
        </div>

        {/* Shipping Address */}
        {shippingAddress && (
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
            <div className="text-sm space-y-1">
              <p>{`${shippingAddress.firstName} ${shippingAddress.lastName}`}</p>
              <p>{shippingAddress.addressLine1}</p>
              {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
              <p>{`${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}`}</p>
              <p>{shippingAddress.country}</p>
              <p>{shippingAddress.phone}</p>
            </div>
          </div>
        )}

        {/* Order Details Card */}
        <div className="border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Order Details</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Number:</span>
              <span className="font-medium">{orderId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Order Date:</span>
              <span className="font-medium"><LocalDate value={new Date()} /></span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Estimated Delivery:</span>
              <span className="font-medium">
                <LocalDate value={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)} />
              </span>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Email Confirmation */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm">
               We would contact you soon.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/account/orders" className="flex-1">
            <Button variant="outline" size="lg" className="w-full">
              <Package className="mr-2 h-5 w-5" />
              View Order History
            </Button>
          </Link>
          
          <Link href="/" className="flex-1">
            <Button size="lg" className="w-full">
              Continue Shopping
            </Button>
          </Link>
        </div>

        {/* What's Next */}
        <div className="mt-12 border rounded-lg p-6">
          <h3 className="font-semibold mb-4">What happens next?</h3>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs">
                1
              </span>
              <span>We'll make a confirmation with your order details</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs">
                2
              </span>
              <span>Your order will be processed and prepared for shipping</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs">
                3
              </span>
              <span>You'll receive a tracking number once your order ships</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs">
                4
              </span>
              <span>Enjoy your purchase!</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
