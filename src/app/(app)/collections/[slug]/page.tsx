import { notFound } from "next/navigation";
import { dbConnect } from "@/lib/mongoose";
import { Meal } from "@/models/Meal";
import { getSession } from "@/lib/workspace";
import {
  coverFor,
  getVisibleCollection,
  normalizeMealName,
} from "@/lib/collections";
import { CollectionDetail } from "@/components/collections/collection-detail";

export const dynamic = "force-dynamic";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();

  // A draft is visible to its creator only, and reads as missing to everyone
  // else rather than forbidden.
  const collection = await getVisibleCollection(slug, session.clerkId);
  if (!collection) notFound();

  await dbConnect();

  const docs = (await Meal.find({ ownerKey: session.workspace.ownerKey })
    .select("name sourceCollection sourceMealKey")
    .lean()) as {
    name: string;
    sourceCollection?: string;
    sourceMealKey?: string;
  }[];

  const importedKeys = new Set(
    docs
      .filter(
        (doc) => doc.sourceCollection === collection.id && doc.sourceMealKey
      )
      .map((doc) => doc.sourceMealKey as string)
  );
  const ownedNames = new Set(docs.map((doc) => normalizeMealName(doc.name)));

  // A dish already in the library counts as present however it got there, so
  // the catalog never offers to add something twice.
  const added = collection.meals
    .filter(
      (meal) =>
        importedKeys.has(meal.key) ||
        ownedNames.has(normalizeMealName(meal.name))
    )
    .map((meal) => meal.key);

  return (
    <CollectionDetail
      collection={collection}
      added={added}
      workspaceLabel={session.workspace.label}
      isOwner={collection.creator.clerkId === session.clerkId}
      coverUrl={coverFor(collection)}
    />
  );
}
