"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Building, Wallet } from "lucide-react";
import { toast } from "sonner";

interface PaymentFormProps {
  onSubmit: (data: any) => void;
  onBack?: () => void;
  onContinue?: () => void;
}

export function PaymentForm({ onSubmit, onBack, onContinue }: PaymentFormProps) {
  const [paymentType, setPaymentType] = useState("cod");
  const [formData, setFormData] = useState({
    cardNumber: "",
    cardName: "",
    expiry: "",
    cvv: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showActions = typeof onBack === "function";

  useEffect(() => {
    if (paymentType === "cod") {
      onSubmit({ type: "cash_on_delivery" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (paymentType === "card") {
      if (!formData.cardNumber.trim()) next.cardNumber = "Card number is required";
      if (!formData.cardName.trim()) next.cardName = "Name on card is required";
      if (!formData.expiry.trim()) next.expiry = "Expiry is required";
      if (!formData.cvv.trim()) next.cvv = "CVV is required";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast.error("Please fill payment details");
      return;
    }
    if (paymentType === "cod") {
      onSubmit({ type: "cash_on_delivery" });
      if (typeof onContinue === "function") onContinue();
      return;
    }
    toast.error("This payment method is coming soon");
  };

  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Payment Information</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Type */}
        <RadioGroup value={paymentType} onValueChange={setPaymentType}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2 p-4 border-2 rounded-lg opacity-50">
              <RadioGroupItem value="card" id="card" disabled />
              <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                <CreditCard className="h-5 w-5" />
                <span>Credit/Debit Card (Coming Soon)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-4 border-2 rounded-lg cursor-pointer">
              <RadioGroupItem value="cod" id="cod" />
              <Label htmlFor="cod" className="flex items-center gap-2 cursor-pointer flex-1">
                <Wallet className="h-5 w-5" />
                <span>Cash on Delivery</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-4 border-2 rounded-lg cursor-pointer opacity-50">
              <RadioGroupItem value="paypal" id="paypal" disabled />
              <Label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer flex-1">
                <Building className="h-5 w-5" />
                <span>PayPal (Coming Soon)</span>
              </Label>
            </div>
          </div>
        </RadioGroup>

        {paymentType === "cod" && (
          <p className="text-sm text-muted-foreground">
            You will pay in cash when your order is delivered.
          </p>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-4 pt-4">
            {onBack && (
              <Button type="button" variant="outline" onClick={onBack}>
                Back
              </Button>
            )}
            <Button type="submit" className="flex-1 sm:flex-initial">
              Review Order
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
