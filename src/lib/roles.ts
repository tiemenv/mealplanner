import "server-only";
import { auth } from "@clerk/nextjs/server";

/** Creators may publish meal collections for everyone else to import. The role
 *  lives in Clerk's publicMetadata, which only the backend can write, and is
 *  mirrored into the session token so this costs no API call. */
export async function isCreator(): Promise<boolean> {
  const { sessionClaims } = await auth();
  return sessionClaims?.metadata?.role === "creator";
}

/** Guard for the authoring actions. Middleware and the pages check the role
 *  too, but those only decide what someone sees; this is what actually stops a
 *  request that skips the UI. */
export async function requireCreator(): Promise<void> {
  if (!(await isCreator())) {
    throw new Error("Not a creator");
  }
}
