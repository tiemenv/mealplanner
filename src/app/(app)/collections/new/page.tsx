import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/mongoose";
import { Meal } from "@/models/Meal";
import { getSession } from "@/lib/workspace";
import { NewCollectionForm } from "@/components/collections/new-collection-form";

export const dynamic = "force-dynamic";

export default async function NewCollectionPage() {
  const session = await getSession();
  if (!session.isCreator) notFound();

  await dbConnect();

  // The cuisines already in use, so a collection's label matches its meals.
  const cuisines = (
    (await Meal.distinct("cuisine", {
      ownerKey: session.workspace.ownerKey,
    })) as string[]
  )
    .filter((cuisine) => cuisine && cuisine.trim())
    .sort((a, b) => a.localeCompare(b));

  return <NewCollectionForm cuisines={cuisines} />;
}
