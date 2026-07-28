import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";
import { DIETS, MEAL_TYPES } from "@/lib/constants";

/** Meals are copied into the collection rather than referenced. A published
 *  collection has to keep working after the creator edits or deletes the meal
 *  it came from, and its readers must not see it change under them.
 *  `sourceMealId` records where it came from so refreshing stays possible. */
const CollectionMealSchema = new Schema(
  {
    // Stable within the collection; used to de-dupe imports and as a React key.
    key: { type: String, required: true },
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
    sourceMealId: { type: Schema.Types.ObjectId, default: null },
  },
  { _id: false }
);

const CollectionSchema = new Schema(
  {
    // Generated from the title at creation and never regenerated, so links
    // survive a rename.
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    cuisine: { type: String, default: "", trim: true },
    coverImageUrl: { type: String, default: "" },
    // Drafts are visible only to their creator.
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },
    creatorClerkId: { type: String, required: true, index: true },
    // Copied from the profile so the byline survives without a second lookup.
    creatorName: { type: String, default: "" },
    creatorImageUrl: { type: String, default: "" },
    meals: { type: [CollectionMealSchema], default: [] },
  },
  { timestamps: true }
);

export type CollectionDoc = InferSchemaType<typeof CollectionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type CollectionStatus = "draft" | "published";

export const Collection =
  models.Collection || model("Collection", CollectionSchema);
