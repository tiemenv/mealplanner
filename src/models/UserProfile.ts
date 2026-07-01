import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const UserProfileSchema = new Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, index: true },
    name: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    householdSize: { type: Number, default: 2, min: 1, max: 50 },
    // The single group this user currently belongs to (null = personal mode).
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

export type UserProfileDoc = InferSchemaType<typeof UserProfileSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserProfile =
  models.UserProfile || model("UserProfile", UserProfileSchema);
