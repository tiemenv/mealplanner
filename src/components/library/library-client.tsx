"use client";

import { useMemo, useState } from "react";
import { Plus, Search, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MealCard } from "@/components/library/meal-card";
import { MealFormDialog } from "@/components/library/meal-form-dialog";
import { MEAL_TYPES, MEAL_TYPE_LABELS } from "@/lib/constants";
import type { MealView } from "@/lib/types";

export function LibraryClient({
  meals,
  cuisines,
  workspaceLabel,
}: {
  meals: MealView[];
  cuisines: string[];
  workspaceLabel: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MealView | null>(null);
  const [query, setQuery] = useState("");
  const [dietFilter, setDietFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [cuisineFilter, setCuisineFilter] = useState("all");

  const filtered = useMemo(() => {
    return meals.filter((m) => {
      if (query && !m.name.toLowerCase().includes(query.toLowerCase()))
        return false;
      if (dietFilter !== "all" && m.diet !== dietFilter) return false;
      if (typeFilter !== "all" && !m.mealTypes.includes(typeFilter as never))
        return false;
      if (cuisineFilter !== "all" && m.cuisine !== cuisineFilter) return false;
      return true;
    });
  }, [meals, query, dietFilter, typeFilter, cuisineFilter]);

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

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meals…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={dietFilter}
          onValueChange={(v) => setDietFilter(v ?? "all")}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All diets</SelectItem>
            <SelectItem value="veg">Vegetarian</SelectItem>
            <SelectItem value="nonveg">Non-veg</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v ?? "all")}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All meals</SelectItem>
            {MEAL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {MEAL_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {cuisines.length > 0 && (
          <Select
            value={cuisineFilter}
            onValueChange={(v) => setCuisineFilter(v ?? "all")}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cuisines</SelectItem>
              {cuisines.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <UtensilsCrossed className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">
            {meals.length === 0 ? "No meals yet" : "No meals match your filters"}
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            {meals.length === 0
              ? "Add your favourite meals to start planning."
              : "Try clearing a filter."}
          </p>
          {meals.length === 0 && (
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" /> Add your first meal
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
