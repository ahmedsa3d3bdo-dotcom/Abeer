"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Address } from "@/types/storefront";

export default function AddressesPage() {
  const [address, setAddress] = useState<Address | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({});
  const [formData, setFormData] = useState<Address>({
    firstName: "",
    lastName: "",
    company: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    phone: "",
    isDefault: false,
  });

  const formatUSPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      const part1 = digits.slice(0, 3);
      const part2 = digits.slice(3, 6);
      const part3 = digits.slice(6, 10);
      return [
        part1 ? `(${part1}` : "",
        part2 ? `) ${part2}` : "",
        part3 ? `-${part3}` : "",
      ].join("");
    }
    const partC = digits[0] === "1" ? "+1 " : "";
    const rest = digits.slice(digits[0] === "1" ? 1 : 0);
    const p1 = rest.slice(0, 3);
    const p2 = rest.slice(3, 6);
    const p3 = rest.slice(6, 10);
    return `${partC}${p1 ? `(${p1})` : ""}${p2 ? ` ${p2}` : ""}${p3 ? `-${p3}` : ""}`.trim();
  };

  const formatUSPostal = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const formatCAPostal = (value: string) => {
    const cleaned = value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6);
    const part1 = cleaned.slice(0, 3);
    const part2 = cleaned.slice(3, 6);
    return part2 ? `${part1} ${part2}` : part1;
  };

  const handleChange = (field: keyof Address, value: string) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (field === "phone") {
      const c = (formData.country || "US").toUpperCase();
      const formatted = c === "US" || c === "CA" ? formatUSPhone(value) : value;
      setFormData((prev) => ({ ...prev, phone: formatted }));
      return;
    }
    if (field === "postalCode") {
      const c = (formData.country || "US").toUpperCase();
      const formatted = c === "CA" ? formatCAPostal(value) : c === "US" ? formatUSPostal(value) : value.toUpperCase();
      setFormData((prev) => ({ ...prev, postalCode: formatted }));
      return;
    }
    if (field === "country") {
      setFormData((prev) => ({ ...prev, country: value.toUpperCase() }));
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEdit = (addr: Address | null) => {
    setEditingAddress(addr);
    setErrors({});
    setFormData(
      addr || {
        firstName: "",
        lastName: "",
        company: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "CA",
        phone: "",
        isDefault: true,
      }
    );
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Partial<Record<keyof Address, string>> = {};
    const required: Array<keyof Address> = [
      "firstName",
      "lastName",
      "addressLine1",
      "city",
      "state",
      "postalCode",
      "country",
      "phone",
    ];
    required.forEach((key) => {
      const val = (formData as any)[key];
      if (!val || String(val).trim() === "") nextErrors[key] = "This field is required";
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/storefront/account/shipping-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setAddress(data.data);
        setIsDialogOpen(false);
      } else {
        toast.error(data?.error?.message || "Failed to save address");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save address");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/storefront/account/shipping-address", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data?.success) setAddress(data.data);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Saved Addresses</h2>
          <p className="text-muted-foreground">
            Manage your shipping addresses
          </p>
        </div>
        <Button onClick={() => handleEdit(address)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {address ? "Edit Address" : "Add Address"}
        </Button>
      </div>

      {/* Addresses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {address && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  {address.isDefault && (
                    <Badge className="mb-2">Default</Badge>
                  )}
                  <p className="font-semibold">
                    {address.firstName} {address.lastName}
                  </p>
                  {address.company && (
                    <p className="text-sm text-muted-foreground">
                      {address.company}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(address)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="text-sm space-y-1 text-muted-foreground">
                <p>{address.addressLine1}</p>
                {address.addressLine2 && <p>{address.addressLine2}</p>}
                <p>
                  {address.city}, {address.state} {address.postalCode}
                </p>
                <p>{address.country}</p>
                <p>{address.phone}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Empty State */}
      {!address && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <p className="text-muted-foreground mb-4">
              No saved addresses yet
            </p>
            <Button onClick={() => handleEdit(null)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Address
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? "Edit Address" : "Add New Address"}
            </DialogTitle>
            <DialogDescription>
              {editingAddress
                ? "Update your address details"
                : "Add a new shipping address"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  required
                  aria-invalid={Boolean(errors.firstName) || undefined}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-destructive">{errors.firstName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  required
                  aria-invalid={Boolean(errors.lastName) || undefined}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="addressLine1">
                Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="addressLine1"
                value={formData.addressLine1}
                onChange={(e) => handleChange("addressLine1", e.target.value)}
                required
                aria-invalid={Boolean(errors.addressLine1) || undefined}
              />
              {errors.addressLine1 && (
                <p className="mt-1 text-xs text-destructive">{errors.addressLine1}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">
                  City <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  required
                  aria-invalid={Boolean(errors.city) || undefined}
                />
                {errors.city && (
                  <p className="mt-1 text-xs text-destructive">{errors.city}</p>
                )}
              </div>
              <div>
                <Label htmlFor="state">
                  Province <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  required
                  aria-invalid={Boolean(errors.state) || undefined}
                />
                {errors.state && (
                  <p className="mt-1 text-xs text-destructive">{errors.state}</p>
                )}
              </div>
              <div>
                <Label htmlFor="postalCode">
                  Postal Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => handleChange("postalCode", e.target.value)}
                  required
                  aria-invalid={Boolean(errors.postalCode) || undefined}
                />
                {errors.postalCode && (
                  <p className="mt-1 text-xs text-destructive">{errors.postalCode}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="country">
                Country <span className="text-destructive">*</span>
              </Label>
              <Select
                value={(formData.country || "").toUpperCase()}
                onValueChange={(value) => handleChange("country", value)}
              >
                <SelectTrigger id="country" aria-invalid={Boolean(errors.country) || undefined}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                </SelectContent>
              </Select>
              {errors.country && (
                <p className="mt-1 text-xs text-destructive">{errors.country}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                required
                aria-invalid={Boolean(errors.phone) || undefined}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-destructive">{errors.phone}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" className="w-full sm:flex-1" disabled={isSaving}>
                {isSaving ? "Saving..." : editingAddress ? "Update Address" : "Add Address"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="w-full sm:w-auto"
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
