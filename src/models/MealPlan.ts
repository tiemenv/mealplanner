import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";
import { MEAL_TYPES } from "@/lib/constants";

const SlotSchema = new Schema(
  {
    day: { type: Number, required: true, min: 0, max: 6 }, // 0 = Monday
    mealType: { type: String, enum: MEAL_TYPES, required: true },
    mealId: { type: Schema.Types.ObjectId, ref: "Meal", default: null },
    locked: { type: Boolean, default: false },
  },
  { _id: false }
);

const MealPlanSchema = new Schema(
  {
    ownerKey: { type: String, required: true, index: true },
    // ISO date (yyyy-mm-dd) of the Monday that starts this week.
    weekStart: { type: String, required: true, index: true },
    vegPercent: { type: Number, default: 50, min: 0, max: 100 },
    slots: { type: [SlotSchema], default: [] },
    createdByClerkId: { type: String, required: true },
  },
  { timestamps: true }
);

MealPlanSchema.index({ ownerKey: 1, weekStart: 1 }, { unique: true });

export type MealPlanDoc = InferSchemaType<typeof MealPlanSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const MealPlan = models.MealPlan || model("MealPlan", MealPlanSchema);
