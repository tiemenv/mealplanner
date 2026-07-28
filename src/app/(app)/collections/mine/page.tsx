import { notFound } from "next/navigation";
import { getSession } from "@/lib/workspace";
import { listCollectionsByCreator, summarize, coverFor } from "@/lib/collections";
import {
  MyCollections,
  type MyCollectionRow,
} from "@/components/collections/my-collections";

export const dynamic = "force-dynamic";

export default async function MyCollectionsPage() {
  const session = await getSession();
  // Middleware already turns non-creators away; this is what holds if the
  // route is reached some other way.
  if (!session.isCreator) notFound();

  const collections = await listCollectionsByCreator(session.clerkId);

  const rows: MyCollectionRow[] = collections.map((collection) => {
    const stats = summarize(collection);
    return {
      slug: collection.slug,
      title: collection.title,
      description: collection.description,
      status: collection.status,
      coverUrl: coverFor(collection),
      mealCount: stats.total,
      byMealType: stats.byMealType,
    };
  });

  return <MyCollections collections={rows} />;
}
