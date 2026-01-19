"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Address } from "@/types/storefront";
import { toast } from "sonner";

interface ShippingFormProps {
  initialData?: Address | null;
  onSubmit: (data: Address) => void;
}

export function ShippingForm({ initialData, onSubmit }: ShippingFormProps) {
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
    // 11 digits starting with 1
    const partC = digits[0] === "1" ? "+1 " : "";
    const rest = digits.slice(digits[0] === "1" ? 1 : 0);
    const p1 = rest.slice(0, 3);
    const p2 = rest.slice(3, 6);
    const p3 = rest.slice(6, 10);
    return `${partC}${p1 ? `(${p1})` : ""}${p2 ? ` ${p2}` : ""}${p3 ? `-${p3}` : ""}`.trim();
  };

  // Sync form when initialData changes (e.g., prefilled from saved address)
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
      } as Address));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

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

  const [formData, setFormData] = useState<Address & { email?: string }>(
    initialData || {
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
      email: "",
    }
  );

  const [saveAddress, setSaveAddress] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof (Address & { email?: string }), string>>>({});

  const handleChange = (field: keyof (Address & { email?: string }), value: string) => {
    if (field === "phone") {
      const country = formData.country || "US";
      const formatted = country === "US" || country === "CA" ? formatUSPhone(value) : value;
      setFormData((prev) => ({ ...prev, phone: formatted }));
      return;
    }
    if (field === "postalCode") {
      const country = formData.country || "US";
      const formatted = country === "CA" ? formatCAPostal(value) : country === "US" ? formatUSPostal(value) : value.toUpperCase();
      setFormData((prev) => ({ ...prev, postalCode: formatted }));
      return;
    }
    if (field === "country") {
      setFormData((prev) => ({ ...prev, country: value.toUpperCase() }));
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Partial<Record<keyof (Address & { email?: string }), string>> = {};
    const required: Array<keyof (Address & { email?: string })> = [
      "firstName",
      "lastName",
      "addressLine1",
      "city",
      "state",
      "postalCode",
      "country",
      "phone",
      "email",
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
    onSubmit({ ...formData, isDefault: saveAddress } as any);
  };

  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Shipping Address</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Fields */}
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

        {/* Address */}
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

        {/* City, State, Zip */}
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
              placeholder="ON"
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

        {/* Country */}
        <div>
          <Label htmlFor="country">
            Country <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.country}
            onValueChange={(value) => handleChange("country", value)}
          >
            <SelectTrigger id="country">
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

        {/* Contact */}
        <div>
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email || ""}
            onChange={(e) => handleChange("email", e.target.value)}
            required
            aria-invalid={Boolean((errors as any).email) || undefined}
          />
          {(errors as any).email && (
            <p className="mt-1 text-xs text-destructive">{(errors as any).email}</p>
          )}
        </div>

        {/* Phone */}
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

        {/* Save Address */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="save-address"
            checked={saveAddress}
            onCheckedChange={(checked) => setSaveAddress(checked as boolean)}
          />
          <Label
            htmlFor="save-address"
            className="text-sm font-normal cursor-pointer"
          >
            Save this address for future orders
          </Label>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Continue to Shipping Method
          </Button>
        </div>
      </form>
    </div>
  );
}
