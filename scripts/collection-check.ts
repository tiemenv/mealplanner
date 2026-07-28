/**
 * End-to-end check of creator collections against the real database, using the
 * app's own model and helpers.
 *
 * Covers: slug minting (including the reserved route names), schema validators,
 * snapshotting meals out of a library, the publish gate, draft privacy, and
 * import de-duplication being idempotent.
 *
 * The Clerk-gated wrappers in creator-actions.ts cannot run here — there is no
 * session outside a request — so the role checks themselves still need a pass
 * through the UI while signed in.
 *
 * Usage:
 *   npx tsx --conditions=react-server scripts/collection-check.ts
 *
 * Everything it writes is scoped to scratch owner keys and deleted at the end.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const RUN = Date.now().toString(36);
const CREATOR_CLERK_ID = `scratch-creator-${RUN}`;
const CREATOR_OWNER = `user:${CREATOR_CLERK_ID}`;
const IMPORTER_CLERK_ID = `scratch-importer-${RUN}`;
const IMPORTER_OWNER = `user:${IMPORTER_CLERK_ID}`;

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok    ${label}`);
    return;
  }
  failures++;
  console.error(
    `  FAIL  ${label}${detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`
  );
}

async function main() {
  const mongoose = (await import("mongoose")).default;
  const { dbConnect } = await import("../src/lib/mongoose");
  const { Meal } = await import("../src/models/Meal");
  const { Collection } = await import("../src/models/Collection");
  const {
    uniqueSlug,
    slugify,
    getCollection,
    getVisibleCollection,
    listCollections,
    listCollectionsByCreator,
    summarize,
    coverFor,
    ownedMeals,
    alreadyOwned,
  } = await import("../src/lib/collections");

  await dbConnect();

  try {
    console.log("\nslugs");
    check("title becomes a slug", slugify("Weeknight Pasta!") === "weeknight-pasta");
    check("accents fold", slugify("Crème Brûlée") === "creme-brulee");
    const reserved = await uniqueSlug("New");
    check("reserved route names are avoided", reserved === "new-collection", reserved);
    const mine = await uniqueSlug("Mine");
    check("mine is avoided too", mine === "mine-collection", mine);

    console.log("\nlibrary setup");
    const library = await Meal.insertMany([
      {
        ownerKey: CREATOR_OWNER,
        name: `Scratch Dal ${RUN}`,
        diet: "veg",
        mealTypes: ["lunch", "dinner"],
        cuisine: "Indian",
        imageUrl: "https://example.com/dal.jpg",
        ingredients: ["1 cup red lentils", "1 tsp cumin"],
        recipe: "1. Simmer the lentils.\n2. Temper the cumin.",
        recipeUrl: "",
        createdByClerkId: CREATOR_CLERK_ID,
      },
      {
        ownerKey: CREATOR_OWNER,
        name: `Scratch Roast ${RUN}`,
        diet: "nonveg",
        mealTypes: ["dinner"],
        cuisine: "British",
        imageUrl: "",
        ingredients: ["1 chicken"],
        recipe: "1. Roast it.",
        recipeUrl: "",
        createdByClerkId: CREATOR_CLERK_ID,
      },
      {
        ownerKey: CREATOR_OWNER,
        name: `Scratch Oats ${RUN}`,
        diet: "veg",
        mealTypes: ["breakfast"],
        cuisine: "",
        imageUrl: "https://example.com/oats.jpg",
        ingredients: ["50g oats"],
        recipe: "1. Cook the oats.",
        recipeUrl: "",
        createdByClerkId: CREATOR_CLERK_ID,
      },
    ]);
    check("three scratch meals inserted", library.length === 3);

    console.log("\nauthoring");
    const slug = await uniqueSlug(`Scratch Collection ${RUN}`);
    const collection = await Collection.create({
      slug,
      title: `Scratch Collection ${RUN}`,
      description: "Built by the verification script.",
      cuisine: "Indian",
      status: "draft",
      creatorClerkId: CREATOR_CLERK_ID,
      creatorName: "Scratch Creator",
      meals: [],
    });
    check("collection starts as a draft", collection.status === "draft");

    // The same snapshot the editor takes: fields copied, origin recorded.
    collection.meals = library.map((meal) => ({
      key: slugify(meal.name),
      name: meal.name,
      diet: meal.diet,
      mealTypes: meal.mealTypes,
      cuisine: meal.cuisine,
      imageUrl: meal.imageUrl,
      ingredients: meal.ingredients,
      recipe: meal.recipe,
      recipeUrl: meal.recipeUrl,
      sourceMealId: meal._id,
    }));
    await collection.save();

    const saved = await getCollection(slug);
    check("three meals snapshotted", saved?.meals.length === 3, saved?.meals.length);
    check(
      "snapshots keep their origin",
      saved?.meals.every((meal) => Boolean(meal.sourceMealId)) ?? false
    );
    check(
      "ids are serialized for the client",
      typeof saved?.meals[0]?.sourceMealId === "string"
    );

    const stats = summarize(saved!);
    check("meal type coverage counted", stats.byMealType.breakfast === 1, stats.byMealType);
    check("diet split counted", stats.veg === 2 && stats.nonveg === 1, stats);
    check(
      "cover falls back to the first meal with a photo",
      coverFor(saved!) === "https://example.com/dal.jpg",
      coverFor(saved!)
    );

    console.log("\nschema validators");
    let rejected = false;
    try {
      await Collection.create({
        slug: `${slug}-invalid`,
        title: "Invalid",
        creatorClerkId: CREATOR_CLERK_ID,
        meals: [{ key: "x", name: "No meal types", diet: "veg", mealTypes: [] }],
      });
    } catch {
      rejected = true;
    }
    check("a meal with no meal types is rejected", rejected);

    let duplicate = false;
    try {
      await Collection.create({
        slug,
        title: "Duplicate slug",
        creatorClerkId: CREATOR_CLERK_ID,
      });
    } catch {
      duplicate = true;
    }
    check("slugs are unique", duplicate);

    console.log("\ndraft privacy");
    check(
      "the creator sees their draft",
      (await getVisibleCollection(slug, CREATOR_CLERK_ID)) !== null
    );
    check(
      "nobody else does",
      (await getVisibleCollection(slug, IMPORTER_CLERK_ID)) === null
    );
    const browsingDraft = await listCollections(IMPORTER_CLERK_ID);
    check(
      "drafts stay off the browse list",
      !browsingDraft.some((c) => c.slug === slug)
    );
    check(
      "the creator's own list shows it",
      (await listCollectionsByCreator(CREATOR_CLERK_ID)).some(
        (c) => c.slug === slug
      )
    );

    console.log("\npublishing");
    collection.status = "published";
    await collection.save();
    check(
      "published collections are visible to others",
      (await getVisibleCollection(slug, IMPORTER_CLERK_ID)) !== null
    );
    check(
      "and appear on the browse list",
      (await listCollections(IMPORTER_CLERK_ID)).some((c) => c.slug === slug)
    );

    console.log("\nimporting into another workspace");
    const published = (await getVisibleCollection(slug, IMPORTER_CLERK_ID))!;

    async function importAll() {
      const owned = await ownedMeals(IMPORTER_OWNER);
      const fresh = published.meals.filter(
        (meal) => !alreadyOwned(published.id, meal, owned)
      );
      if (fresh.length > 0) {
        await Meal.insertMany(
          fresh.map((meal) => ({
            ownerKey: IMPORTER_OWNER,
            name: meal.name,
            diet: meal.diet,
            mealTypes: meal.mealTypes,
            cuisine: meal.cuisine,
            imageUrl: meal.imageUrl,
            ingredients: meal.ingredients,
            recipe: meal.recipe,
            recipeUrl: meal.recipeUrl,
            sourceCollection: published.id,
            sourceMealKey: meal.key,
            createdByClerkId: IMPORTER_CLERK_ID,
          }))
        );
      }
      return fresh.length;
    }

    check("first import adds everything", (await importAll()) === 3);
    check("re-importing adds nothing", (await importAll()) === 0);
    check(
      "the library holds exactly one copy of each",
      (await Meal.countDocuments({ ownerKey: IMPORTER_OWNER })) === 3
    );
    check(
      "provenance records the collection id, not the slug",
      (await Meal.countDocuments({
        ownerKey: IMPORTER_OWNER,
        sourceCollection: published.id,
      })) === 3
    );

    console.log("\nde-duplication against hand-added meals");
    await Meal.deleteMany({ ownerKey: IMPORTER_OWNER });
    await Meal.create({
      ownerKey: IMPORTER_OWNER,
      // Same dish, typed by hand: different case and padding, no provenance.
      name: `  scratch dal ${RUN.toUpperCase()}  `.toLowerCase(),
      diet: "veg",
      mealTypes: ["dinner"],
      createdByClerkId: IMPORTER_CLERK_ID,
    });
    check("importing skips the dish they already had", (await importAll()) === 2);
    check(
      "so it is never duplicated",
      (await Meal.countDocuments({ ownerKey: IMPORTER_OWNER })) === 3
    );

    console.log("\nediting after publication");
    // Snapshots are the point: changing the library must not change what
    // readers of a published collection see.
    await Meal.updateOne(
      { _id: library[0]._id },
      { $set: { name: "Renamed in the library" } }
    );
    await Meal.deleteOne({ _id: library[1]._id });
    const afterEdits = await getCollection(slug);
    check(
      "a renamed library meal leaves the collection untouched",
      afterEdits?.meals[0]?.name === `Scratch Dal ${RUN}`,
      afterEdits?.meals[0]?.name
    );
    check(
      "a deleted library meal leaves the collection intact",
      afterEdits?.meals.length === 3,
      afterEdits?.meals.length
    );
  } finally {
    console.log("\ncleanup");
    const meals = await Meal.deleteMany({
      ownerKey: { $in: [CREATOR_OWNER, IMPORTER_OWNER] },
    });
    const collections = await Collection.deleteMany({
      creatorClerkId: CREATOR_CLERK_ID,
    });
    console.log(
      `  removed ${meals.deletedCount} meals and ${collections.deletedCount} collections`
    );
    await mongoose.disconnect();
  }

  console.log(
    failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
