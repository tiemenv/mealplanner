"use client";

import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function MealTypeSelect({
  value,
  onChange,
}: {
  value: MealType[];
  onChange: (value: MealType[]) => void;
}) {
  const toggle = (type: MealType) => {
    if (value.includes(type)) {
      onChange(value.filter((t) => t !== type));
    } else {
      onChange([...value, type]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {MEAL_TYPES.map((type) => {
        const active = value.includes(type);
        return (
          <button
            key={type}
            type="button"
            onClick={() => toggle(type)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-muted"
            )}
          >
            {active && <Check className="h-3.5 w-3.5" />}
            {MEAL_TYPE_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
