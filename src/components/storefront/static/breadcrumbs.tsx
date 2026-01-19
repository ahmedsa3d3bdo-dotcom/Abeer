import React from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type Crumb = { href?: string; label: string };

export function PageBreadcrumbs({ items }: { items: Crumb[] }) {
  if (!items?.length) return null;
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((it, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <React.Fragment key={`crumb-${idx}-${it.href ?? it.label}`}>
              <BreadcrumbItem>
                {isLast || !it.href ? (
                  <BreadcrumbPage>{it.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={it.href}>{it.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
