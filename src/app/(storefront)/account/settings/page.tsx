"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, MessageSquare, Package, Tag } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState({
    orderUpdates: true,
    promotions: false,
    newsletter: true,
    productRecommendations: false,
  });

  const [preferences, setPreferences] = useState({
    twoFactorAuth: false,
    marketingEmails: true,
    pushNotifications: true,
  });

  // Notification preferences wired to API
  const [notifPrefs, setNotifPrefs] = useState({ promotions: true, backInStock: true, priceDrop: true });
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<Record<string, any>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/storefront/account/preferences", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load preferences");
        const json = await res.json();
        const d = json?.data || {};
        if (!cancelled) {
          setNotifPrefs({
            promotions: Boolean(d.promotions ?? true),
            backInStock: Boolean(d.backInStock ?? true),
            priceDrop: Boolean(d.priceDrop ?? true),
          });
          setEmailNotifications({
            orderUpdates: Boolean(d.emailOrderUpdates ?? true),
            promotions: Boolean(d.emailPromotions ?? false),
            newsletter: Boolean(d.emailNewsletter ?? true),
            productRecommendations: Boolean(d.emailRecommendations ?? false),
          });
        }
      } catch {
        if (!cancelled) toast.error("Could not load notification preferences");
      } finally {
        if (!cancelled) setLoadingPrefs(false);
      }
    })();
    return () => { cancelled = true; if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const queueSave = (patch: Partial<typeof notifPrefs & {
    emailOrderUpdates: boolean;
    emailPromotions: boolean;
    emailNewsletter: boolean;
    emailRecommendations: boolean;
  }>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // accumulate patches between rapid changes
    pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/storefront/account/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pendingPatchRef.current),
        });
        if (!res.ok) throw new Error("Save failed");
        const json = await res.json().catch(() => ({} as any));
        const d = (json as any)?.data || {};
        setNotifPrefs({
          promotions: Boolean(d.promotions ?? notifPrefs.promotions),
          backInStock: Boolean(d.backInStock ?? notifPrefs.backInStock),
          priceDrop: Boolean(d.priceDrop ?? notifPrefs.priceDrop),
        });
        setEmailNotifications({
          orderUpdates: Boolean(d.emailOrderUpdates ?? emailNotifications.orderUpdates),
          promotions: Boolean(d.emailPromotions ?? emailNotifications.promotions),
          newsletter: Boolean(d.emailNewsletter ?? emailNotifications.newsletter),
          productRecommendations: Boolean(d.emailRecommendations ?? emailNotifications.productRecommendations),
        });
        toast.success("Preferences saved");
      } catch {
        // Best-effort: refresh to revert if failed
        try {
          const res = await fetch("/api/storefront/account/preferences", { cache: "no-store" });
          const json = await res.json();
          const d = json?.data || {};
          setNotifPrefs({
            promotions: Boolean(d.promotions ?? true),
            backInStock: Boolean(d.backInStock ?? true),
            priceDrop: Boolean(d.priceDrop ?? true),
          });
          setEmailNotifications({
            orderUpdates: Boolean(d.emailOrderUpdates ?? true),
            promotions: Boolean(d.emailPromotions ?? false),
            newsletter: Boolean(d.emailNewsletter ?? true),
            productRecommendations: Boolean(d.emailRecommendations ?? false),
          });
        } catch {}
        toast.error("Failed to save preferences");
      }
      pendingPatchRef.current = {};
    }, 400);
  };

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    // Persist current in-app notification preferences immediately
    try {
      setSaving(true);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const res = await fetch("/api/storefront/account/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...notifPrefs,
          emailOrderUpdates: emailNotifications.orderUpdates,
          emailPromotions: emailNotifications.promotions,
          emailNewsletter: emailNotifications.newsletter,
          emailRecommendations: emailNotifications.productRecommendations,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const json = await res.json().catch(() => ({} as any));
      const d = (json as any)?.data || {};
      setNotifPrefs({
        promotions: Boolean(d.promotions ?? notifPrefs.promotions),
        backInStock: Boolean(d.backInStock ?? notifPrefs.backInStock),
        priceDrop: Boolean(d.priceDrop ?? notifPrefs.priceDrop),
      });
      setEmailNotifications({
        orderUpdates: Boolean(d.emailOrderUpdates ?? emailNotifications.orderUpdates),
        promotions: Boolean(d.emailPromotions ?? emailNotifications.promotions),
        newsletter: Boolean(d.emailNewsletter ?? emailNotifications.newsletter),
        productRecommendations: Boolean(d.emailRecommendations ?? emailNotifications.productRecommendations),
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Account Settings</h2>
        <p className="text-muted-foreground">
          Manage your preferences and notifications
        </p>
      </div>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which emails you'd like to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="order-updates" className="font-medium">
                  Order Updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about your order status
                </p>
              </div>
            </div>
            <Switch
              id="order-updates"
              checked={emailNotifications.orderUpdates}
              onCheckedChange={(checked) =>
                { setEmailNotifications((p) => ({ ...p, orderUpdates: checked })); queueSave({ emailOrderUpdates: checked }); }
              }
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="promotions" className="font-medium">
                  Promotions & Deals
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive exclusive offers and discounts
                </p>
              </div>
            </div>
            <Switch
              id="promotions"
              checked={emailNotifications.promotions}
              onCheckedChange={(checked) =>
                { setEmailNotifications((p) => ({ ...p, promotions: checked })); queueSave({ emailPromotions: checked }); }
              }
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="newsletter" className="font-medium">
                  Newsletter
                </Label>
                <p className="text-sm text-muted-foreground">
                  Weekly newsletter with latest products
                </p>
              </div>
            </div>
            <Switch
              id="newsletter"
              checked={emailNotifications.newsletter}
              onCheckedChange={(checked) =>
                { setEmailNotifications((p) => ({ ...p, newsletter: checked })); queueSave({ emailNewsletter: checked }); }
              }
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="recommendations" className="font-medium">
                  Product Recommendations
                </Label>
                <p className="text-sm text-muted-foreground">
                  Personalized product suggestions
                </p>
              </div>
            </div>
            <Switch
              id="recommendations"
              checked={emailNotifications.productRecommendations}
              onCheckedChange={(checked) =>
                { setEmailNotifications((p) => ({ ...p, productRecommendations: checked })); queueSave({ emailRecommendations: checked }); }
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences (In-App) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Control in-app promotional notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="pref-promotions" className="font-medium">Promotions & Deals</Label>
                <p className="text-sm text-muted-foreground">New offers and store-wide promotions</p>
              </div>
            </div>
            <Switch
              id="pref-promotions"
              checked={notifPrefs.promotions}
              disabled={loadingPrefs}
              onCheckedChange={(checked) => {
                setNotifPrefs((p) => ({ ...p, promotions: checked }));
                queueSave({ promotions: checked });
              }}
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="pref-back-in-stock" className="font-medium">Back in Stock</Label>
                <p className="text-sm text-muted-foreground">Alerts for wishlist items available again</p>
              </div>
            </div>
            <Switch
              id="pref-back-in-stock"
              checked={notifPrefs.backInStock}
              disabled={loadingPrefs}
              onCheckedChange={(checked) => {
                setNotifPrefs((p) => ({ ...p, backInStock: checked }));
                queueSave({ backInStock: checked });
              }}
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="pref-price-drop" className="font-medium">Price Drop</Label>
                <p className="text-sm text-muted-foreground">Alerts when wishlist items get cheaper</p>
              </div>
            </div>
            <Switch
              id="pref-price-drop"
              checked={notifPrefs.priceDrop}
              disabled={loadingPrefs}
              onCheckedChange={(checked) => {
                setNotifPrefs((p) => ({ ...p, priceDrop: checked }));
                queueSave({ priceDrop: checked });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label htmlFor="2fa" className="font-medium">
                Two-Factor Authentication
              </Label>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <Switch
              id="2fa"
              checked={preferences.twoFactorAuth}
              onCheckedChange={(checked) =>
                setPreferences({
                  ...preferences,
                  twoFactorAuth: checked,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
          <CardDescription>
            Control how your data is used
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label htmlFor="marketing" className="font-medium">
                Marketing Communications
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow us to send you marketing emails
              </p>
            </div>
            <Switch
              id="marketing"
              checked={preferences.marketingEmails}
              onCheckedChange={(checked) =>
                setPreferences({
                  ...preferences,
                  marketingEmails: checked,
                })
              }
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label htmlFor="push" className="font-medium">
                Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive push notifications on your device
              </p>
            </div>
            <Switch
              id="push"
              checked={preferences.pushNotifications}
              onCheckedChange={(checked) =>
                setPreferences({
                  ...preferences,
                  pushNotifications: checked,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-stretch sm:justify-end">
        <Button onClick={handleSave} size="lg" disabled={saving || loadingPrefs} className="w-full sm:w-auto">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
