import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SecurityEndpointsTab(props: { status: any }) {
  const { status } = props;

  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-base">Endpoints</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {(status?.endpoints || []).length ? (
          <div className="space-y-2">
            {(status.endpoints as any[]).map((e) => {
              const resolvedLabel = String(e?.label || e?.key || "").trim();
              return (
                <div key={e.key} className="flex flex-col gap-1 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{resolvedLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.method} {e.path}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Rate limit: {e.rateLimit?.enabled ? `${e.rateLimit.limit}/${e.rateLimit.windowSec}s` : "Off"}
                  </div>
                  <div className="text-xs text-muted-foreground">Origin check: {e.originCheck?.enabled ? "On" : "Off"}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-muted-foreground">No endpoint status available.</div>
        )}
      </CardContent>
    </Card>
  );
}
