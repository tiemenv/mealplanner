import { dbConnect } from "@/lib/mongoose";
import { getSession } from "@/lib/workspace";
import { UserProfile, type UserProfileDoc } from "@/models/UserProfile";
import { Invite, type InviteDoc } from "@/models/Invite";
import { GroupClient } from "@/components/group/group-client";
import type { MemberView, InviteView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GroupPage() {
  const session = await getSession();
  await dbConnect();

  if (session.workspace.type === "group" && session.workspace.group) {
    const group = session.workspace.group;
    const profiles = (await UserProfile.find({
      clerkId: { $in: group.memberClerkIds },
    }).lean()) as unknown as UserProfileDoc[];

    const members: MemberView[] = group.memberClerkIds.map((clerkId) => {
      const p = profiles.find((x) => x.clerkId === clerkId);
      return {
        clerkId,
        name: p?.name || p?.email || "Member",
        email: p?.email || "",
        imageUrl: p?.imageUrl || "",
        isOwner: clerkId === group.ownerClerkId,
      };
    });

    const pendingDocs = (await Invite.find({
      groupId: group.id,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .lean()) as unknown as InviteDoc[];

    const pendingInvites: InviteView[] = pendingDocs.map((d) => ({
      id: d._id.toString(),
      groupId: d.groupId.toString(),
      groupName: d.groupName,
      email: d.email,
      invitedByName: d.invitedByName,
    }));

    return (
      <GroupClient
        mode="member"
        groupName={group.name}
        isOwner={group.ownerClerkId === session.clerkId}
        householdSize={session.workspace.householdSize}
        members={members}
        pendingInvites={pendingInvites}
        myInvites={[]}
      />
    );
  }

  // Personal mode — show incoming invites + create-group option.
  const inviteDocs = (await Invite.find({
    email: session.email,
    status: "pending",
  })
    .sort({ createdAt: -1 })
    .lean()) as unknown as InviteDoc[];

  const myInvites: InviteView[] = inviteDocs.map((d) => ({
    id: d._id.toString(),
    groupId: d.groupId.toString(),
    groupName: d.groupName,
    email: d.email,
    invitedByName: d.invitedByName,
  }));

  return (
    <GroupClient
      mode="personal"
      groupName=""
      isOwner={false}
      householdSize={session.workspace.householdSize}
      members={[]}
      pendingInvites={[]}
      myInvites={myInvites}
    />
  );
}
