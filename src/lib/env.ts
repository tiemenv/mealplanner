import "server-only";

import { z } from "zod";

import { resolveDatabaseName } from "@/lib/mongo-uri";

/**
 * `.env.example` marks unused optional keys as `KEY=""`, and the features that
 * read them already treat absent and empty the same way, so collapse both to
 * undefined instead of letting `""` travel through the app.
 */
function optional(value: string | undefined): string | undefined {
  return value?.trim() ? value.trim() : undefined;
}

const EnvSchema = z.object({
  MONGODB_URI: z.string().min(1, "not set — see .env.example"),
  // Declared per environment so the URI has to agree with something. Dev and
  // production live on the same cluster, so this is the tripwire that catches a
  // production connection string pasted into a development scope.
  MONGODB_DB_EXPECTED: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "not set — Clerk dashboard → API Keys"),
  CLERK_SECRET_KEY: z.string().min(1, "not set — Clerk dashboard → API Keys"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  UNSPLASH_ACCESS_KEY: z.string().optional(),
  SPOONACULAR_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
});

function load() {
  const parsed = EnvSchema.safeParse({
    MONGODB_URI: process.env.MONGODB_URI ?? "",
    MONGODB_DB_EXPECTED: optional(process.env.MONGODB_DB_EXPECTED),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
    BLOB_READ_WRITE_TOKEN: optional(process.env.BLOB_READ_WRITE_TOKEN),
    UNSPLASH_ACCESS_KEY: optional(process.env.UNSPLASH_ACCESS_KEY),
    SPOONACULAR_API_KEY: optional(process.env.SPOONACULAR_API_KEY),
    GOOGLE_GENERATIVE_AI_API_KEY: optional(
      process.env.GOOGLE_GENERATIVE_AI_API_KEY
    ),
  });

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment variables are not usable:\n${problems}`);
  }

  const env = parsed.data;
  const { databaseName, warning } = resolveDatabaseName(
    env.MONGODB_URI,
    env.MONGODB_DB_EXPECTED
  );

  if (warning) console.warn(`[env] ${warning}`);

  return { ...env, mongoDatabaseName: databaseName };
}

export const serverEnv = load();
