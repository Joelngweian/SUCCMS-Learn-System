import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CampusFeed } from "../campus-feed";
import { Stories } from "../Stories";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function AaroDashboardHome() {
  const { profile } = useAuth();
  const profileName = (profile?.full_name || profile?.username || "").trim();
  const emailName = profile?.email?.split("@")[0]?.trim() || "";
  const displayName = profileName || emailName || "AARO Staff";
  const displayInitials = (displayName || "AARO Staff")
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto w-full max-w-[1460px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0 space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Welcome back, {displayName}!</h1>
              <p className="mt-1 text-muted-foreground">
                Campus activity and AARO updates are ready.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-card px-4 pt-4 shadow-sm sm:px-6 sm:pt-5">
            <Stories
              currentUserName={displayName}
              currentUserInitials={displayInitials}
              currentUserAvatar={profile?.avatar_url || undefined}
              currentUserRole={profile?.role || "staff"}
            />
          </div>

          <CampusFeed />
        </main>
        <aside className="hidden xl:block">
          <div className="sticky top-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Link
                  to="/study-plan-management?tab=study-plans#upload-study-plan"
                  className="block rounded-lg border bg-muted/30 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50 dark:hover:border-blue-900 dark:hover:bg-blue-950/30"
                >
                  <p className="font-medium">Upload study plan</p>
                  <p className="text-xs text-muted-foreground">Import department study plan Excel files.</p>
                </Link>
                <Link
                  to="/study-plan-management?tab=academic-calendar#upload-academic-calendar"
                  className="block rounded-lg border bg-muted/30 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50 dark:hover:border-blue-900 dark:hover:bg-blue-950/30"
                >
                  <p className="font-medium">Upload academic calendar</p>
                  <p className="text-xs text-muted-foreground">Update semester dates from the school calendar PDF.</p>
                </Link>
                <Link
                  to="/study-plan-management?tab=student-study-plans#assign-student-track"
                  className="block rounded-lg border bg-muted/30 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50 dark:hover:border-blue-900 dark:hover:bg-blue-950/30"
                >
                  <p className="font-medium">Assign student track</p>
                  <p className="text-xs text-muted-foreground">Set exact programme, intake and A1/A2/B1/B2 track.</p>
                </Link>
                <Link
                  to="/study-plan-management?tab=assignments#assign-lecturer"
                  className="block rounded-lg border bg-muted/30 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50 dark:hover:border-blue-900 dark:hover:bg-blue-950/30"
                >
                  <p className="font-medium">Assign lecturer</p>
                  <p className="text-xs text-muted-foreground">Assign planned courses to lecturers by semester.</p>
                </Link>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}