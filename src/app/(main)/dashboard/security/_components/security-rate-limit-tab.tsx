import type { Dispatch, SetStateAction } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { clampInt, rateLimitTargetLabel, type SecuritySettings } from "./security-shared";

export function SecurityRateLimitTab(props: {
  settings: SecuritySettings;
  setSettings: Dispatch<SetStateAction<SecuritySettings>>;
}) {
  const { settings, setSettings } = props;

  return (
    <Card>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Rate limiting</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Enabled</Label>
            <Switch
              checked={settings.rateLimit.enabled}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, rateLimit: { ...s.rateLimit, enabled: Boolean(v) } }))}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(["contact", "newsletter", "login", "register", "reviewsPost", "helpfulVote", "reportReview"] as const).map((key) => (
          <div key={key} className="rounded-lg border p-3">
            <div className="mb-2 text-sm font-medium">{rateLimitTargetLabel(key)}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Limit</Label>
                <Input
                  type="number"
                  value={(settings.rateLimit as any)[key].limit}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      rateLimit: {
                        ...s.rateLimit,
                        [key]: {
                          ...(s.rateLimit as any)[key],
                          limit: clampInt(e.target.value, 1, 10000, (s.rateLimit as any)[key].limit),
                        },
                      } as any,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Window (sec)</Label>
                <Input
                  type="number"
                  value={(settings.rateLimit as any)[key].windowSec}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      rateLimit: {
                        ...s.rateLimit,
                        [key]: {
                          ...(s.rateLimit as any)[key],
                          windowSec: clampInt(e.target.value, 1, 86400, (s.rateLimit as any)[key].windowSec),
                        },
                      } as any,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
