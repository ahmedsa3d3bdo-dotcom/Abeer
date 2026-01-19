"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { AppDialogContent } from "@/components/ui/app-dialog";
import { Spinner } from "@/components/ui/spinner";

type Dir = "ltr" | "rtl";

type FormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  dir?: Dir;
  trigger?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  cancelText?: React.ReactNode;
  submitText?: React.ReactNode;
  submitting?: boolean;
  submitDisabled?: boolean;
  submitVariant?: "default" | "destructive";
  onSubmit?: () => void | Promise<void>;
};

export function FormModal({
  open,
  onOpenChange,
  title,
  description,
  dir,
  trigger,
  className,
  headerClassName,
  bodyClassName,
  children,
  footer,
  cancelText,
  submitText,
  submitting,
  submitDisabled,
  submitVariant,
  onSubmit,
}: FormModalProps) {
  const resolvedFooter =
    footer ??
    (onSubmit ? (
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" type="button" disabled={Boolean(submitting)} onClick={() => onOpenChange(false)}>
          {cancelText ?? "Cancel"}
        </Button>
        <Button
          type="button"
          variant={submitVariant ?? "default"}
          disabled={Boolean(submitting) || Boolean(submitDisabled)}
          onClick={() => void onSubmit()}
        >
          <span className="inline-flex items-center gap-2">
            {submitting ? <Spinner /> : null}
            {submitText ?? "Save"}
          </span>
        </Button>
      </div>
    ) : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <AppDialogContent
        title={title}
        description={description}
        dir={dir}
        className={className}
        headerClassName={headerClassName}
        bodyClassName={bodyClassName}
        footer={resolvedFooter}
      >
        {children}
      </AppDialogContent>
    </Dialog>
  );
}
