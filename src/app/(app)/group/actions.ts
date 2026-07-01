"use server";

import { revalidatePath } from "next/cache";
import { dbConnect } from "@/lib/mongoose";
import { getSession } from "@/lib/workspace";
import { Group, type GroupDoc } from "@/models/Group";
import { Invite, type InviteDoc } from "@/models/Invite";
import { UserProfile } from "@/models/UserProfile";
import { Meal } from "@/models/Meal";
import { MealPlan } from "@/models/MealPlan";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function revalidateAll() {
  revalidatePath("/group");
  revalidatePath("/dashboard");
  revalidatePath("/library");
  revalidatePath("/planner");
}

export async function setHouseholdSize(size: number): Promise<ActionResult> {
  const session = await getSession();
  const n = Math.round(size);
  if (!Number.isFinite(n) || n < 1 || n > 50) {
    return { ok: false, error: "Enter a household size between 1 and 50." };
  }

  await dbConnect();
  if (session.workspace.type === "group" && session.workspace.group) {
    await Group.updateOne(
      { _id: session.workspace.group.id },
      { $set: { householdSize: n } }
    );
  } else {
    await UserProfile.updateOne(
      { clerkId: session.clerkId },
      { $set: { householdSize: n } }
    );
  }

  revalidateAll();
  return { ok: true };
}

export async function createGroup(name: string): Promise<ActionResult> {
  const session = await getSession();
  if (session.workspace.type === "group") {
    return { ok: false, error: "Leave your current group first." };
  }
  if (!name?.trim()) return { ok: false, error: "Group name is required." };

  await dbConnect();
  const group = await Group.create({
    name: name.trim(),
    ownerClerkId: session.clerkId,
    memberClerkIds: [session.clerkId],
  });

  await UserProfile.updateOne(
    { clerkId: session.clerkId },
    { $set: { groupId: group._id } }
  );

  revalidateAll();
  return { ok: true };
}

export async function inviteMember(email: string): Promise<ActionResult> {
  const session = await getSession();
  if (session.workspace.type !== "group" || !session.workspace.group) {
    return { ok: false, error: "Create or join a group first." };
  }

  const clean = email?.trim().toLowerCase();
  if (!clean || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (clean === session.email) {
    return { ok: false, error: "You're already in this group." };
  }

  await dbConnect();
  const groupId = session.workspace.group.id;

  // Already a member?
  const member = await UserProfile.findOne({
    email: clean,
    groupId,
  }).lean();
  if (member) return { ok: false, error: "That person is already a member." };

  try {
    await Invite.findOneAndUpdate(
      { groupId, email: clean },
      {
        $set: {
          status: "pending",
          groupName: session.workspace.group.name,
          invitedByClerkId: session.clerkId,
          invitedByName: session.name,
        },
        $setOnInsert: { groupId, email: clean },
      },
      { upsert: true, new: true }
    );
  } catch {
    return { ok: false, error: "Could not create invite." };
  }

  revalidateAll();
  return { ok: true };
}

export async function acceptInvite(inviteId: string): Promise<ActionResult> {
  const session = await getSession();
  if (session.workspace.type === "group") {
    return {
      ok: false,
      error: "Leave your current group before joining another.",
    };
  }

  await dbConnect();
  const invite = (await Invite.findById(inviteId).lean()) as InviteDoc | null;
  if (!invite || invite.email !== session.email) {
    return { ok: false, error: "Invite not found." };
  }
  if (invite.status !== "pending") {
    return { ok: false, error: "This invite is no longer valid." };
  }

  const group = (await Group.findById(invite.groupId).lean()) as GroupDoc | null;
  if (!group) {
    await Invite.updateOne({ _id: inviteId }, { $set: { status: "declined" } });
    return { ok: false, error: "That group no longer exists." };
  }

  await Group.updateOne(
    { _id: group._id },
    { $addToSet: { memberClerkIds: session.clerkId } }
  );
  await UserProfile.updateOne(
    { clerkId: session.clerkId },
    { $set: { groupId: group._id } }
  );
  await Invite.updateOne({ _id: inviteId }, { $set: { status: "accepted" } });

  revalidateAll();
  return { ok: true };
}

export async function declineInvite(inviteId: string): Promise<ActionResult> {
  const session = await getSession();
  await dbConnect();
  await Invite.updateOne(
    { _id: inviteId, email: session.email },
    { $set: { status: "declined" } }
  );
  revalidateAll();
  return { ok: true };
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  const session = await getSession();
  if (session.workspace.type !== "group" || !session.workspace.group) {
    return { ok: false, error: "Not in a group." };
  }
  await dbConnect();
  await Invite.deleteOne({
    _id: inviteId,
    groupId: session.workspace.group.id,
  });
  revalidateAll();
  return { ok: true };
}

export async function leaveGroup(): Promise<ActionResult> {
  const session = await getSession();
  if (session.workspace.type !== "group" || !session.workspace.group) {
    return { ok: false, error: "You're not in a group." };
  }

  await dbConnect();
  const groupId = session.workspace.group.id;
  const remaining = session.workspace.group.memberClerkIds.filter(
    (id) => id !== session.clerkId
  );

  await UserProfile.updateOne(
    { clerkId: session.clerkId },
    { $set: { groupId: null } }
  );

  if (remaining.length === 0) {
    // Last member out — clean up the shared group and its data.
    await Meal.deleteMany({ ownerKey: `group:${groupId}` });
    await MealPlan.deleteMany({ ownerKey: `group:${groupId}` });
    await Invite.deleteMany({ groupId });
    await Group.deleteOne({ _id: groupId });
  } else {
    const update: Record<string, unknown> = {
      $set: { memberClerkIds: remaining },
    };
    // Transfer ownership if the owner is leaving.
    if (session.workspace.group.ownerClerkId === session.clerkId) {
      (update.$set as Record<string, unknown>).ownerClerkId = remaining[0];
    }
    await Group.updateOne({ _id: groupId }, update);
  }

  revalidateAll();
  return { ok: true };
}

export async function removeMember(clerkId: string): Promise<ActionResult> {
  const session = await getSession();
  if (session.workspace.type !== "group" || !session.workspace.group) {
    return { ok: false, error: "Not in a group." };
  }
  if (session.workspace.group.ownerClerkId !== session.clerkId) {
    return { ok: false, error: "Only the group owner can remove members." };
  }
  if (clerkId === session.clerkId) {
    return { ok: false, error: "Use “Leave group” to remove yourself." };
  }

  await dbConnect();
  const groupId = session.workspace.group.id;
  await Group.updateOne(
    { _id: groupId },
    { $pull: { memberClerkIds: clerkId } }
  );
  await UserProfile.updateOne(
    { clerkId, groupId },
    { $set: { groupId: null } }
  );

  revalidateAll();
  return { ok: true };
}
