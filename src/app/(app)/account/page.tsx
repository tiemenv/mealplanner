import type { Metadata } from "next";
import { dbConnect } from "@/lib/mongoose";
import { getSession } from "@/lib/workspace";
import { planGroupTransition } from "@/lib/account-deletion";
import { UserProfile, type UserProfileDoc } from "@/models/UserProfile";
import {
  AccountClient,
  type GroupOutcome,
} from "@/components/account/account-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account — The Weekly Plate",
};

export default async function AccountPage() {
  const session = await getSession();
  await dbConnect();

  const group = session.workspace.group;
  const transition = planGroupTransition(
    group
      ? {
          id: group.id,
          ownerClerkId: group.ownerClerkId,
          memberClerkIds: group.memberClerkIds,
        }
      : null,
    session.clerkId
  );

  let outcome: GroupOutcome | null = null;

  if (group && transition.kind === "delete") {
    outcome = {
      name: group.name,
      deletesSharedLibrary: true,
      nextOwnerName: null,
    };
  } else if (group && transition.kind === "reassign") {
    // Only worth naming when ownership actually moves; otherwise the owner is
    // staying put and saying so would just be noise.
    const inheriting =
      transition.nextOwnerClerkId === group.ownerClerkId
        ? null
        : ((await UserProfile.findOne({
            clerkId: transition.nextOwnerClerkId,
          }).lean()) as UserProfileDoc | null);

    outcome = {
      name: group.name,
      deletesSharedLibrary: false,
      nextOwnerName: inheriting
        ? inheriting.name || inheriting.email || "Another member"
        : null,
    };
  }

  return (
    <AccountClient
      name={session.name}
      email={session.email}
      imageUrl={session.imageUrl}
      group={outcome}
    />
  );
}
