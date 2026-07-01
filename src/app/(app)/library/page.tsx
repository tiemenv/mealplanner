import { dbConnect } from "@/lib/mongoose";
import { Meal, type MealDoc } from "@/models/Meal";
import { getSession } from "@/lib/workspace";
import { serializeMeal } from "@/lib/serialize";
import { LibraryClient } from "@/components/library/library-client";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await getSession();
  await dbConnect();

  const docs = (await Meal.find({ ownerKey: session.workspace.ownerKey })
    .sort({ createdAt: -1 })
    .lean()) as unknown as MealDoc[];

  const meals = docs.map(serializeMeal);

  const cuisines = (
    (await Meal.distinct("cuisine", {
      ownerKey: session.workspace.ownerKey,
    })) as string[]
  )
    .filter((c) => c && c.trim())
    .sort((a, b) => a.localeCompare(b));

  return (
    <LibraryClient
      meals={meals}
      cuisines={cuisines}
      workspaceLabel={session.workspace.label}
    />
  );
}
