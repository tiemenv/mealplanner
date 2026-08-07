/**
 * Publishes the curated starter collection in `data/starter-collection.ts` so
 * the /collections shelf is not empty for a new account. Collections can
 * otherwise only be authored through the UI by a creator-role user, and
 * `seed-meals.ts` fills a personal library rather than the shelf.
 *
 * It is a dry run unless `--write` is passed, and idempotent: the collection is
 * keyed on its slug, so running it twice updates rather than duplicates.
 *
 * `--db=` is required and must match the database in MONGODB_URI, as in the
 * other scripts. Publishing to production is a legitimate one-off but has to be
 * asked for by name as well: any database outside the development allowlist
 * also needs `--allow-production` and an explicit `--creator`.
 *
 * Usage:
 *   npm run publish:starter -- --db=weeklyplate_dev                    # preview
 *   npm run publish:starter -- --db=weeklyplate_dev --write            # publish to dev
 *   npm run publish:starter -- --db=weeklyplate_dev --write --creator=user_123
 *   npm run publish:starter -- --db=test --creator=user_123 --allow-production
 *   npm run publish:starter -- --db=test --creator=user_123 --allow-production --write
 *
 * Reads MONGODB_URI from .env / .env.local (same as the app).
 */
import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

import { Collection } from "../src/models/Collection";
import { MEAL_TYPES } from "../src/lib/constants";
import {
  STARTER_COLLECTION,
  summarizeStarterMeals,
  type StarterMeal,
} from "./data/starter-collection";
import { resolveTargetDatabase } from "./require-dev-database";

loadEnvConfig(process.cwd());

/** Databases this script may write to without further ceremony. Listing the
 *  development ones rather than the production ones fails closed: a database
 *  nobody thought to add here is treated as production. */
const DEVELOPMENT_DATABASES = new Set(["weeklyplate_dev"]);

/** The dev-instance account the meal seeder also attributes to. Clerk user ids
 *  do not carry between instances, so this is only ever right for development —
 *  a production run has to name its own. */
const DEFAULT_CREATOR_CLERK_ID = "user_3FrmmlzM9xfjMnqz2MlLZCmpKs6";
const DEFAULT_CREATOR_NAME = "The Weekly Plate";

/** Slots the planner has to fill for one meal type in a week. */
const SLOTS_PER_MEAL_TYPE = 7;

