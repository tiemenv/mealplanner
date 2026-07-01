import Link from "next/link";
import { dbConnect } from "@/lib/mongoose";
import { getSession } from "@/lib/workspace";
import { Meal } from "@/models/Meal";
import { MealPlan, type MealPlanDoc } from "@/models/MealPlan";
import { Invite } from "@/models/Invite";
import { serializeMealPlan } from "@/lib/serialize";
import { getWeekStart, formatWeekRange } from "@/lib/week";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  CalendarDays,
  Users,
  Mail,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  await dbConnect();
  const ownerKey = session.workspace.ownerKey;
  const weekStart = getWeekStart();

  const [mealCount, planDoc, inviteCount] = await Promise.all([
    Meal.countDocuments({ ownerKey }),
    MealPlan.findOne({ ownerKey, weekStart }).lean() as Promise<MealPlanDoc | null>,
    session.workspace.type === "user"
      ? Invite.countDocuments({ email: session.email, status: "pending" })
      : Promise.resolve(0),
  ]);

  const plan = planDoc ? serializeMealPlan(planDoc) : null;
  const filled = plan
    ? plan.slots.filter((s) => s.mealId).length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome back{session.name ? `, ${session.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          You&apos;re planning in{" "}
          <span className="font-medium text-foreground">
            {session.workspace.label}
          </span>
          .
        </p>
      </div>

      {inviteCount > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary" />
              <p className="text-sm">
                You have {inviteCount} pending group{" "}
                {inviteCount === 1 ? "invitation" : "invitations"}.
              </p>
            </div>
            <Button size="sm" render={<Link href="/group" />}>
              View
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Meals in library"
          value={String(mealCount)}
          href="/library"
          cta="Manage library"
        />
        <StatCard
          icon={<CalendarDays className="h-5 w-5" />}
          label="This week's plan"
          value={plan ? `${filled}/21 slots` : "Not generated"}
          href="/planner"
          cta={plan ? "Open planner" : "Generate now"}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Workspace"
          value={session.workspace.label}
          href="/group"
          cta={session.workspace.type === "group" ? "Manage group" : "Create a group"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> This week
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {formatWeekRange(weekStart)}
          </p>
          {mealCount === 0 ? (
            <EmptyHint
              text="Start by adding a few meals to your library."
              href="/library"
              cta="Add meals"
            />
          ) : plan ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{filled} of 21 slots filled</Badge>
              <Button
                size="sm"
                variant="outline"
                render={<Link href="/planner" />}
              >
                Open planner <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <EmptyHint
              text="No plan yet for this week. Generate one in a click."
              href="/planner"
              cta="Generate week"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  cta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
  cta: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 py-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            {icon}
          </span>
          <span className="text-sm">{label}</span>
        </div>
        <p className="text-2xl font-semibold">{value}</p>
        <Button
          variant="link"
          className="h-auto p-0"
          render={<Link href={href} />}
        >
          {cta} <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyHint({
  text,
  href,
  cta,
}: {
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button size="sm" render={<Link href={href} />}>
        {cta}
      </Button>
    </div>
  );
}
