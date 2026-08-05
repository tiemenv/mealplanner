/**
 * Validates configuration once, before the server accepts a request, so a
 * misconfigured deployment fails at boot instead of on its first query. The log
 * line names the database in use — that is how a dev/production mix-up becomes
 * visible in Vercel's logs.
 */
export async function register() {
  // Only the Node.js runtime reaches MongoDB. The proxy runtime has no use for
  // those variables and should not refuse to boot over them.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { serverEnv } = await import("@/lib/env");
  const environment =
    process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";

  console.log(
    `[boot] environment=${environment} ` +
      `mongodb=${serverEnv.mongoDatabaseName ?? "test (unnamed)"}`
  );
}
