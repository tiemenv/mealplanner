import Link from "next/link";
import { ChefHat, Pencil, Plus, Sparkles, UtensilsCrossed } from "lucide-react";
import { dbConnect } from "@/lib/mongoose";
import { Meal } from "@/models/Meal";
import { getSession } from "@/lib/workspace";
import { listCollections, summarize, coverFor } from "@/lib/collections";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const session = await getSession();
  await dbConnect();

  // Published collections, plus the viewer's own drafts if they curate.
  const collections = await listCollections(
    session.isCreator ? session.clerkId : undefined
  );

  // Only the provenance of existing meals is needed here, to tell someone how
  // much of each collection they already hold.
  const owned = (await Meal.find({
    ownerKey: session.workspace.ownerKey,
    sourceCollection: { $ne: "" },
  })
    .select("sourceCollection sourceMealKey")
    .lean()) as { sourceCollection: string; sourceMealKey: string }[];

  const ownedKeys = new Set(
    owned.map((doc) => `${doc.sourceCollection}/${doc.sourceMealKey}`)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold">Collections</h1>
          <p className="text-sm text-muted-foreground">
            Ready-made sets of meals to fill out your library. Add a whole
            collection, or pick through it dish by dish.
          </p>
        </div>
        {session.isCreator && (
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/collections/mine" />}>
              <Pencil className="mr-2 h-4 w-4" /> My collections
            </Button>
            <Button render={<Link href="/collections/new" />}>
              <Plus className="mr-2 h-4 w-4" /> New collection
            </Button>
          </div>
        )}
      </div>

      {collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Sparkles className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No collections yet</p>
          <p className="mb-4 max-w-sm text-sm text-muted-foreground">
            {session.isCreator
              ? "Curate the first one from the meals in your library."
              : "Check back soon — this is where published collections show up."}
          </p>
          {session.isCreator && (
            <Button render={<Link href="/collections/new" />}>
              <Plus className="mr-2 h-4 w-4" /> New collection
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => {
            const stats = summarize(collection);
            const cover = coverFor(collection);
            const have = collection.meals.filter((meal) =>
              ownedKeys.has(`${collection.id}/${meal.key}`)
            ).length;
            const draft = collection.status === "draft";

            return (
              <Card
                key={collection.id}
                className="overflow-hidden p-0 gap-0 transition-shadow hover:shadow-md"
              >
                <Link
                  href={`/collections/${collection.slug}`}
                  className="block"
                >
                  <div className="relative h-40 w-full bg-muted">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <UtensilsCrossed className="h-8 w-8" />
                      </div>
                    )}
                    <div className="absolute right-2 top-2 flex gap-1.5">
                      {draft && <Badge variant="secondary">Your draft</Badge>}
                      {have > 0 && (
                        <Badge className="bg-background/90 text-foreground">
                          {have === stats.total
                            ? "All added"
                            : `${have} of ${stats.total} added`}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="space-y-1">
                      <h2 className="font-medium leading-tight">
                        {collection.title}
                      </h2>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {collection.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{stats.total} meals</Badge>
                      {collection.cuisine && (
                        <Badge variant="outline">{collection.cuisine}</Badge>
                      )}
                      <Badge variant="outline">
                        {stats.veg} veg / {stats.nonveg} non-veg
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {Object.entries(stats.byMealType)
                        .filter(([, count]) => count > 0)
                        .map(
                          ([type, count]) =>
                            `${count} ${MEAL_TYPE_LABELS[
                              type as keyof typeof MEAL_TYPE_LABELS
                            ].toLowerCase()}`
                        )
                        .join(" · ")}
                    </p>

                    {collection.creator.name && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ChefHat className="h-3.5 w-3.5" />
                        {collection.creator.name}
                      </p>
                    )}
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
