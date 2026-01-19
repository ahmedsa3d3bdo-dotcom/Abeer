"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

type TocItem = { id: string; title: string };

export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | null>(items?.[0]?.id ?? null);

  const ids = useMemo(() => items.map((i) => i.id), [items]);

  useEffect(() => {
    const headings = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        });
      },
      { rootMargin: "0px 0px -70% 0px", threshold: [0, 1] }
    );

    headings.forEach((h) => observer.observe(h));
    return () => headings.forEach((h) => observer.unobserve(h));
  }, [ids]);

  const onClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
    }
  }, []);

  return (
    <aside className="hidden lg:block lg:sticky top-24 h-full">
      <div className="rounded-xl border ring-1 ring-border bg-card p-4">
        <div className="text-sm font-semibold mb-2">On this page</div>
        <nav className="text-sm space-y-1">
          {items.map((it) => {
            const isActive = active === it.id;
            return (
              <a
                key={it.id}
                href={`#${it.id}`}
                onClick={(e) => onClick(e, it.id)}
                aria-current={isActive ? "true" : undefined}
                className={
                  (isActive
                    ? "text-foreground font-medium border-primary"
                    : "text-muted-foreground hover:text-foreground border-transparent") +
                  " block border-l-2 pl-3 rounded-sm"
                }
              >
                {it.title}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
