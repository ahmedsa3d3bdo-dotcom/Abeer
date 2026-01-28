"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Download, Package, Copy, ExternalLink, ChevronDown, ChevronUp, MapPin, CreditCard, Tag } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { LocalDate, LocalDateTime } from "@/components/common/local-datetime";
import { StatusBadge } from "@/components/common/status-badge";
import { computeOrderTotals, normalizeOrderData } from "@/lib/pricing";
import { PriceSummary } from "@/components/shared/pricing";
import { PromotionBadge } from "@/components/shared/pricing";
import { formatCurrency } from "@/lib/utils";

export default function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const [orderId, setOrderId] = useState<string>("");
  const [order, setOrder] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [itemsExpanded, setItemsExpanded] = useState(true);

  useEffect(() => {
    params.then((p) => {
      setOrderId(p.id);
    });
  }, [params]);

  // Fetch order details
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingOrder(true);
        const res = await fetch(`/api/storefront/orders/${orderId}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error?.message || "Failed to load order");
        if (!cancelled) {
          setOrder(data.data);
          setOrderError(null);
        }
      } catch (e: any) {
        if (!cancelled) setOrderError(e?.message || "Failed to load order");
      } finally {
        if (!cancelled) setLoadingOrder(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // Fetch tracking
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
    if (isDelivered) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/storefront/orders/${orderId}/tracking`, { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data?.success) {
          setTracking(data.data);
          setTrackingError(null);
        }
      } catch { }
    }, 10000);
    return () => clearInterval(id);
  }, [orderId, isDelivered]);

  const carrierTrackUrl = (carrier?: string, trackingNumber?: string) => {
    if (!carrier || !trackingNumber) return undefined;
    const c = carrier.toLowerCase();
    if (c.includes("ups")) return `https://www.ups.com/track?loc=en_US&tracknum=${encodeURIComponent(trackingNumber)}`;
    if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`;
    if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`;
    if (c.includes("dhl")) return `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(trackingNumber)}`;
    return undefined;
  };

  // Compute pricing totals using unified logic
  const pricingTotals = useMemo(() => {
    if (!order) return null;
    const normalized = normalizeOrderData(order);
    return computeOrderTotals(normalized);
  }, [order]);

  const orderNumber = order?.orderNumber || orderId;
  const shippingAddress = order?.shippingAddress;
  const items = Array.isArray(order?.items) ? order.items : [];

  return (
    <div className="container py-16">
      <div className="max-w-4xl mx-auto">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-20 w-20 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-lg text-muted-foreground mb-4">
            Thank you for your purchase
          </p>
          <p className="text-sm text-muted-foreground">
            Order #{orderNumber}
          </p>
        </div>

        {loadingOrder ? (
          <div className="text-center text-muted-foreground py-8">Loading order details...</div>
        ) : orderError ? (
          <div className="text-center text-destructive py-8">{orderError}</div>
        ) : (
          <div className="space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Summary ({items.length} {items.length === 1 ? "item" : "items"})
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setItemsExpanded((v) => !v)}
                    className="px-2"
                  >
                    {itemsExpanded ? (
                      <>
                        <ChevronUp className="mr-1 h-4 w-4" /> Hide
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-1 h-4 w-4" /> Show
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {itemsExpanded && (
                  <div className="space-y-4 mb-6">
                    {items.map((item: any) => {
                      const isGift = Number(item.price ?? 0) === 0 && Number(item.total ?? 0) === 0;
                      const unit = Number(item.price ?? 0);
                      const qty = Number(item.quantity ?? 0);
                      const total = Number(item.total ?? 0);
                      const compareAt = Number(item.compareAtPrice ?? 0);
                      const ref = Number(item.referencePrice ?? unit);
                      const hasCompareAt = compareAt > 0 && compareAt > unit;
                      const hasPromo = ref > unit && unit > 0;

                      return (
                        <div key={item.id} className="flex gap-4">
                          <div className="relative h-20 w-20 rounded bg-muted flex-shrink-0">
                            <Image
                              src={item.image || "/placeholder-product.jpg"}
                              alt={item.name}
                              fill
                              className="object-cover rounded"
                              sizes="80px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{item.name}</p>
                            {isGift && (
                              <PromotionBadge type="gift" size="sm" className="mt-1" />
                            )}
                            {item.promotionName && !isGift && (
                              <PromotionBadge type="promotion" label={item.promotionName} size="sm" className="mt-1" />
                            )}
                            {item.variant && (
                              <p className="text-sm text-muted-foreground">{item.variant}</p>
                            )}
                            <p className="text-sm text-muted-foreground">Qty: {qty}</p>
                          </div>
                          <div className="text-right">
                            {isGift ? (
                              <>
                                {ref > 0 && (
                                  <p className="text-xs text-muted-foreground line-through">
                                    {formatCurrency(ref * qty, { currency: "CAD", locale: "en-CA" })}
                                  </p>
                                )}
                                <p className="font-semibold text-green-600 dark:text-green-400">FREE</p>
                              </>
                            ) : (
                              <>
                                {hasCompareAt && (
                                  <p className="text-xs text-muted-foreground line-through">
                                    {formatCurrency(compareAt * qty, { currency: "CAD", locale: "en-CA" })}
                                  </p>
                                )}
                                {hasPromo && !hasCompareAt && (
                                  <p className="text-xs text-muted-foreground line-through">
                                    {formatCurrency(ref * qty, { currency: "CAD", locale: "en-CA" })}
                                  </p>
                                )}
                                <p className="font-semibold">{formatCurrency(total, { currency: "CAD", locale: "en-CA" })}</p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Price Summary */}
                {pricingTotals && (
                  <div className="border-t pt-4">
                    <PriceSummary
                      totals={pricingTotals}
                      showDetails={true}
                      showBeforeDiscounts={true}
                      showTotalDiscounts={true}
                    />
                  </div>
                )}

                {/* Savings callout */}
                {pricingTotals && pricingTotals.totalDiscounts > 0 && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <Tag className="h-4 w-4" />
                      <span className="font-medium">
                        You saved {formatCurrency(pricingTotals.totalDiscounts, { currency: "CAD", locale: "en-CA" })} on this order!
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                          <StatusBadge type="shipment" status="preparing" />
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
                        {(s.updates || []).length > 0 && (
                          <div className="space-y-3 mt-3 pl-2 border-l-2 border-primary/30">
                            {(s.updates || []).map((u: any, idx: number) => (
                              <div key={idx} className="flex items-start gap-3">
                                <div className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
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
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping & Payment Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shipping Address */}
              {shippingAddress && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="font-medium">
                      {shippingAddress.name || `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim()}
                    </p>
                    <p>{shippingAddress.addressLine1}</p>
                    {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
                    <p>{`${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}`}</p>
                    <p>{shippingAddress.country}</p>
                    {shippingAddress.phone && <p className="pt-2">{shippingAddress.phone}</p>}
                  </CardContent>
                </Card>
              )}

              {/* Payment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="capitalize">
                    {order?.paymentMethod === "cash_on_delivery" || order?.paymentMethod === "cod"
                      ? "Cash on Delivery"
                      : order?.paymentMethod === "credit_card" || order?.paymentMethod === "card"
                        ? "Credit/Debit Card"
                        : order?.paymentMethod || "Payment"}
                  </p>
                  <StatusBadge type="payment" status={order?.paymentStatus || "pending"} className="mt-2" />
                </CardContent>
              </Card>
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
            <Card>
              <CardHeader>
                <CardTitle>What happens next?</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
