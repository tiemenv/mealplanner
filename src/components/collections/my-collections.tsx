"use client";

import { Pencil, Plus, Sparkles, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import type { MealType } from "@/lib/constants";

export interface MyCollectionRow {
  slug: string;
  title: string;
  description: string;
  status: "draft" | "published";
  /** Resolved server-side, so it already falls back to a meal's photo. */
  coverUrl: string;
  mealCount: number;
  byMealType: Record<MealType, number>;
}

export function MyCollections({
  collections,
}: {
  collections: MyCollectionRow[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold">
            My collections
          </h1>
          <p className="text-sm text-muted-foreground">
            Sets of meals from your library, for other people to import.
          </p>
        </div>
        <ButtonLink href="/collections/new">
          <Plus className="mr-2 h-4 w-4" /> New collection
        </ButtonLink>
      </div>

      {collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Sparkles className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Nothing curated yet</p>
          <p className="mb-4 max-w-sm text-sm text-muted-foreground">
            Group meals you already have into a collection — a cuisine, a week of
            dinners, whatever hangs together — and publish it.
          </p>
          <ButtonLink href="/collections/new">
            <Plus className="mr-2 h-4 w-4" /> New collection
          </ButtonLink>
        </div>
      ) : (
        <div className="space-y-3">
          {collections.map((collection) => (
            <Card
              key={collection.slug}
              className="flex-row items-center gap-4 p-3"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                {collection.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={collection.coverUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <UtensilsCrossed className="h-5 w-5" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{collection.title}</p>
                  <Badge
                    variant={
                      collection.status === "published" ? "default" : "secondary"
                    }
                  >
                    {collection.status === "published" ? "Published" : "Draft"}
                  </Badge>
                </div>
                <p className="line-clamp-1 text-sm text-muted-foreground">
                  {collection.description || "No description yet."}
                </p>
                <p className="text-xs text-muted-foreground">
                  {collection.mealCount} meal
                  {collection.mealCount === 1 ? "" : "s"}
                  {Object.entries(collection.byMealType)
                    .filter(([, count]) => count > 0)
                    .map(
                      ([type, count]) =>
                        ` · ${count} ${MEAL_TYPE_LABELS[
                          type as MealType
                        ].toLowerCase()}`
                    )
                    .join("")}
                </p>
              </div>

              <ButtonLink
                variant="outline"
                size="sm"
                className="shrink-0"
                href={`/collections/${collection.slug}/edit`}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </ButtonLink>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
