import { dbConnect } from "@/lib/mongoose";
import { Meal, type MealDoc } from "@/models/Meal";
import { getSession } from "@/lib/workspace";
import { serializeMeal } from "@/lib/serialize";
import { countVisibleCollections } from "@/lib/collections";
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

  // Only the empty state reads this, so a stocked library never pays for the
  // query: it decides whether pointing at Collections leads anywhere.
  const collectionCount =
    meals.length === 0
      ? await countVisibleCollections(
          session.isCreator ? session.clerkId : undefined
        )
      : 0;

  return (
    <LibraryClient
      meals={meals}
      cuisines={cuisines}
      collectionCount={collectionCount}
      workspaceLabel={session.workspace.label}
    />
  );
}
