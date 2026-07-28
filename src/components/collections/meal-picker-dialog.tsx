"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Search, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MealView } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The creator's whole library. */
  meals: MealView[];
  /** Library ids already snapshotted into the collection. */
  alreadyIn: string[];
  onConfirm: (mealIds: string[]) => Promise<void>;
}

/** Picks meals out of the creator's library. Multi-select, because building a
 *  collection one round-trip per dish would be tedious. */
export function MealPickerDialog({
  open,
  onOpenChange,
  meals,
  alreadyIn,
  onConfirm,
}: Props) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const inCollection = useMemo(() => new Set(alreadyIn), [alreadyIn]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return meals;
    return meals.filter(
      (meal) =>
        meal.name.toLowerCase().includes(needle) ||
        meal.cuisine.toLowerCase().includes(needle)
    );
  }, [meals, query]);

  const available = filtered.filter((meal) => !inCollection.has(meal.id));

  function toggle(id: string) {
    setPicked((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }

  async function handleConfirm() {
    setSaving(true);
    await onConfirm(picked);
    setSaving(false);
    setPicked([]);
    setQuery("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPicked([]);
      setQuery("");
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add meals from your library</DialogTitle>
          <DialogDescription>
            Meals are copied in, so editing them later in your library won&apos;t
            change this collection.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your meals…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1">
          {available.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {meals.length === 0
                ? "Your library is empty. Add meals there first."
                : filtered.length === 0
                  ? "No meals match that search."
                  : "Every matching meal is already in this collection."}
            </p>
          ) : (
            available.map((meal) => {
              const selected = picked.includes(meal.id);

              return (
                <button
                  key={meal.id}
                  type="button"
                  onClick={() => toggle(meal.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/60"
                  )}
                >
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
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
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  {selected && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving || picked.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add {picked.length > 0 && <Badge className="ml-2">{picked.length}</Badge>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
