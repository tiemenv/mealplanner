"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  MoreVertical,
  Pencil,
  Trash2,
  UtensilsCrossed,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import type { MealView } from "@/lib/types";
import { deleteMeal } from "@/app/(app)/library/actions";

export function MealCard({
  meal,
  onEdit,
}: {
  meal: MealView;
  onEdit: (meal: MealView) => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${meal.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteMeal(meal.id);
      if (res.ok) toast.success("Meal deleted");
      else toast.error(res.error ?? "Failed to delete");
    });
  }

  return (
    <Card className="overflow-hidden p-0 gap-0">
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
        <div className="absolute right-2 top-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7"
                  disabled={pending}
                />
              }
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(meal)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
          {meal.mealTypes.map((t) => (
            <Badge key={t} variant="secondary">
              {MEAL_TYPE_LABELS[t]}
            </Badge>
          ))}
        </div>
        {meal.recipeUrl && (
          <a
            href={meal.recipeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Recipe link
          </a>
        )}
      </div>
    </Card>
  );
}
