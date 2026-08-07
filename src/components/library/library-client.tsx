"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Sparkles, UtensilsCrossed } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MealCard } from "@/components/library/meal-card";
import { MealFormDialog } from "@/components/library/meal-form-dialog";
import type { MealView } from "@/lib/types";

export function LibraryClient({
  meals,
  cuisines,
  collectionCount,
  workspaceLabel,
}: {
  meals: MealView[];
  cuisines: string[];
  /** Collections this viewer could browse. Only meaningful while the library
   *  is empty, which is the one place it is read. */
  collectionCount: number;
  workspaceLabel: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MealView | null>(null);
  const [query, setQuery] = useState("");

  const hasCollections = collectionCount > 0;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return meals;
    return meals.filter((m) => m.name.toLowerCase().includes(needle));
  }, [meals, query]);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(meal: MealView) {
    setEditing(meal);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meal library</h1>
          <p className="text-sm text-muted-foreground">
            {meals.length} meal{meals.length === 1 ? "" : "s"} in{" "}
            {workspaceLabel}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add meal
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search meals…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <UtensilsCrossed className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">
            {meals.length === 0 ? "No meals yet" : "No meals match your search"}
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            {meals.length === 0
              ? hasCollections
                ? "Start from a ready-made collection, or add your own."
                : "Add your first meal and the planner can build a week from it."
              : "Try a different search term."}
          </p>
          {meals.length === 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              {/* Collections is only worth leading with when it has something
                  to show; otherwise it is a dead end for a new account. */}
              {hasCollections && (
                <ButtonLink href="/collections">
                  <Sparkles className="mr-2 h-4 w-4" /> Browse collections
                </ButtonLink>
              )}
              <Button
                variant={hasCollections ? "outline" : "default"}
                onClick={openAdd}
              >
                <Plus className="mr-2 h-4 w-4" /> Add your first meal
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setQuery("")}>
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2 lg:grid-cols-3">
          {filtered.map((meal) => (
            <MealCard key={meal.id} meal={meal} onEdit={openEdit} />
          ))}
        </div>
      )}

      <MealFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        meal={editing}
        cuisines={cuisines}
      />
    </div>
  );
}
