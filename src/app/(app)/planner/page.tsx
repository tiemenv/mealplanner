import { dbConnect } from "@/lib/mongoose";
import { getSession } from "@/lib/workspace";
import { Meal, type MealDoc } from "@/models/Meal";
import { MealPlan, type MealPlanDoc } from "@/models/MealPlan";
import { serializeMeal, serializeMealPlan } from "@/lib/serialize";
import { getWeekStart } from "@/lib/week";
import { PlannerClient } from "@/components/planner/planner-client";

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

  return (
    <PlannerClient
      meals={meals}
      initialPlan={plan}
      weekStart={weekStart}
      workspaceLabel={session.workspace.label}
      householdSize={session.workspace.householdSize}
    />
  );
}
