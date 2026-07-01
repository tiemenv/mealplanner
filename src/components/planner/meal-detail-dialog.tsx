"use client";

import { ExternalLink, UtensilsCrossed } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import type { MealView } from "@/lib/types";

export function MealDetailDialog({
  meal,
  open,
  onOpenChange,
}: {
  meal: MealView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {meal && (
          <>
            {meal.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={meal.imageUrl}
                alt={meal.name}
                className="-mx-6 -mt-6 mb-1 h-48 w-[calc(100%+3rem)] max-w-none object-cover"
              />
            )}
            <DialogHeader>
              <DialogTitle>{meal.name}</DialogTitle>
            </DialogHeader>

            <div className="flex flex-wrap gap-1.5">
              <Badge
                className={
                  meal.diet === "veg"
                    ? "bg-green-600 text-white"
                    : "bg-rose-600 text-white"
                }
              >
                {meal.diet === "veg" ? "Vegetarian" : "Non-veg"}
              </Badge>
              {meal.cuisine && <Badge variant="outline">{meal.cuisine}</Badge>}
              {meal.mealTypes.map((t) => (
                <Badge key={t} variant="secondary">
                  {MEAL_TYPE_LABELS[t]}
                </Badge>
              ))}
            </div>

            {meal.ingredients.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Ingredients</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {meal.ingredients.map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>
              </section>
            )}

            {meal.recipe && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Recipe</h3>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {meal.recipe}
                </p>
              </section>
            )}

            {meal.recipeUrl && (
              <Button
                variant="outline"
                className="w-full"
                render={
                  <a
                    href={meal.recipeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <ExternalLink className="mr-2 h-4 w-4" /> Open recipe link
              </Button>
            )}

            {!meal.ingredients.length &&
              !meal.recipe &&
              !meal.recipeUrl && (
                <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                  <UtensilsCrossed className="h-6 w-6" />
                  No recipe, ingredients or link added yet.
                </div>
              )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
