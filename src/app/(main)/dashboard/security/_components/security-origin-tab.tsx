import type { Dispatch, SetStateAction } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type { SecuritySettings } from "./security-shared";

export function SecurityOriginTab(props: {
  settings: SecuritySettings;
  setSettings: Dispatch<SetStateAction<SecuritySettings>>;
  allowedOriginsInput: string;
  setAllowedOriginsInput: Dispatch<SetStateAction<string>>;
  originSuggestion: string;
}) {
  const { settings, setSettings, allowedOriginsInput, setAllowedOriginsInput, originSuggestion } = props;

  return (
    <Card>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Origin protection</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Enabled</Label>
            <Switch
              checked={settings.originCheck.enabled}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, originCheck: { ...s.originCheck, enabled: Boolean(v) } }))}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Public forms</div>
              <div className="text-xs text-muted-foreground">Contact / newsletter forms</div>
            </div>
            <Switch
              checked={settings.originCheck.enforceOnPublicForms}
              onCheckedChange={(v) =>
                setSettings((s) => ({ ...s, originCheck: { ...s.originCheck, enforceOnPublicForms: Boolean(v) } }))
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Authentication</div>
              <div className="text-xs text-muted-foreground">Login / register endpoints</div>
            </div>
            <Switch
              checked={settings.originCheck.enforceOnAuth}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, originCheck: { ...s.originCheck, enforceOnAuth: Boolean(v) } }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Reviews</div>
              <div className="text-xs text-muted-foreground">Posting reviews & helpful votes</div>
            </div>
            <Switch
              checked={settings.originCheck.enforceOnReviews}
              onCheckedChange={(v) =>
                setSettings((s) => ({ ...s, originCheck: { ...s.originCheck, enforceOnReviews: Boolean(v) } }))
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Allowed origins (one per line)</Label>
          <textarea
            className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={allowedOriginsInput}
            onChange={(e) => {
              const raw = String(e.target.value || "");
              setAllowedOriginsInput(raw);

              const origins = raw
                .split(/\r?\n/)
                .map((x) => x.trim())
                .filter(Boolean);
              setSettings((s) => ({ ...s, originCheck: { ...s.originCheck, allowedOrigins: origins } }));
            }}
            placeholder={originSuggestion || "https://example.com"}
          />
        </div>
      </CardContent>
    </Card>
  );
}
