import Link from "next/link";
import { Mail } from "lucide-react";
import { dbConnect } from "@/lib/mongoose";
import { getSession } from "@/lib/workspace";
import { Meal, type MealDoc } from "@/models/Meal";
import { MealPlan, type MealPlanDoc } from "@/models/MealPlan";
import { Invite } from "@/models/Invite";
import { serializeMeal, serializeMealPlan } from "@/lib/serialize";
import { getWeekStart } from "@/lib/week";
import { PlannerClient } from "@/components/planner/planner-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const session = await getSession();
  await dbConnect();
  const ownerKey = session.workspace.ownerKey;

  const weekStart =
    week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : getWeekStart();

  const mealDocs = (await Meal.find({ ownerKey })
    .sort({ name: 1 })
    .lean()) as unknown as MealDoc[];
  const meals = mealDocs.map(serializeMeal);

  const planDoc = (await MealPlan.findOne({
    ownerKey,
    weekStart,
  }).lean()) as MealPlanDoc | null;

  const plan = planDoc ? serializeMealPlan(planDoc) : null;

  const inviteCount =
    session.workspace.type === "user"
      ? await Invite.countDocuments({
          email: session.email,
          status: "pending",
        })
      : 0;

  return (
    <div className="space-y-6">
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
      <PlannerClient
        meals={meals}
        initialPlan={plan}
        weekStart={weekStart}
        workspaceLabel={session.workspace.label}
        householdSize={session.workspace.householdSize}
      />
    </div>
  );
}
