import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const InviteSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    groupName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, index: true },
    invitedByClerkId: { type: String, required: true },
    invitedByName: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

InviteSchema.index({ groupId: 1, email: 1 }, { unique: true });

export type InviteDoc = InferSchemaType<typeof InviteSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Invite = models.Invite || model("Invite", InviteSchema);
