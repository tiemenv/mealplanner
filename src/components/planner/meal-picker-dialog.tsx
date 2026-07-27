"use client";

import { useMemo, useState } from "react";
import { CircleDashed, Search, UtensilsCrossed } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MEAL_TYPE_LABELS, type MealType } from "@/lib/constants";
import type { MealView } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MealPickerDialog({
  open,
  onOpenChange,
  meals,
  mealType,
  slotLabel,
  onSelect,
  onWildcard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meals: MealView[];
  mealType: MealType | null;
  /** e.g. "Monday · Breakfast", shown under the title. */
  slotLabel: string;
  onSelect: (mealId: string) => void;
  onWildcard: () => void;
}) {
  const [query, setQuery] = useState("");
  const [typeOnly, setTypeOnly] = useState(true);
  const [lastOpen, setLastOpen] = useState(open);

  // Every slot starts from a clean search and the meal type filter back on.
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setQuery("");
      setTypeOnly(true);
    }
  }

  const sorted = useMemo(
    () => [...meals].sort((a, b) => a.name.localeCompare(b.name)),
    [meals]
  );

  const forType = useMemo(
    () =>
      mealType ? sorted.filter((m) => m.mealTypes.includes(mealType)) : sorted,
    [sorted, mealType]
  );

  const filtered = useMemo(() => {
    const pool = typeOnly ? forType : sorted;
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.cuisine.toLowerCase().includes(q)
    );
  }, [typeOnly, forType, sorted, query]);

  const typeLabel = mealType ? MEAL_TYPE_LABELS[mealType] : "";
  const hiddenByType = sorted.length - forType.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a meal</DialogTitle>
          <DialogDescription>{slotLabel}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library…"
            className="pl-8"
          />
        </div>

        {mealType && hiddenByType > 0 && (
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant={typeOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeOnly((v) => !v)}
            >
              {typeLabel} only
            </Button>
            <span className="text-xs text-muted-foreground">
              {typeOnly
                ? `${hiddenByType} other meal${hiddenByType === 1 ? "" : "s"} hidden`
                : `Showing all ${sorted.length} meals`}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onWildcard}
          className="flex w-full items-center gap-3 rounded-md border border-dashed p-2 text-left transition-colors hover:bg-muted"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
            <CircleDashed className="h-4 w-4 text-muted-foreground" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Wildcard</span>
            <span className="block text-xs text-muted-foreground">
              Leave it open — eat out, leftovers, decide later
            </span>
          </span>
        </button>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <UtensilsCrossed className="h-6 w-6" />
            No meals match.
            {typeOnly && hiddenByType > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTypeOnly(false)}
              >
                Show all meal types
              </Button>
            )}
          </div>
        ) : (
          <ul className="-mx-1 max-h-[45vh] space-y-1 overflow-y-auto px-1">
            {filtered.map((meal) => (
              <li key={meal.id}>
                <button
                  type="button"
                  onClick={() => onSelect(meal.id)}
                  className="flex w-full items-center gap-3 rounded-md border p-2 text-left transition-colors hover:bg-muted"
                >
                  {meal.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={meal.imageUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-sm">
                      🍽
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          meal.diet === "veg" ? "bg-green-600" : "bg-rose-600"
                        )}
                        title={meal.diet === "veg" ? "Veg" : "Non-veg"}
                      />
                      <span className="truncate text-sm font-medium">
                        {meal.name}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {meal.cuisine || "No cuisine"} ·{" "}
                      {meal.mealTypes.map((t) => MEAL_TYPE_LABELS[t]).join(", ")}
                    </span>
                  </span>
                  {mealType && !meal.mealTypes.includes(mealType) && (
                    <Badge variant="outline" className="shrink-0">
                      Not {typeLabel.toLowerCase()}
                    </Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
