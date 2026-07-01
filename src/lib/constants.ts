export const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const DIETS = ["veg", "nonveg"] as const;
export type Diet = (typeof DIETS)[number];

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
export type DayName = (typeof DAYS)[number];

export const DIET_LABELS: Record<Diet, string> = {
  veg: "Vegetarian",
  nonveg: "Non-veg",
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};
