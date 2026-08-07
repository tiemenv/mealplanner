import { describe, expect, it } from "vitest";

import {
  DELETE_CONFIRMATION_PHRASE,
  isDeleteConfirmed,
  isManagedBlobUrl,
  planGroupTransition,
  unreferencedBlobUrls,
} from "@/lib/account-deletion";

const ME = "user_me";
const OTHER = "user_other";
const THIRD = "user_third";

describe("isDeleteConfirmed", () => {
  it("accepts the exact phrase, with surrounding whitespace forgiven", () => {
    expect(isDeleteConfirmed(DELETE_CONFIRMATION_PHRASE)).toBe(true);
    expect(isDeleteConfirmed("  DELETE  ")).toBe(true);
  });

  it("rejects anything else, including the wrong case", () => {
    expect(isDeleteConfirmed("delete")).toBe(false);
    expect(isDeleteConfirmed("Delete")).toBe(false);
    expect(isDeleteConfirmed("DELETE ACCOUNT")).toBe(false);
    expect(isDeleteConfirmed("")).toBe(false);
  });
});

describe("planGroupTransition", () => {
  it("does nothing for someone planning on their own", () => {
    expect(planGroupTransition(null, ME)).toEqual({ kind: "none" });
  });

  it("deletes the group once the last member goes", () => {
    expect(
      planGroupTransition(
        { id: "g1", ownerClerkId: ME, memberClerkIds: [ME] },
        ME
      )
    ).toEqual({ kind: "delete", groupId: "g1" });
  });

  it("keeps the group, and everything it owns, while anyone remains", () => {
    expect(
      planGroupTransition(
        { id: "g1", ownerClerkId: OTHER, memberClerkIds: [ME, OTHER] },
        ME
      )
    ).toEqual({
      kind: "reassign",
      groupId: "g1",
      remainingMemberClerkIds: [OTHER],
      nextOwnerClerkId: OTHER,
    });
  });

  it("hands ownership to a remaining member when the owner deletes", () => {
    expect(
      planGroupTransition(
        { id: "g1", ownerClerkId: ME, memberClerkIds: [ME, OTHER, THIRD] },
        ME
      )
    ).toEqual({
      kind: "reassign",
      groupId: "g1",
      remainingMemberClerkIds: [OTHER, THIRD],
      nextOwnerClerkId: OTHER,
    });
  });

  it("leaves an untouched owner in place", () => {
    const plan = planGroupTransition(
      { id: "g1", ownerClerkId: THIRD, memberClerkIds: [ME, OTHER, THIRD] },
      ME
    );

    expect(plan).toMatchObject({ nextOwnerClerkId: THIRD });
  });

  it("never leaves the group without an owner", () => {
    const plan = planGroupTransition(
      { id: "g1", ownerClerkId: ME, memberClerkIds: [ME, OTHER] },
      ME
    );

    expect(plan.kind).toBe("reassign");
    if (plan.kind !== "reassign") return;
    expect(plan.remainingMemberClerkIds).toContain(plan.nextOwnerClerkId);
    expect(plan.nextOwnerClerkId).not.toBe(ME);
  });

  it("removes membership without deleting when the roster never listed them", () => {
    // Drift: the profile points at a group whose roster missed the member.
    expect(
      planGroupTransition(
        { id: "g1", ownerClerkId: OTHER, memberClerkIds: [OTHER] },
        ME
      )
    ).toMatchObject({ kind: "reassign", remainingMemberClerkIds: [OTHER] });
  });

  it("deletes an empty group rather than stranding it", () => {
    expect(
      planGroupTransition({ id: "g1", ownerClerkId: ME, memberClerkIds: [] }, ME)
    ).toEqual({ kind: "delete", groupId: "g1" });
  });
});

describe("isManagedBlobUrl", () => {
  it("recognises our own uploads", () => {
    expect(
      isManagedBlobUrl(
        "https://abc123.public.blob.vercel-storage.com/meals/pasta-x1.jpg"
      )
    ).toBe(true);
  });

  it("leaves images we merely link to alone", () => {
    expect(isManagedBlobUrl("https://images.unsplash.com/photo-123")).toBe(
      false
    );
    expect(isManagedBlobUrl("https://i.ytimg.com/vi/abc/hq.jpg")).toBe(false);
  });

  it("is not fooled by a lookalike host", () => {
    expect(
      isManagedBlobUrl("https://blob.vercel-storage.com.evil.test/meals/a.jpg")
    ).toBe(false);
  });

  it("ignores empty and unparseable values", () => {
    expect(isManagedBlobUrl("")).toBe(false);
    expect(isManagedBlobUrl("not a url")).toBe(false);
    expect(isManagedBlobUrl("/meals/local.jpg")).toBe(false);
  });
});

describe("unreferencedBlobUrls", () => {
  const MINE = "https://abc.public.blob.vercel-storage.com/meals/mine-1.jpg";
  const SHARED = "https://abc.public.blob.vercel-storage.com/meals/shared.jpg";
  const EXTERNAL = "https://images.unsplash.com/photo-9";

  it("deletes an upload nothing else points at", () => {
    expect(unreferencedBlobUrls([MINE], [])).toEqual([MINE]);
  });

  it("keeps an upload another library still shows", () => {
    // Importing a collection copies the URL, so the file backs someone else's
    // meal too — deleting it would blank out their card.
    expect(unreferencedBlobUrls([MINE, SHARED], [SHARED])).toEqual([MINE]);
  });

  it("never deletes an image we only linked to", () => {
    expect(unreferencedBlobUrls([EXTERNAL], [])).toEqual([]);
  });

  it("collapses the same upload used by several meals into one delete", () => {
    expect(unreferencedBlobUrls([MINE, MINE, MINE], [])).toEqual([MINE]);
  });

  it("returns nothing when every candidate is still in use", () => {
    expect(unreferencedBlobUrls([MINE, SHARED], [MINE, SHARED])).toEqual([]);
  });

  it("handles an account that never uploaded anything", () => {
    expect(unreferencedBlobUrls([], [SHARED])).toEqual([]);
    expect(unreferencedBlobUrls(["", ""], [])).toEqual([]);
  });
});
