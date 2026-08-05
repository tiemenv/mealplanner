import { Suspense } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { AppNav } from "@/components/app-nav";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/workspace";
import { Users, User, VenetianMask } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * The header shell renders without waiting on the session, because a layout that
 * awaits runtime data blocks navigation before any loading.tsx can show. The two
 * parts that need the session stream in behind their own boundaries.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <ImpersonationBanner />
      </Suspense>
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/planner"
              className="flex items-center gap-2 font-semibold"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                🍳
              </span>
              <span className="hidden sm:inline">The Weekly Plate</span>
            </Link>
            <AppNav />
          </div>
          <div className="flex items-center gap-3">
            <Suspense fallback={<Skeleton className="h-5 w-20 rounded-full" />}>
              <WorkspaceBadge />
            </Suspense>
            <UserButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}

async function ImpersonationBanner() {
  const session = await getSession();
  if (!session.impersonatedBy) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-sm font-medium text-amber-950">
      <VenetianMask className="h-4 w-4 shrink-0" />
      Impersonation mode — you are signed in as{" "}
      {session.name || session.email}. Sensitive actions are disabled.
    </div>
  );
}

async function WorkspaceBadge() {
  const session = await getSession();
  const isGroup = session.workspace.type === "group";

  return (
    <Badge
      variant={isGroup ? "default" : "secondary"}
      className="gap-1"
      title={isGroup ? "Shared group workspace" : "Personal workspace"}
    >
      {isGroup ? (
        <Users className="h-3 w-3" />
      ) : (
        <User className="h-3 w-3" />
      )}
      {session.workspace.label}
    </Badge>
  );
}
