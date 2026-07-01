"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Crown,
  LogOut,
  Loader2,
  Mail,
  X,
  Check,
  Home,
  Minus,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { MemberView, InviteView } from "@/lib/types";
import {
  createGroup,
  inviteMember,
  acceptInvite,
  declineInvite,
  revokeInvite,
  leaveGroup,
  removeMember,
  setHouseholdSize,
} from "@/app/(app)/group/actions";

interface Props {
  mode: "personal" | "member";
  groupName: string;
  isOwner: boolean;
  householdSize: number;
  members: MemberView[];
  pendingInvites: InviteView[];
  myInvites: InviteView[];
}

export function GroupClient(props: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Group</h1>
        <p className="text-sm text-muted-foreground">
          Share one library and meal plan with your household.
        </p>
      </div>

      <HouseholdCard
        size={props.householdSize}
        scope={props.mode === "member" ? "group" : "personal"}
      />

      {props.mode === "member" ? (
        <MemberView {...props} />
      ) : (
        <PersonalView myInvites={props.myInvites} />
      )}
    </div>
  );
}

function HouseholdCard({
  size,
  scope,
}: {
  size: number;
  scope: "personal" | "group";
}) {
  const [value, setValue] = useState(size);
  const [pending, startTransition] = useTransition();

  function save(next: number) {
    const clamped = Math.max(1, Math.min(50, next));
    setValue(clamped);
    startTransition(async () => {
      const res = await setHouseholdSize(clamped);
      if (res.ok) toast.success("Household size updated");
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" /> Household size
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Number of people in your {scope === "group" ? "group" : "household"}.
          Shopping lists scale to this many people.
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => save(value - 1)}
            disabled={pending || value <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-10 text-center text-lg font-semibold tabular-nums">
            {value}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => save(value + 1)}
            disabled={pending || value >= 50}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PersonalView({ myInvites }: { myInvites: InviteView[] }) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const res = await createGroup(name);
      if (res.ok) toast.success("Group created");
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Create a group
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Start a shared workspace. Your meal library and plans will switch to
            the group&apos;s shared ones.
          </p>
          <div className="space-y-2">
            <Label htmlFor="group-name">Group name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Smith Household"
            />
          </div>
          <Button onClick={handleCreate} disabled={pending || !name.trim()}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create group
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending invitations. When someone invites your email, it shows
              up here.
            </p>
          ) : (
            <ul className="space-y-3">
              {myInvites.map((inv) => (
                <InviteRow key={inv.id} invite={inv} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InviteRow({ invite }: { invite: InviteView }) {
  const [pending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      const res = await acceptInvite(invite.id);
      if (res.ok) toast.success(`Joined ${invite.groupName}`);
      else toast.error(res.error ?? "Failed");
    });
  }
  function decline() {
    startTransition(async () => {
      const res = await declineInvite(invite.id);
      if (res.ok) toast.success("Invite declined");
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{invite.groupName}</p>
        <p className="truncate text-sm text-muted-foreground">
          Invited by {invite.invitedByName || "a member"}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" onClick={accept} disabled={pending}>
          <Check className="mr-1 h-4 w-4" /> Join
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={decline}
          disabled={pending}
        >
          Decline
        </Button>
      </div>
    </li>
  );
}

function MemberView({
  groupName,
  isOwner,
  members,
  pendingInvites,
}: Props) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  function handleInvite() {
    startTransition(async () => {
      const res = await inviteMember(email);
      if (res.ok) {
        toast.success(`Invited ${email}`);
        setEmail("");
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  function handleLeave() {
    if (
      !confirm(
        "Leave this group? You'll switch back to your personal library. If you're the last member, the shared library will be deleted."
      )
    )
      return;
    startTransition(async () => {
      const res = await leaveGroup();
      if (res.ok) toast.success("Left group");
      else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> {groupName}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleLeave} disabled={pending}>
            <LogOut className="mr-2 h-4 w-4" /> Leave group
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.clerkId}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={m.imageUrl} alt={m.name} />
                    <AvatarFallback>
                      {m.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="flex items-center gap-1.5 font-medium">
                      {m.name}
                      {m.isOwner && (
                        <Crown className="h-3.5 w-3.5 text-amber-500" />
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                {isOwner && !m.isOwner && (
                  <RemoveMemberButton clerkId={m.clerkId} name={m.name} />
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Invite by email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            They&apos;ll see the invitation when they sign in with this email.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <Button onClick={handleInvite} disabled={pending || !email.trim()}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Invite"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Pending invites
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            <ul className="space-y-2">
              {pendingInvites.map((inv) => (
                <PendingInviteRow key={inv.id} invite={inv} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PendingInviteRow({ invite }: { invite: InviteView }) {
  const [pending, startTransition] = useTransition();
  function revoke() {
    startTransition(async () => {
      const res = await revokeInvite(invite.id);
      if (res.ok) toast.success("Invite revoked");
      else toast.error(res.error ?? "Failed");
    });
  }
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
      <span className="truncate text-sm">{invite.email}</span>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">pending</Badge>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={revoke}
          disabled={pending}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

function RemoveMemberButton({
  clerkId,
  name,
}: {
  clerkId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  function handle() {
    if (!confirm(`Remove ${name} from the group?`)) return;
    startTransition(async () => {
      const res = await removeMember(clerkId);
      if (res.ok) toast.success(`Removed ${name}`);
      else toast.error(res.error ?? "Failed");
    });
  }
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handle}
      disabled={pending}
      className="text-muted-foreground"
    >
      Remove
    </Button>
  );
}
