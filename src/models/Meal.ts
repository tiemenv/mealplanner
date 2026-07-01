import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";
import { DIETS, MEAL_TYPES } from "@/lib/constants";

const MealSchema = new Schema(
  {
    // Workspace this meal belongs to: "user:<clerkId>" or "group:<groupId>".
    ownerKey: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    diet: { type: String, enum: DIETS, required: true },
    mealTypes: {
      type: [String],
      enum: MEAL_TYPES,
      required: true,
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "Select at least one meal type.",
      },
    },
    cuisine: { type: String, default: "", trim: true },
    imageUrl: { type: String, default: "" },
    ingredients: { type: [String], default: [] },
    recipe: { type: String, default: "" },
    recipeUrl: { type: String, default: "" },
    createdByClerkId: { type: String, required: true },
  },
  { timestamps: true }
);

export type MealDoc = InferSchemaType<typeof MealSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Meal = models.Meal || model("Meal", MealSchema);
