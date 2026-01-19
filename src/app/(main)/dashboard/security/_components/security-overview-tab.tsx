import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SecurityOverviewTab() {
  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="text-base">Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm text-muted-foreground">Configure rate limiting and origin protection to improve security.</div>
        <div className="text-sm text-muted-foreground">Use the Posture tab to quickly understand risk and apply recommended defaults.</div>
      </CardContent>
    </Card>
  );
}
