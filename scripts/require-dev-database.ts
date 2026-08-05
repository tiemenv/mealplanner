/**
 * Development and production share one Atlas cluster and differ only by database
 * name, so a script that writes has to be told which database it may touch.
 * Naming it on the command line is what stops a leftover production URI in
 * `.env.local` from being seeded — or wiped — by accident.
 */
import { databaseNameFromUri } from "../src/lib/mongo-uri";

const FLAG = "--db=";

export function resolveTargetDatabase(
  argv: string[],
  command: string
): { uri: string; databaseName: string } {
  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    throw new Error(
      "Refusing to run: these scripts are for development databases only."
    );
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set (check your .env.local).");
  }

  const databaseName = databaseNameFromUri(uri);
  if (!databaseName) {
    throw new Error(
      "MONGODB_URI does not name a database, so there is no way to tell which " +
        'environment it points at. Add one before the "?".'
    );
  }

  const requested = argv
    .find((arg) => arg.startsWith(FLAG))
    ?.slice(FLAG.length);

  if (!requested) {
    throw new Error(
      "Name the database you mean to write to. MONGODB_URI currently points at " +
        `"${databaseName}", so run:\n\n  ${command} --db=${databaseName}\n`
    );
  }

  if (requested !== databaseName) {
    throw new Error(
      `You asked for "${requested}" but MONGODB_URI points at ` +
        `"${databaseName}". Refusing to run.`
    );
  }

  return { uri, databaseName };
}
