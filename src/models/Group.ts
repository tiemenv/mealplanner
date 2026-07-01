import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const GroupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerClerkId: { type: String, required: true, index: true },
    memberClerkIds: { type: [String], default: [] },
    householdSize: { type: Number, default: 2, min: 1, max: 50 },
  },
  { timestamps: true }
);

export type GroupDoc = InferSchemaType<typeof GroupSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Group = models.Group || model("Group", GroupSchema);
