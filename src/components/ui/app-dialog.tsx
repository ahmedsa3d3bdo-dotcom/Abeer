"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Dir = "ltr" | "rtl"

export function AppDialogContent({
  title,
  description,
  dir,
  className,
  headerClassName,
  bodyClassName,
  footer,
  children,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  dir?: Dir
  className?: string
  headerClassName?: string
  bodyClassName?: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  const isRtl = dir === "rtl"

  return (
    <DialogContent
      showCloseButton={false}
      className={cn(
        "p-0 overflow-hidden sm:max-w-[860px] max-h-[85vh]",
        className
      )}
    >
      <div className="flex max-h-[85vh] flex-col">
        <div
          dir={dir}
          className={cn(
            "flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground",
            isRtl ? "text to right" : "flex-row",
            headerClassName
          )}
        >
          <DialogTitle className="text-start text-base font-semibold leading-none">
            {title}
          </DialogTitle>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <XIcon className="h-4 w-4 text-primary-foreground" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </div>

        {description ? (
          <div dir={dir} className="px-4 pt-3">
            <DialogDescription className="text-start">
              {description}
            </DialogDescription>
          </div>
        ) : null}

        <div
          dir={dir}
          className={cn(
            "thin-scrollbar flex-1 overflow-y-auto px-4 py-4",
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer ? <div className="border-t px-4 py-3">{footer}</div> : null}
      </div>
    </DialogContent>
  )
}
