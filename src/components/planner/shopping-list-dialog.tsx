"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, ShoppingCart, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildShoppingList,
  shoppingListToText,
  BASE_SERVINGS,
  type UnitSystem,
} from "@/lib/shopping";
import type { MealView } from "@/lib/types";

export function ShoppingListDialog({
  open,
  onOpenChange,
  plannedMeals,
  householdSize,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plannedMeals: MealView[];
  householdSize: number;
}) {
  const [system, setSystem] = useState<UnitSystem>("metric");
  const [copied, setCopied] = useState(false);

  const items = useMemo(
    () => buildShoppingList(plannedMeals, system, householdSize),
    [plannedMeals, system, householdSize]
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(shoppingListToText(items));
      setCopied(true);
      toast.success("Shopping list copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> Shopping list
          </DialogTitle>
          <DialogDescription>
            {plannedMeals.length} dish
            {plannedMeals.length === 1 ? "" : "es"} · scaled for {householdSize}{" "}
            {householdSize === 1 ? "person" : "people"} (recipes assume{" "}
            {BASE_SERVINGS} servings).
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-md border p-0.5">
            {(["metric", "imperial"] as UnitSystem[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSystem(s)}
                className={cn(
                  "rounded px-3 py-1 text-sm font-medium capitalize transition-colors",
                  system === s
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copy}
            disabled={items.length === 0}
          >
            {copied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Copy
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No ingredients found. Add ingredients to the meals in this plan.
          </p>
        ) : (
          <ul className="-mx-2 divide-y overflow-y-auto">
            {items.map((item) => (
              <li
                key={`${item.name}-${item.amount}`}
                className="flex items-center justify-between gap-3 px-2 py-2 text-sm"
              >
                <span className="font-medium">{item.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {item.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
