import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** Reachable without signing in. Exported so the guarantees Play depends on
 *  can be asserted in tests. */
export const PUBLIC_ROUTES = [
  "/",
  "/privacy",
  // Google Play requires the account-deletion page to be reachable without
  // signing in or installing the app.
  "/delete-account",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Clerk calls this from its own servers, with a signature instead of a
  // session. The handler verifies that signature itself.
  "/api/webhooks/clerk",
  // Android TWA / Digital Asset Links — must be reachable without auth.
  "/.well-known/assetlinks.json",
];

const isPublicRoute = createRouteMatcher(PUBLIC_ROUTES);

/** Collection authoring. Everything else under /collections is public to any
 *  signed-in user. */
const isCreatorRoute = createRouteMatcher([
  "/collections/new",
  "/collections/mine",
  "/collections/(.*)/edit",
]);

// Named "proxy" because Next 16 deprecated the middleware file convention.
// Clerk looks for either name, so clerkMiddleware is still the handler.
export const proxy = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  // Land signed-out visitors on the public landing page instead of Clerk's
  // sign-in screen. The Android build has /planner baked in as its launch URL,
  // so without this the installed app still opens straight into sign-in.
  await auth.protect({
    unauthenticatedUrl: new URL("/", req.url).toString(),
  });

  // Optimistic filtering only: it keeps the authoring screens out of sight,
  // while the pages and actions behind them check the role for themselves.
  if (isCreatorRoute(req)) {
    const { sessionClaims } = await auth();
    if (sessionClaims?.metadata?.role !== "creator") {
      return NextResponse.redirect(new URL("/collections", req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
