import { NextResponse, type NextRequest } from "next/server";
import { del } from "@vercel/blob";
import { clerkClient } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongoose";
import { getSession, rejectImpersonators } from "@/lib/workspace";
import {
  DELETED_USER_SENTINEL,
  DELETE_CONFIRMATION_PHRASE,
  isDeleteConfirmed,
  planGroupTransition,
  unreferencedBlobUrls,
  type DeleteAccountResult,
} from "@/lib/account-deletion";
import { Collection } from "@/models/Collection";
import { Group } from "@/models/Group";
import { Invite } from "@/models/Invite";
import { Meal } from "@/models/Meal";
import { MealPlan } from "@/models/MealPlan";
import { UserProfile } from "@/models/UserProfile";

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

function fail(error: string, status: number) {
  return NextResponse.json<DeleteAccountResult>({ ok: false, error }, { status });
}

/**
 * Permanently deletes the signed-in account: their records, their uploads, and
 * finally the Clerk user itself.
 *
 * The Clerk user goes last on purpose. Every step before it is idempotent, so a
 * failure leaves the account able to sign in and run the whole thing again.
 * Deleting the Clerk user first would invert that: a later failure would strand
 * this data in the database with nobody left who could ask for it again.
 */
export async function DELETE(request: NextRequest) {
  const impersonationError = await rejectImpersonators();
  if (impersonationError) return fail(impersonationError, 403);

  let confirmation = "";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "confirmation" in body) {
      const value = (body as { confirmation: unknown }).confirmation;
      if (typeof value === "string") confirmation = value;
    }
  } catch {
    // Left empty so the confirmation check below rejects it.
  }

  if (!isDeleteConfirmed(confirmation)) {
    return fail(`Type ${DELETE_CONFIRMATION_PHRASE} to confirm.`, 400);
  }

  let session;
  try {
    session = await getSession();
  } catch {
    return fail("Sign in to delete your account.", 401);
  }

  const { clerkId, email } = session;
  const personalKey = `user:${clerkId}`;

  await dbConnect();

  const transition = planGroupTransition(
    session.workspace.group
      ? {
          id: session.workspace.group.id,
          ownerClerkId: session.workspace.group.ownerClerkId,
          memberClerkIds: session.workspace.group.memberClerkIds,
        }
      : null,
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
  await Invite.deleteMany({ email });

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
      // asked for has happened. Failing here would only block the Clerk delete.
      console.error("[account] blob cleanup failed", err);
    }
  }

  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(clerkId);
  } catch (err) {
    console.error("[account] Clerk user deletion failed", err);
    return fail(
      "Your data was deleted, but closing your sign-in account failed. Sign in and try again, or contact support.",
      502
    );
  }

  return NextResponse.json<DeleteAccountResult>({ ok: true });
}
