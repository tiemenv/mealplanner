import "server-only";
import { del } from "@vercel/blob";

import { dbConnect } from "@/lib/mongoose";
import {
  DELETED_USER_SENTINEL,
  groupMembershipFrom,
  planGroupTransition,
  unreferencedBlobUrls,
} from "@/lib/account-deletion";
import { Collection } from "@/models/Collection";
import { Group, type GroupDoc } from "@/models/Group";
import { Invite } from "@/models/Invite";
import { Meal } from "@/models/Meal";
import { MealPlan } from "@/models/MealPlan";
import { UserProfile, type UserProfileDoc } from "@/models/UserProfile";

/** Every image the departing account could be the last owner of. Gathered
 *  before the records go, because afterwards there is nothing left to read the
 *  URLs off. */
async function collectBlobCandidates(
  personalKey: string,
  clerkId: string,
  doomedGroupKey: string | null
): Promise<string[]> {
  const ownerKeys = doomedGroupKey
    ? [personalKey, doomedGroupKey]
    : [personalKey];

  const [meals, collections] = await Promise.all([
    Meal.find({ ownerKey: { $in: ownerKeys } })
      .select("imageUrl")
      .lean() as Promise<{ imageUrl?: string }[]>,
    Collection.find({ creatorClerkId: clerkId })
      .select("coverImageUrl meals.imageUrl")
      .lean() as Promise<
      { coverImageUrl?: string; meals?: { imageUrl?: string }[] }[]
    >,
  ]);

  const urls: string[] = [];
  for (const meal of meals) if (meal.imageUrl) urls.push(meal.imageUrl);
  for (const collection of collections) {
    if (collection.coverImageUrl) urls.push(collection.coverImageUrl);
    for (const meal of collection.meals ?? []) {
      if (meal.imageUrl) urls.push(meal.imageUrl);
    }
  }

  return urls;
}

/** Which of those URLs anything still points at, once the deletes have run. */
async function survivingReferences(candidates: string[]): Promise<string[]> {
  if (candidates.length === 0) return [];

  const [meals, collections] = await Promise.all([
    Meal.find({ imageUrl: { $in: candidates } })
      .select("imageUrl")
      .lean() as Promise<{ imageUrl?: string }[]>,
    Collection.find({
      $or: [
        { coverImageUrl: { $in: candidates } },
        { "meals.imageUrl": { $in: candidates } },
      ],
    })
      .select("coverImageUrl meals.imageUrl")
      .lean() as Promise<
      { coverImageUrl?: string; meals?: { imageUrl?: string }[] }[]
    >,
  ]);

  const refs: string[] = [];
  for (const meal of meals) if (meal.imageUrl) refs.push(meal.imageUrl);
  for (const collection of collections) {
    if (collection.coverImageUrl) refs.push(collection.coverImageUrl);
    for (const meal of collection.meals ?? []) {
      if (meal.imageUrl) refs.push(meal.imageUrl);
    }
  }

  return refs;
}

export interface PurgeRequest {
  clerkId: string;
  /** `user.deleted` does not carry one, so the stored profile is the usual
   *  source. Accepted for callers that already know it. */
  email?: string;
}

/**
 * Removes everything an account owns: its records, its group membership, and
 * its uploads. The Clerk user is already gone by the time this runs — Clerk
 * deletes it first and reports the fact through the webhook.
 *
 * Written to be re-runnable, because Clerk redelivers a webhook until it is
 * answered with a 2xx. Every step is either a delete that no longer matches
 * anything or an update that has already been applied, so a redelivery after a
 * partial run finishes the job instead of doubling it. The profile goes last
 * for the same reason: while it survives, a retry can still find the group.
 */
export async function purgeAccountData({
  clerkId,
  email,
}: PurgeRequest): Promise<void> {
  await dbConnect();

  const personalKey = `user:${clerkId}`;

  const profile = (await UserProfile.findOne({
    clerkId,
  }).lean()) as UserProfileDoc | null;

  const inviteEmail = (email ?? profile?.email ?? "").trim().toLowerCase();

  const group = profile?.groupId
    ? ((await Group.findById(profile.groupId).lean()) as GroupDoc | null)
    : null;

  const transition = planGroupTransition(
    groupMembershipFrom(profile, group),
    clerkId
  );

  const candidates = await collectBlobCandidates(
    personalKey,
    clerkId,
    transition.kind === "delete" ? `group:${transition.groupId}` : null
  );

  await Meal.deleteMany({ ownerKey: personalKey });
  await MealPlan.deleteMany({ ownerKey: personalKey });
  await Collection.deleteMany({ creatorClerkId: clerkId });
  // An empty address would match nothing useful and every invite has one, so
  // only filter when there is something to filter on.
  if (inviteEmail) await Invite.deleteMany({ email: inviteEmail });

  if (transition.kind === "delete") {
    const groupKey = `group:${transition.groupId}`;
    await Meal.deleteMany({ ownerKey: groupKey });
    await MealPlan.deleteMany({ ownerKey: groupKey });
    await Invite.deleteMany({ groupId: transition.groupId });
    await Group.deleteOne({ _id: transition.groupId });
  } else if (transition.kind === "reassign") {
    await Group.updateOne(
      { _id: transition.groupId },
      {
        $set: {
          memberClerkIds: transition.remainingMemberClerkIds,
          ownerClerkId: transition.nextOwnerClerkId,
        },
      }
    );

    // The shared library belongs to the members who stay, so it survives — but
    // nothing in it should still name the account that asked to be forgotten.
    const groupKey = `group:${transition.groupId}`;
    await Meal.updateMany(
      { ownerKey: groupKey, createdByClerkId: clerkId },
      { $set: { createdByClerkId: DELETED_USER_SENTINEL } }
    );
    await MealPlan.updateMany(
      { ownerKey: groupKey, createdByClerkId: clerkId },
      { $set: { createdByClerkId: DELETED_USER_SENTINEL } }
    );
    await Invite.updateMany(
      { groupId: transition.groupId, invitedByClerkId: clerkId },
      { $set: { invitedByClerkId: DELETED_USER_SENTINEL, invitedByName: "" } }
    );
  }

  // Safety net for drift: a roster that still lists them while their profile
  // pointed somewhere else.
  await Group.updateMany(
    { memberClerkIds: clerkId },
    { $pull: { memberClerkIds: clerkId } }
  );
  await UserProfile.deleteOne({ clerkId });

  const removable = unreferencedBlobUrls(
    candidates,
    await survivingReferences(candidates)
  );
  if (removable.length > 0) {
    try {
      await del(removable);
    } catch (err) {
      // The records these backed are already gone, so the deletion the user
      // asked for has happened. Reporting a failure here would only make Clerk
      // redeliver a webhook whose database work is complete.
      console.error("[account-deletion] blob cleanup failed", err);
    }
  }
}
