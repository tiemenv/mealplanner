import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/mongoose";
import { Meal, type MealDoc } from "@/models/Meal";
import { getSession } from "@/lib/workspace";
import { serializeMeal } from "@/lib/serialize";
import { getCollection } from "@/lib/collections";
import { CollectionEditor } from "@/components/collections/collection-editor";

export const dynamic = "force-dynamic";

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  if (!session.isCreator) notFound();

  const collection = await getCollection(slug);
  // Someone else's collection is not editable, and saying so would confirm it
  // exists, so it reads as missing.
  if (!collection || collection.creator.clerkId !== session.clerkId) {
    notFound();
  }

  await dbConnect();

  const docs = (await Meal.find({ ownerKey: session.workspace.ownerKey })
    .sort({ createdAt: -1 })
    .lean()) as unknown as MealDoc[];

  const cuisines = (
    (await Meal.distinct("cuisine", {
      ownerKey: session.workspace.ownerKey,
    })) as string[]
  )
    .filter((cuisine) => cuisine && cuisine.trim())
    .sort((a, b) => a.localeCompare(b));

  return (
    <CollectionEditor
      collection={collection}
      libraryMeals={docs.map(serializeMeal)}
      cuisines={cuisines}
    />
  );
}
