import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/components/ui/utils";
import {
  resolveConfirm,
  subscribeToConfirm,
  type ConfirmOptions,
} from "@/lib/confirm";

export function GlobalConfirmDialog() {
  const [request, setRequest] = useState<ConfirmOptions | null>(null);

  useEffect(() => subscribeToConfirm(setRequest), []);

  return (
    <AlertDialog
      open={Boolean(request)}
      onOpenChange={(open) => {
        if (!open) resolveConfirm(false);
      }}
    >
      <AlertDialogContent
        overlayClassName="z-[20000]"
        className="z-[20001]"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {request?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => resolveConfirm(false)}>
            {request?.cancelLabel || "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              request?.destructive &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            )}
            onClick={() => resolveConfirm(true)}
          >
            {request?.confirmLabel || "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
