import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { dbConnect } from "@/lib/mongoose";
import { getSession } from "@/lib/workspace";
import { planGroupTransition } from "@/lib/account-deletion";
import { UserProfile, type UserProfileDoc } from "@/models/UserProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManageAccountButton } from "@/components/account/manage-account-button";

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

  // Only worth naming when ownership actually moves; otherwise the owner is
  // staying put and saying so would just be noise.
  const nextOwnerClerkId =
    group &&
    transition.kind === "reassign" &&
    transition.nextOwnerClerkId !== group.ownerClerkId
      ? transition.nextOwnerClerkId
      : null;

  const inheriting = nextOwnerClerkId
    ? ((await UserProfile.findOne({
        clerkId: nextOwnerClerkId,
      }).lean()) as UserProfileDoc | null)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {session.email}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-5 w-5" /> Delete account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This permanently deletes your sign-in account, your personal meal
            library and plans, the photos you uploaded, invitations addressed to
            you, and any collections you published. Your sign-in account closes
            straight away and the rest follows within minutes. It cannot be
            undone.
          </p>

          {group && (
            <div className="rounded-lg border border-dashed p-3 text-sm">
              <p className="font-medium">Your group, {group.name}</p>
              <p className="mt-1 text-muted-foreground">
                {transition.kind === "delete" ? (
                  <>
                    You are the last member, so the group and its shared library
                    and plans are deleted with your account.
                  </>
                ) : (
                  <>
                    Other members stay, so the shared library and plans they
                    rely on are kept. You are removed from the group
                    {inheriting
                      ? `, and ${
                          inheriting.name ||
                          inheriting.email ||
                          "another member"
                        } becomes its owner.`
                      : "."}
                  </>
                )}
              </p>
            </div>
          )}

          <ManageAccountButton />

          <p className="text-sm text-muted-foreground">
            Opens your account settings, where <strong>Delete account</strong>{" "}
            is at the bottom. Our{" "}
            <Link
              href="/delete-account"
              className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
            >
              deletion page
            </Link>{" "}
            sets out exactly what goes and what stays.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
