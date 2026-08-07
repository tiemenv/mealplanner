"use client";

import { useClerk } from "@clerk/nextjs";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Opens Clerk's own account modal, where "Delete account" lives. Deletion is
 *  Clerk's to perform: it owns the sign-in account, and reports the deletion to
 *  us over a webhook. */
export function ManageAccountButton() {
  const { openUserProfile } = useClerk();

  return (
    <Button variant="destructive" size="lg" onClick={() => openUserProfile()}>
      <Trash2 className="mr-2 h-4 w-4" /> Delete my account
    </Button>
  );
}