function flag(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

/** Snapshot fields, exactly as the collection editor writes them. */
function toCollectionMeal(meal: StarterMeal) {
  return {
    key: meal.key,
    name: meal.name,
    diet: meal.diet,
    mealTypes: meal.mealTypes,
    cuisine: meal.cuisine,
    imageUrl: "",
    ingredients: meal.ingredients,
    recipe: meal.recipe,
    recipeUrl: "",
    // Nothing in a library to point back at: the meals are authored here.
    sourceMealId: null,
  };
}

function pad(label: string): string {
  return label.padEnd(9);
}

function printSummary() {
  const stats = summarizeStarterMeals(STARTER_COLLECTION.meals);

  console.log(`\n${STARTER_COLLECTION.title}  (slug: ${STARTER_COLLECTION.slug})`);
  console.log(
    `  ${stats.total} meals — ${stats.byDiet.veg} vegetarian / ${stats.byDiet.nonveg} non-veg`
  );

  for (const type of MEAL_TYPES) {
    const split = stats.byMealTypeAndDiet[type];
    console.log(
      `  ${pad(type)} ${String(stats.byMealType[type]).padStart(2)} meals ` +
        `(${split.veg} veg / ${split.nonveg} non-veg)`
    );
  }

  const cuisines = Object.entries(stats.byCuisine).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
  console.log(
    `  cuisines: ${cuisines.map(([name, n]) => `${name} ${n}`).join(", ")}`
  );

  const thin = MEAL_TYPES.filter(
    (type) => stats.byMealType[type] < SLOTS_PER_MEAL_TYPE
  );
  const empty = MEAL_TYPES.filter((type) => stats.byMealType[type] === 0);
  if (empty.length > 0) {
    throw new Error(
      `Nothing to serve for ${empty.join(", ")}. The planner would leave ` +
        "those slots blank all week, so this collection is not publishable."
    );
  }
  if (thin.length > 0) {
    console.log(
      `  warning: ${thin.join(", ")} has fewer than ${SLOTS_PER_MEAL_TYPE} ` +
        "meals, so a generated week repeats some."
    );
  } else {
    console.log(
      `  every meal type covers all ${SLOTS_PER_MEAL_TYPE} slots of the week, ` +
        "so a generated week fills completely."
    );
  }
  console.log("");
}

async function main() {
  const argv = process.argv.slice(2);
  const write = argv.includes("--write");
  const allowProduction = argv.includes("--allow-production");
  const creatorName = flag(argv, "creator-name") ?? DEFAULT_CREATOR_NAME;
  const requestedCreator = flag(argv, "creator");

  const { uri, databaseName } = resolveTargetDatabase(
    argv,
    "npm run publish:starter --"
  );

  const isDevelopment = DEVELOPMENT_DATABASES.has(databaseName);
  if (!isDevelopment && !allowProduction) {
    throw new Error(
      `"${databaseName}" is not a development database. Publishing there is a ` +
        "deliberate act, so say so:\n\n" +
        `  npm run publish:starter -- --db=${databaseName} --creator=<clerkUserId> --allow-production\n`
    );
  }
  if (!isDevelopment && !requestedCreator) {
    throw new Error(
      "Name the account to publish as with --creator=<clerkUserId>. Clerk user " +
        "ids do not carry from development to production, so the default would " +
        "attribute the collection to an account that does not exist there — and " +
        "nobody could edit or unpublish it from the app."
    );
  }

  const creatorClerkId = requestedCreator ?? DEFAULT_CREATOR_CLERK_ID;

  printSummary();
  console.log(`Target: "${databaseName}" database, as ${creatorClerkId}.`);

  await mongoose.connect(uri);

  const existing = await Collection.findOne({ slug: STARTER_COLLECTION.slug });

  if (existing && existing.creatorClerkId !== creatorClerkId) {
    console.log(
      `Note: it is currently attributed to ${existing.creatorClerkId} and will ` +
        `be reattributed to ${creatorClerkId}.`
    );
  }

  const fields = {
    title: STARTER_COLLECTION.title,
    description: STARTER_COLLECTION.description,
    cuisine: STARTER_COLLECTION.cuisine,
    coverImageUrl: "",
    status: "published" as const,
    creatorClerkId,
    creatorName,
    creatorImageUrl: "",
    meals: STARTER_COLLECTION.meals.map(toCollectionMeal),
  };

  if (!write) {
    // Cheap here, and the only way a dry run can promise the write would work:
    // the schema validators run in memory, without touching the database.
    await new Collection({ slug: STARTER_COLLECTION.slug, ...fields }).validate();
    console.log(
      existing
        ? `Dry run — would update the existing collection (${existing.meals.length} meals now, ${fields.meals.length} after).`
        : "Dry run — would create the collection and publish it."
    );
    console.log(
      `Every meal passes the schema. Nothing was written — re-run with --write to publish.\n`
    );
    await mongoose.disconnect();
    return;
  }

  if (existing) {
    existing.set(fields);
    await existing.save();
    console.log(
      `Updated "${STARTER_COLLECTION.title}" — ${fields.meals.length} meals, published.`
    );
  } else {
    await Collection.create({ slug: STARTER_COLLECTION.slug, ...fields });
    console.log(
      `Created "${STARTER_COLLECTION.title}" — ${fields.meals.length} meals, published.`
    );
  }

  console.log(`Live at /collections/${STARTER_COLLECTION.slug}\n`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await mongoose.disconnect();
  process.exit(1);
});
