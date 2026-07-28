"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChefHat,
  Loader2,
  Pencil,
  Plus,
  UtensilsCrossed,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import type { CollectionMeal, MealCollection } from "@/lib/collections";
import {
  importCollection,
  importCollectionMeal,
} from "@/app/(app)/collections/actions";

interface Props {
  collection: MealCollection;
  /** Keys of meals the library already has. */
  added: string[];
  workspaceLabel: string;
  /** The viewer curated this one, so they get the editing entry point. */
  isOwner: boolean;
  /** Resolved server-side, so it already falls back to a meal's photo. */
  coverUrl: string;
}

export function CollectionDetail({
  collection,
  added,
  workspaceLabel,
  isOwner,
  coverUrl,
}: Props) {
  const [inLibrary, setInLibrary] = useState(() => new Set(added));
  const [addingAll, startAddAll] = useTransition();
  // Tracked per meal so one slow request cannot lock every other button.
  const [adding, setAdding] = useState<string | null>(null);
  const [preview, setPreview] = useState<CollectionMeal | null>(null);

  const remaining = collection.meals.length - inLibrary.size;

  function handleAddAll() {
    startAddAll(async () => {
      const res = await importCollection(collection.slug);
      if (!res.ok) {
        toast.error(res.error ?? "Couldn't add that collection.");
        return;
      }
      setInLibrary(new Set(collection.meals.map((meal) => meal.key)));
      if (res.added === 0) {
        toast.info("Everything in this collection is already in your library.");
      } else {
        toast.success(
          res.skipped
            ? `Added ${res.added} meals. ${res.skipped} were already in your library.`
            : `Added ${res.added} meals to ${workspaceLabel}.`
        );
      }
    });
  }

  async function handleAddOne(meal: CollectionMeal) {
    setAdding(meal.key);
    const res = await importCollectionMeal(collection.slug, meal.key);
    setAdding(null);

    if (!res.ok) {
      toast.error(res.error ?? "Couldn't add that meal.");
      return;
    }
    setInLibrary((current) => new Set(current).add(meal.key));
    toast.success(
      res.added ? `Added ${meal.name}.` : `${meal.name} was already saved.`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          render={<Link href="/collections" />}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> All collections
        </Button>
        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/collections/${collection.slug}/edit`} />}
          >
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        )}
      </div>

      <Card className="overflow-hidden p-0 gap-0">
        <div className="relative h-44 w-full bg-muted sm:h-56">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <UtensilsCrossed className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-semibold">
              {collection.title}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {collection.description}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {collection.status === "draft" && (
                <Badge variant="secondary">Draft — only you can see this</Badge>
              )}
              <Badge variant="secondary">
                {collection.meals.length} meals
              </Badge>
              {collection.cuisine && (
                <Badge variant="outline">{collection.cuisine}</Badge>
              )}
              {collection.creator.name && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ChefHat className="h-3.5 w-3.5" />
                  {collection.creator.name}
                </span>
              )}
            </div>
          </div>
          <Button
            onClick={handleAddAll}
            disabled={
              addingAll || remaining === 0 || collection.meals.length === 0
            }
            className="shrink-0"
          >
            {addingAll ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : remaining === 0 ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {collection.meals.length === 0
              ? "No meals yet"
              : remaining === 0
                ? "All in your library"
                : remaining === collection.meals.length
                  ? `Add all ${remaining} meals`
                  : `Add remaining ${remaining}`}
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collection.meals.map((meal) => {
          const saved = inLibrary.has(meal.key);
          const busy = adding === meal.key;

          return (
            <Card key={meal.key} className="overflow-hidden p-0 gap-0">
              <button
                type="button"
                onClick={() => setPreview(meal)}
                className="block w-full text-left"
              >
                <div className="relative h-36 w-full bg-muted">
                  {meal.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={meal.imageUrl}
                      alt={meal.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <UtensilsCrossed className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute left-2 top-2">
                    <Badge
                      className={
                        meal.diet === "veg"
                          ? "bg-green-600 text-white"
                          : "bg-rose-600 text-white"
                      }
                    >
                      {meal.diet === "veg" ? "Veg" : "Non-veg"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <h3 className="font-medium leading-tight">{meal.name}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {meal.cuisine && (
                      <Badge variant="outline">{meal.cuisine}</Badge>
                    )}
                    {meal.mealTypes.map((type) => (
                      <Badge key={type} variant="secondary">
                        {MEAL_TYPE_LABELS[type]}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {meal.ingredients.length} ingredients ·{" "}
                    {meal.recipe.split("\n").length} steps
                  </p>
                </div>
              </button>

              <div className="px-4 pb-4">
                <Button
                  variant={saved ? "outline" : "default"}
                  className="w-full"
                  disabled={saved || busy}
                  onClick={() => handleAddOne(meal)}
                >
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : saved ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {saved ? "In your library" : "Add to library"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={preview !== null}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{preview.name}</DialogTitle>
                <DialogDescription>
                  {[
                    preview.cuisine,
                    preview.diet === "veg" ? "Vegetarian" : "Non-veg",
                    preview.mealTypes
                      .map((type) => MEAL_TYPE_LABELS[type])
                      .join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Ingredients</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {preview.ingredients.map((ingredient) => (
                      <li key={ingredient}>{ingredient}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Method</h4>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {preview.recipe.split("\n").map((step) => (
                      <p key={step}>{step}</p>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                disabled={inLibrary.has(preview.key) || adding === preview.key}
                onClick={() => handleAddOne(preview)}
              >
                {adding === preview.key ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : inLibrary.has(preview.key) ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {inLibrary.has(preview.key)
                  ? "In your library"
                  : "Add to library"}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
