import { lazy, Suspense } from "react";
import { AppErrorBoundary } from "../common/AppErrorBoundary";

const CampusFeedView = lazy(() =>
  import("./CampusFeedView").then(module => ({ default: module.CampusFeed })),
);

export function CampusFeed() {
  return (
    <AppErrorBoundary
      title="Campus Feed could not be displayed."
      description="The rest of the dashboard is still available. Try reloading this section."
    >
      <Suspense
        fallback={
          <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground shadow-sm">
            Loading campus feed...
          </div>
        }
      >
        <CampusFeedView />
      </Suspense>
    </AppErrorBoundary>
  );
}
