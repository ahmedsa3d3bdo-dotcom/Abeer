import React from "react";

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border ring-1 ring-border bg-gradient-to-br from-primary/10 via-background to-primary/10 p-8 sm:p-10 mb-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{title}</h1>
      {subtitle ? <p className="text-muted-foreground mt-2 max-w-2xl">{subtitle}</p> : null}
    </div>
  );
}
