import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/privacy",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Android TWA / Digital Asset Links — must be reachable without auth.
  "/.well-known/assetlinks.json",
]);

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

  await auth.protect();

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
