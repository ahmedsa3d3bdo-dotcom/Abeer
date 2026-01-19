"use client";

import * as React from "react";
import { XIcon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dir?: "ltr" | "rtl";
  loading?: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  cancelText?: React.ReactNode;
  confirmText?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  dir,
  loading,
  title,
  description,
  cancelText,
  confirmText,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir={dir} className="p-0 overflow-hidden sm:max-w-lg max-h-[85vh]">
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground">
            <AlertDialogTitle className="text-start text-base font-semibold leading-none">{title}</AlertDialogTitle>
            <AlertDialogCancel asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={Boolean(loading)}
                className="bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <XIcon className="h-4 w-4 text-primary-foreground" />
                <span className="sr-only">Close</span>
              </Button>
            </AlertDialogCancel>
          </div>

          <div className="thin-scrollbar flex-1 overflow-y-auto px-4 py-4">
            {description ? <AlertDialogDescription className="text-start">{description}</AlertDialogDescription> : null}
          </div>

          <div className="border-t px-4 py-3">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialogCancel disabled={Boolean(loading)}>{cancelText ?? "Cancel"}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={Boolean(loading)}
                onClick={(e) => {
                  e.preventDefault();
                  void onConfirm();
                }}
              >
                <span className="inline-flex items-center gap-2">
                  {loading ? <Spinner /> : null}
                  {confirmText ?? "Delete"}
                </span>
              </AlertDialogAction>
            </div>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
