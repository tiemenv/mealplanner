import { describe, expect, it } from "vitest";
import { createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

import { PUBLIC_ROUTES } from "@/proxy";

const isPublic = createRouteMatcher(PUBLIC_ROUTES);

function visit(path: string) {
  return isPublic(new NextRequest(new URL(path, "https://theweeklyplate.app")));
}

describe("public routes", () => {
  it("serves the account deletion page to signed-out visitors", () => {
    // Play rejects the listing if this page redirects to sign-in.
    expect(visit("/delete-account")).toBe(true);
  });

  it("keeps the pages a deletion request links out to public", () => {
    expect(visit("/")).toBe(true);
    expect(visit("/privacy")).toBe(true);
  });

  it("lets Clerk's deletion webhook through, since it carries no session", () => {
    expect(visit("/api/webhooks/clerk")).toBe(true);
  });

  it("opens up neither the parent nor anything nested under the webhook", () => {
    expect(visit("/api/webhooks")).toBe(false);
    expect(visit("/api/webhooks/clerk/replay")).toBe(false);
  });

  it("still leaves the app itself behind the sign-in wall", () => {
    expect(visit("/account")).toBe(false);
    expect(visit("/planner")).toBe(false);
    expect(visit("/library")).toBe(false);
    expect(visit("/group")).toBe(false);
  });

  it("does not open up anything that merely starts with the same path", () => {
    expect(visit("/delete-account/confirm")).toBe(false);
  });
});
