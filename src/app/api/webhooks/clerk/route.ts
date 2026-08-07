import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

import { serverEnv } from "@/lib/env";
import { purgeAccountData } from "@/lib/account-deletion.server";

/**
 * Clerk's own account deletion closes the sign-in account and nothing else, so
 * this is where the application data actually goes. Clerk keeps redelivering
 * until it gets a 2xx, which is why the status code below is only ever
 * successful once the cleanup has finished.
 */
export async function POST(request: NextRequest) {
  if (!serverEnv.CLERK_WEBHOOK_SIGNING_SECRET) {
    // Without the secret a payload cannot be authenticated, and an unverified
    // one must never be allowed to delete anybody's data.
    console.error(
      "[clerk-webhook] CLERK_WEBHOOK_SIGNING_SECRET is not set — refusing the payload"
    );
    return new Response("Webhook signing secret is not configured", {
      status: 500,
    });
  }

  let event;
  try {
    event = await verifyWebhook(request, {
      signingSecret: serverEnv.CLERK_WEBHOOK_SIGNING_SECRET,
    });
  } catch (err) {
    console.error("[clerk-webhook] signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // 2xx for everything else, so a subscription added by mistake stops retrying
  // instead of filling the log.
  if (event.type !== "user.deleted") {
    return new Response("Ignored", { status: 200 });
  }

  const clerkId = event.data.id;
  if (!clerkId) {
    // Nothing identifies the account, so a redelivery of the same payload would
    // fail the same way. Accept it rather than retry forever.
    console.error("[clerk-webhook] user.deleted carried no user id");
    return new Response("Missing user id", { status: 200 });
  }

  try {
    await purgeAccountData({ clerkId });
  } catch (err) {
    console.error("[clerk-webhook] cleanup failed", clerkId, err);
    return new Response("Cleanup failed", { status: 500 });
  }

  return new Response("Deleted", { status: 200 });
}
