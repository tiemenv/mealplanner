import type { Diet, MealType } from "@/lib/constants";

export interface MealView {
  id: string;
  name: string;
  diet: Diet;
  mealTypes: MealType[];
  cuisine: string;
  imageUrl: string;
  ingredients: string[];
  recipe: string;
  recipeUrl: string;
}

export interface SlotView {
  day: number; // 0 = Monday
  mealType: MealType;
  mealId: string | null;
  locked: boolean;
}

export interface MealPlanView {
  id: string;
  weekStart: string;
  vegPercent: number;
  slots: SlotView[];
}

export interface MemberView {
  clerkId: string;
  name: string;
  email: string;
  imageUrl: string;
  isOwner: boolean;
}

export interface InviteView {
  id: string;
  groupId: string;
  groupName: string;
  email: string;
  invitedByName: string;
}
