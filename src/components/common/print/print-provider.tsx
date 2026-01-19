"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type PrintFn = (content: React.ReactNode) => Promise<void>;

type PrintContextValue = {
  print: PrintFn;
  isPrinting: boolean;
};

const PrintContext = createContext<PrintContextValue | null>(null);

export function PrintProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<React.ReactNode | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const resolveRef = useRef<null | (() => void)>(null);

  const cleanup = useCallback(() => {
    resolveRef.current?.();
    resolveRef.current = null;
    setContent(null);
    setIsPrinting(false);
    try {
      document.body.classList.remove("app-printing");
    } catch {}
  }, []);

  useEffect(() => {
    const onAfterPrint = () => cleanup();
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [cleanup]);

  const print = useCallback<PrintFn>(async (nextContent) => {
    if (!nextContent) return;

    await new Promise<void>((resolve) => {
      resolveRef.current = resolve;
      try {
        document.body.classList.add("app-printing");
      } catch {}
      setContent(nextContent);
      setIsPrinting(true);

      window.setTimeout(() => {
        try {
          window.print();
        } catch {
          cleanup();
        }
      }, 50);
    });
  }, [cleanup]);

  const value = useMemo<PrintContextValue>(() => ({ print, isPrinting }), [print, isPrinting]);

  return (
    <PrintContext.Provider value={value}>
      {children}
      <div id="app-print-root" aria-hidden className={"hidden"}>
        {content}
      </div>
      <style jsx global>{`
        @media print {
          body.app-printing > :not(#app-print-root) {
            display: none !important;
          }
          body.app-printing #app-print-root {
            display: block !important;
            position: static !important;
            width: 100% !important;
          }
          body.app-printing .print-page-break {
            page-break-after: always;
            break-after: page;
          }
          body.app-printing {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            margin: 12mm;
          }
        }
      `}</style>
    </PrintContext.Provider>
  );
}

export function usePrint() {
  const ctx = useContext(PrintContext);
  if (!ctx) throw new Error("Missing PrintProvider");
  return ctx;
}
