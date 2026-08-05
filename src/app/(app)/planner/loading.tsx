import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { DAY_NAMES } from "@/lib/week";
import { MEAL_TYPES } from "@/lib/constants";

export default function PlannerLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-12 w-64 rounded-lg" />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-64" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-36 rounded-md" />
            <Skeleton className="h-10 w-40 rounded-md" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {DAY_NAMES.map((day) => (
          <Card key={day} className="overflow-hidden p-0">
            <div className="flex flex-col sm:flex-row">
              <div className="flex shrink-0 items-center justify-between gap-1 border-b bg-muted/40 px-4 py-3 sm:w-44 sm:flex-col sm:items-start sm:justify-center sm:border-b-0 sm:border-r">
                <span className="font-semibold">{day}</span>
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="grid flex-1 grid-cols-1 gap-2 p-3 sm:grid-cols-3">
                {MEAL_TYPES.map((type) => (
                  <div key={type} className="rounded-md border p-2">
                    <Skeleton className="mb-2 h-3 w-16" />
                    <div className="flex items-start gap-2">
                      <Skeleton className="h-11 w-11 shrink-0 rounded" />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-2 w-2 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
