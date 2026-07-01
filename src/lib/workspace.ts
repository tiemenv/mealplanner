import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongoose";
import { UserProfile, type UserProfileDoc } from "@/models/UserProfile";
import { Group, type GroupDoc } from "@/models/Group";

export type WorkspaceType = "user" | "group";

export interface Workspace {
  type: WorkspaceType;
  /** "user:<clerkId>" or "group:<groupId>" — the meal/plan owner key. */
  ownerKey: string;
  label: string;
  householdSize: number;
  group: {
    id: string;
    name: string;
    ownerClerkId: string;
    memberClerkIds: string[];
  } | null;
}

export interface Session {
  clerkId: string;
  email: string;
  name: string;
  imageUrl: string;
  profile: UserProfileDoc;
  workspace: Workspace;
}

/**
 * Ensures a UserProfile exists for the signed-in Clerk user (creating/updating
 * it from Clerk data) and returns the full session including the active
 * workspace (personal or group).
 */
export async function getSession(): Promise<Session> {
  const user = await currentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  await dbConnect();

  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "";
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    email;

  const profile = (await UserProfile.findOneAndUpdate(
    { clerkId: user.id },
    {
      $set: {
        email: email.toLowerCase(),
        name,
        imageUrl: user.imageUrl ?? "",
      },
      $setOnInsert: { clerkId: user.id },
    },
    { upsert: true, returnDocument: "after" }
  ).lean()) as UserProfileDoc;

  let workspace: Workspace;

  if (profile.groupId) {
    const group = (await Group.findById(
      profile.groupId
    ).lean()) as GroupDoc | null;

    if (group) {
      workspace = {
        type: "group",
        ownerKey: `group:${group._id.toString()}`,
        label: group.name,
        householdSize: group.householdSize ?? 2,
        group: {
          id: group._id.toString(),
          name: group.name,
          ownerClerkId: group.ownerClerkId,
          memberClerkIds: group.memberClerkIds,
        },
      };
    } else {
      // Stale reference — fall back to personal.
      workspace = {
        type: "user",
        ownerKey: `user:${user.id}`,
        label: "Personal",
        householdSize: profile.householdSize ?? 2,
        group: null,
      };
    }
  } else {
    workspace = {
      type: "user",
      ownerKey: `user:${user.id}`,
      label: "Personal",
      householdSize: profile.householdSize ?? 2,
      group: null,
    };
  }

  return {
    clerkId: user.id,
    email: email.toLowerCase(),
    name,
    imageUrl: user.imageUrl ?? "",
    profile,
    workspace,
  };
}
