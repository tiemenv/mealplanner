"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Plus,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import {
  CollectionFields,
  type CollectionDetails,
} from "@/components/collections/collection-fields";
import { MealPickerDialog } from "@/components/collections/meal-picker-dialog";
import type { CollectionMeal, MealCollection } from "@/lib/collections";
import type { MealView } from "@/lib/types";
import {
  addMealsToCollection,
  deleteCollection,
  removeMealFromCollection,
  reorderCollectionMeals,
  setCollectionStatus,
  updateCollection,
} from "@/app/(app)/collections/creator-actions";

interface Props {
  collection: MealCollection;
  /** The creator's library, to pick meals from. */
  libraryMeals: MealView[];
  cuisines: string[];
}

export function CollectionEditor({
  collection,
  libraryMeals,
  cuisines,
}: Props) {
  const router = useRouter();
  const [details, setDetails] = useState<CollectionDetails>({
    title: collection.title,
    description: collection.description,
    cuisine: collection.cuisine,
    coverImageUrl: collection.coverImageUrl,
  });
  // Kept locally so removing and reordering feel instant; the server is the
  // source of truth on the next load.
  const [meals, setMeals] = useState<CollectionMeal[]>(collection.meals);
  const [status, setStatus] = useState(collection.status);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const published = status === "published";

  async function handleSaveDetails() {
    setSaving(true);
    const res = await updateCollection(collection.slug, details);
    setSaving(false);

    if (!res.ok) {
      toast.error(res.error ?? "Couldn't save those details.");
      return;
    }
    toast.success("Details saved.");
    router.refresh();
  }

  async function handleAddMeals(mealIds: string[]) {
    const res = await addMealsToCollection(collection.slug, mealIds);
    if (!res.ok) {
      toast.error(res.error ?? "Couldn't add those meals.");
      return;
    }

    setPickerOpen(false);
    toast.success(
      res.added === 1 ? "Added 1 meal." : `Added ${res.added} meals.`
    );
    // The snapshots are built server-side, so the new rows come from a refresh.
    router.refresh();
  }

  async function handleRemove(meal: CollectionMeal) {
    setBusyKey(meal.key);
    const res = await removeMealFromCollection(collection.slug, meal.key);
    setBusyKey(null);

    if (!res.ok) {
      toast.error(res.error ?? "Couldn't remove that meal.");
      return;
    }
    setMeals((current) => current.filter((m) => m.key !== meal.key));
    toast.success(`Removed ${meal.name}.`);
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= meals.length) return;

    const next = [...meals];
    [next[index], next[target]] = [next[target], next[index]];
    setMeals(next);

    const res = await reorderCollectionMeals(
      collection.slug,
      next.map((meal) => meal.key)
    );
    if (!res.ok) {
      setMeals(meals);
      toast.error(res.error ?? "Couldn't save that order.");
    }
  }

  async function handleStatus() {
    const next = published ? "draft" : "published";
    setPublishing(true);
    const res = await setCollectionStatus(collection.slug, next);
    setPublishing(false);

    if (!res.ok) {
      toast.error(res.error ?? "Couldn't change the status.");
      return;
    }
    setStatus(next);
    toast.success(
      next === "published"
        ? "Published. Anyone can add these meals now."
        : "Unpublished. Only you can see it now."
    );
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await deleteCollection(collection.slug);

    if (!res.ok) {
      setDeleting(false);
      toast.error(res.error ?? "Couldn't delete that collection.");
      return;
    }
    toast.success("Collection deleted.");
    router.push("/collections/mine");
  }

  const alreadyIn = meals
    .map((meal) => meal.sourceMealId)
    .filter((id): id is string => Boolean(id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ButtonLink
          variant="ghost"
          size="sm"
          className="-ml-2"
          href="/collections/mine"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> My collections
        </ButtonLink>
        <div className="flex items-center gap-2">
          <Badge variant={published ? "default" : "secondary"}>
            {published ? "Published" : "Draft"}
          </Badge>
          <ButtonLink
            variant="outline"
            size="sm"
            href={`/collections/${collection.slug}`}
          >
            <Eye className="mr-2 h-4 w-4" /> Preview
          </ButtonLink>
        </div>
      </div>

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">
          {collection.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {published
            ? "Live. Edits are visible to everyone as soon as you save them."
            : "A private draft. Publish it when you're happy with the line-up."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Card className="h-fit p-4">
          <div className="space-y-6">
            <CollectionFields
              value={details}
              onChange={setDetails}
              cuisines={cuisines}
              fallbackCoverUrl={meals.find((meal) => meal.imageUrl)?.imageUrl}
            />
            <Button
              onClick={handleSaveDetails}
              disabled={saving || !details.title.trim()}
              className="w-full"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save details
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">
              {meals.length} meal{meals.length === 1 ? "" : "s"}
            </h2>
            <Button size="sm" onClick={() => setPickerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add meals
            </Button>
          </div>

          {meals.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <UtensilsCrossed className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No meals yet</p>
              <p className="mb-4 text-sm text-muted-foreground">
                Pick from your library. A collection needs at least one meal
                before it can be published.
              </p>
              <Button onClick={() => setPickerOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add meals
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {meals.map((meal, index) => (
                <Card key={meal.key} className="flex-row items-center gap-3 p-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {meal.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={meal.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <UtensilsCrossed className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{meal.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        meal.cuisine,
                        meal.diet === "veg" ? "Veg" : "Non-veg",
                        meal.mealTypes
                          .map((type) => MEAL_TYPE_LABELS[type])
                          .join(", "),
                        `${meal.ingredients.length} ingredients`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${meal.name} up`}
                      disabled={index === 0}
                      onClick={() => handleMove(index, -1)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${meal.name} down`}
                      disabled={index === meals.length - 1}
                      onClick={() => handleMove(index, 1)}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${meal.name}`}
                      disabled={busyKey === meal.key}
                      onClick={() => handleRemove(meal)}
                    >
                      {busyKey === meal.key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card className="gap-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {published ? "Unpublish" : "Publish"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {published
                    ? "Hide it again. Meals people already added stay in their libraries."
                    : "Make it visible on Collections for everyone to import."}
                </p>
              </div>
              <Button
                variant={published ? "outline" : "default"}
                onClick={handleStatus}
                disabled={publishing || (!published && meals.length === 0)}
              >
                {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {published ? "Unpublish" : "Publish"}
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div>
                <p className="font-medium">Delete collection</p>
                <p className="text-sm text-muted-foreground">
                  Permanent. Meals in your library are untouched.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <MealPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        meals={libraryMeals}
        alreadyIn={alreadyIn}
        onConfirm={handleAddMeals}
      />

      <Dialog
        open={confirmDelete}
        onOpenChange={(open) => !deleting && setConfirmDelete(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this collection?</DialogTitle>
            <DialogDescription>
              {collection.title} will be gone for good.{" "}
              {published
                ? "Anyone who already imported from it keeps those meals."
                : "Nothing else changes."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
