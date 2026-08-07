"use client";

import { useState, useTransition } from "react";
import { useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DELETE_ACCOUNT_ENDPOINT,
  DELETE_CONFIRMATION_PHRASE,
  isDeleteConfirmed,
  type DeleteAccountResult,
} from "@/lib/account-deletion";

/** What deleting this particular account does to the group it belongs to,
 *  worked out on the server so the warning matches what will happen. */
export interface GroupOutcome {
  name: string;
  /** True when nobody is left behind, so the shared library goes too. */
  deletesSharedLibrary: boolean;
  /** Set when the owner is leaving and someone else inherits the group. */
  nextOwnerName: string | null;
}

interface Props {
  name: string;
  email: string;
  imageUrl: string;
  group: GroupOutcome | null;
}

export function AccountClient({ name, email, imageUrl, group }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground">
          Your sign-in details and permanent account deletion.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signed in as</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={imageUrl} alt={name} />
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
        </CardContent>
      </Card>

      <DeleteAccountCard group={group} />
    </div>
  );
}

function DeleteAccountCard({ group }: { group: GroupOutcome | null }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const { signOut } = useClerk();

  const confirmed = isDeleteConfirmed(typed);

  function close(next: boolean) {
    if (pending) return;
    setOpen(next);
    if (!next) setTyped("");
  }

  function handleDelete() {
    startTransition(async () => {
      let result: DeleteAccountResult;
      try {
        const res = await fetch(DELETE_ACCOUNT_ENDPOINT, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmation: typed }),
        });
        result = (await res.json()) as DeleteAccountResult;
      } catch {
        toast.error("Could not reach the server. Check your connection.");
        return;
      }

      if (!result.ok) {
        toast.error(result.error ?? "Could not delete your account.");
        return;
      }

      toast.success("Your account has been deleted.");

      // The Clerk user is already gone, so this only clears the stale cookie.
      try {
        await signOut({ redirectUrl: "/" });
      } catch {
        window.location.href = "/";
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-5 w-5" /> Delete account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This permanently deletes your account and your data. It cannot be
            undone, and we cannot restore anything afterwards.
          </p>

          <div className="space-y-2 text-sm">
            <p className="font-medium">What gets deleted</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Your sign-in account, name, email, and profile photo</li>
              <li>Your personal meal library and every weekly plan</li>
              <li>Meal photos you uploaded</li>
              <li>Your group membership and any invitations to you</li>
              <li>Meal collections you published</li>
            </ul>
          </div>

          {group && <GroupNotice group={group} />}

          <Button variant="destructive" onClick={() => setOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete my account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This is permanent. Your meal library, weekly plans, uploaded
              photos, and sign-in account will be deleted and cannot be
              recovered.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              Type {DELETE_CONFIRMATION_PHRASE} to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={DELETE_CONFIRMATION_PHRASE}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={pending}
              className="touch:h-11"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => close(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !confirmed}
              onClick={handleDelete}
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function GroupNotice({ group }: { group: GroupOutcome }) {
  return (
    <div className="rounded-lg border border-dashed p-3 text-sm">
      <p className="font-medium">Your group, {group.name}</p>
      <p className="mt-1 text-muted-foreground">
        {group.deletesSharedLibrary ? (
          <>
            You are the last member, so the group and its shared library and
            plans are deleted with your account.
          </>
        ) : (
          <>
            Other members stay, so the shared library and plans they rely on are
            kept. You are removed from the group
            {group.nextOwnerName
              ? `, and ${group.nextOwnerName} becomes its owner.`
              : "."}
          </>
        )}
      </p>
    </div>
  );
}
