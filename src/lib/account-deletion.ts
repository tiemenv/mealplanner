/**
 * Pure decisions behind account deletion. Kept free of database and network
 * imports so the rules can be unit tested, and so the page that warns about a
 * deletion and the webhook that performs one reach the same conclusion.
 */

/** Stands in for the departed account on records that outlive it, so a
 *  surviving group keeps a valid `createdByClerkId` without still naming a
 *  person who asked to be forgotten. */
export const DELETED_USER_SENTINEL = "deleted-user";

export interface GroupMembership {
  id: string;
  ownerClerkId: string;
  memberClerkIds: string[];
}

/**
 * What deleting an account does to the group it belongs to.
 *
 * `delete` — nobody is left, so the shared library goes with the group.
 * `reassign` — other members remain, so the group and everything it owns
 * survives and only this member is removed.
 */
export type GroupTransition =
  | { kind: "none" }
  | { kind: "delete"; groupId: string }
  | {
      kind: "reassign";
      groupId: string;
      remainingMemberClerkIds: string[];
      /** Unchanged unless the departing member owned the group. */
      nextOwnerClerkId: string;
    };

/**
 * Mirrors `leaveGroup`: a departing member never takes the shared library with
 * them unless they are the last one out, and an owner hands ownership to a
 * remaining member rather than leaving the group unadministrable.
 */
export function planGroupTransition(
  group: GroupMembership | null,
  clerkId: string
): GroupTransition {
  if (!group) return { kind: "none" };

  const remaining = group.memberClerkIds.filter((id) => id !== clerkId);
  if (remaining.length === 0) {
    return { kind: "delete", groupId: group.id };
  }

  return {
    kind: "reassign",
    groupId: group.id,
    remainingMemberClerkIds: remaining,
    nextOwnerClerkId:
      group.ownerClerkId === clerkId ? remaining[0] : group.ownerClerkId,
  };
}

/** Mongo's ObjectId, narrowed to the one thing this module needs of it, so the
 *  rules stay testable without constructing documents. */
interface StoredId {
  toString(): string;
}

export interface StoredProfile {
  groupId?: StoredId | null;
}

export interface StoredGroup {
  _id: StoredId;
  ownerClerkId?: string | null;
  memberClerkIds?: string[] | null;
}

/**
 * The group a departing account belongs to, derived from its stored records
 * rather than from a session — the deletion webhook arrives without one.
 *
 * A `groupId` that no longer resolves counts as no group, the same fallback the
 * workspace makes for a stale reference.
 */
export function groupMembershipFrom(
  profile: StoredProfile | null,
  group: StoredGroup | null
): GroupMembership | null {
  if (!profile?.groupId || !group) return null;

  return {
    id: group._id.toString(),
    ownerClerkId: group.ownerClerkId ?? "",
    memberClerkIds: group.memberClerkIds ?? [],
  };
}

/** Uploads we host and can therefore remove. Meal images are just as often a
 *  link to Unsplash or a video thumbnail, and those are not ours to delete. */
export function isManagedBlobUrl(url: string): boolean {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === "https:" && hostname.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

/**
 * Which of a departing account's images may actually be deleted.
 *
 * Importing a collection copies the image URL rather than the file, so one
 * upload can back meals in other people's libraries and snapshots inside
 * collections. Deleting a blob that anything else still points at would blank
 * out someone else's meal, so only unreferenced uploads go.
 */
export function unreferencedBlobUrls(
  candidates: Iterable<string>,
  stillReferenced: Iterable<string>
): string[] {
  const keep = new Set(stillReferenced);
  const out = new Set<string>();

  for (const url of candidates) {
    if (isManagedBlobUrl(url) && !keep.has(url)) out.add(url);
  }

  return [...out];
}
