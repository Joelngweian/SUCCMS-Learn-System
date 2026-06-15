import type { ReactNode } from "react";

interface AssignmentEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function AssignmentEmptyState({
  icon,
  title,
  description,
}: AssignmentEmptyStateProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-card py-24 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  );
}
