/**
 * Development and production share one Atlas cluster and are separated only by
 * database name, which makes that name a safety boundary rather than a detail.
 * Both the app and the seed scripts check it before touching data.
 */
export function databaseNameFromUri(uri: string): string | null {
  const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//i, "");
  if (withoutScheme === uri) return null;

  // A percent-encoded password can still contain "/", so the host section only
  // reliably begins after the final "@".
  const afterCredentials = withoutScheme.slice(
    withoutScheme.lastIndexOf("@") + 1
  );

  const pathStart = afterCredentials.indexOf("/");
  if (pathStart === -1) return null;

  const name = afterCredentials.slice(pathStart + 1).split("?")[0];
  if (!name) return null;

  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

/**
 * Reconciles the database named in the URI against the one an environment says
 * it expects. Throwing is deliberate: with dev and production on one cluster,
 * refusing to start beats reading or writing the other environment's data.
 *
 * Declaring an expectation is what makes the check strict. Without one there is
 * nothing to compare against, so an unnamed database only earns a warning and
 * a deployment that predates this setting keeps working.
 */
export function resolveDatabaseName(
  uri: string,
  expected: string | undefined
): { databaseName: string | null; warning?: string } {
  const databaseName = databaseNameFromUri(uri);

  if (expected) {
    if (!databaseName) {
      throw new Error(
        `This environment expects the "${expected}" database, but MONGODB_URI ` +
          'does not name one, so MongoDB would fall back to "test". Name it ' +
          `before the "?": ".../${expected}?…".`
      );
    }
    if (expected !== databaseName) {
      throw new Error(
        `MONGODB_URI points at the "${databaseName}" database but this ` +
          `environment expects "${expected}". Refusing to start rather than ` +
          "read or write another environment's data."
      );
    }
    return { databaseName };
  }

  if (!databaseName) {
    return {
      databaseName,
      warning:
        'MONGODB_URI does not name a database, so MongoDB is using "test". ' +
        "Development and production cannot be kept apart this way — name the " +
        "database and set MONGODB_DB_EXPECTED. See the README.",
    };
  }

  return { databaseName };
}
