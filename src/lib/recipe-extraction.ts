import "server-only";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { MEAL_TYPES, type Diet, type MealType } from "@/lib/constants";

export interface ExtractedRecipe {
  title: string;
  ingredients: string[];
  instructions: string;
  cuisine: string;
  diet: Diet | null;
  mealTypes: MealType[];
  /** Seconds into the video where this dish starts, or null if unclear. */
  startSeconds: number | null;
}

export interface RecipeExtraction {
  isRecipe: boolean;
  /** One entry per dish taught, in the order they appear. */
  recipes: ExtractedRecipe[];
}

/** Compilation videos are real, but a model that mistakes every component of
 *  one recipe for a dish of its own would flood the library. */
const MAX_RECIPES = 12;

const CAPTION_MODEL = "gemini-3.5-flash-lite";

const recipeSchema = z.object({
  title: z
    .string()
    .describe("Concise name of the dish being made (not the video's title)."),
  ingredients: z
    .array(z.string())
    .describe("Each ingredient with its quantity, e.g. '2 cups flour'."),
  instructions: z
    .string()
    .describe(
      "Numbered cooking steps for this dish, each on its own line separated by a newline. Never run the steps together into one line, even if the source does."
    ),
  cuisine: z
    .string()
    .describe("Cuisine of the dish, e.g. 'Italian'. Empty string if unclear."),
  diet: z
    .enum(["veg", "nonveg", "unknown"])
    .describe("'veg' if vegetarian, 'nonveg' if it contains meat/fish, else 'unknown'."),
  mealTypes: z
    .array(z.enum(MEAL_TYPES))
    .describe("Meals of the day the dish suits. Pick every one that fits."),
  startTime: z
    .string()
    .describe(
      "Timestamp where this dish's segment starts, as M:SS or H:MM:SS. Empty string if unclear."
    ),
});

export const extractionSchema = z.object({
  isRecipe: z
    .boolean()
    .describe(
      "True only if the source actually describes at least one cooking recipe."
    ),
  recipes: z
    .array(recipeSchema)
    .describe("One entry per distinct dish, in the order they are made."),
});

export type ExtractionOutput = z.infer<typeof extractionSchema>;

/** Watching a video: the model has narration and on-screen text to work from. */
export const VIDEO_PROMPT = `You are a cooking assistant. Watch and listen to this cooking video (transcribe the narration and read any on-screen text) and extract every recipe it teaches.
- Most videos make a single dish. Compilations ("5 easy dinners", a week of meal prep) make several — return one entry per dish, in the order they are made.
- Only split when each dish stands on its own as a meal. The parts of one recipe — sauce, marinade, side, garnish, or a variation of the same dish — belong in that recipe's ingredients and steps, not in an entry of their own.
- For each dish, combine spoken instructions and on-screen captions into a complete ingredient list (with quantities) and clear numbered steps, give it a concise title (the food, not the video headline), and infer its cuisine, whether it is vegetarian, and which meals of the day it suits.
- Also note the timestamp where each dish's segment begins, so a viewer can jump straight to it.
- If the video is NOT a cooking/recipe video, set isRecipe to false and return an empty recipes list.`;

/** Reading a caption: everything hinges on the model not filling gaps from its
 *  own knowledge, because a caption that only names a dish would otherwise
 *  produce a confident, invented recipe. */
export const CAPTION_PROMPT = `You are a cooking assistant. Below is the caption a creator wrote for a cooking video. Extract only the recipes the caption itself spells out.
- Copy ingredients and steps from the caption. NEVER add an ingredient or a step the caption does not state, and never complete a recipe from your own knowledge of the dish.
- If the caption only names or praises a dish, or points elsewhere for the recipe ("recipe in bio", "link in my profile", "full recipe on my blog", "comment for the recipe"), return that dish with an empty ingredients list and empty instructions. That is the correct answer — do not guess.
- A caption may hold several dishes. Return one entry per dish, but keep the parts of one recipe (sauce, marinade, side, garnish) inside that recipe.
- Ignore hashtags, follow requests and promotional text. Cuisine, diet and meal types may be inferred from the dish itself; leave the timestamp empty.
- If the caption is not about cooking at all, set isRecipe to false and return an empty recipes list.`;

/** Turns a model timestamp ("2:15", "1:02:03", "135") into seconds. Zero and
 *  anything unparseable come back as null: a link to the start of the video is
 *  what the plain URL already does. */
function parseTimestamp(value: string | undefined): number | null {
  const raw = value?.trim();
  if (!raw) return null;
  const parts = raw.split(":");
  if (parts.length > 3) return null;
  const numbers = parts.map((part) => Number(part.trim()));
  if (numbers.some((n) => !Number.isFinite(n) || n < 0)) return null;
  const seconds = numbers.reduce((total, part) => total * 60 + part, 0);
  return seconds > 0 ? Math.round(seconds) : null;
}

/** Sources often run their steps together on one line ("1. Chop… 2. Fry…"),
 *  and asking the model for newlines only half works. Splitting on the step
 *  numbers ourselves is deterministic and keeps the recipe readable. */
function splitRunOnSteps(text: string): string {
  if (!text || text.includes("\n")) return text;
  const steps = text
    // A step number is 1-2 digits followed by "." or ")" and a space, which
    // quantities ("1/2 cup", "1.5 lbs", "350 degrees") never look like.
    .split(/(?=\d{1,2}[.)]\s)/)
    .map((step) => step.trim())
    .filter(Boolean);
  return steps.length > 1 ? steps.join("\n") : text;
}

/** Trims the model's answer into the shape the rest of the app expects. */
export function normalizeExtraction(output: ExtractionOutput): RecipeExtraction {
  const recipes = (output.recipes ?? [])
    .map((recipe) => ({
      title: recipe.title?.trim() ?? "",
      ingredients: (recipe.ingredients ?? [])
        .map((s) => s.trim())
        .filter(Boolean),
      instructions: splitRunOnSteps(recipe.instructions?.trim() ?? ""),
      cuisine: recipe.cuisine?.trim() ?? "",
      diet: recipe.diet === "unknown" ? null : recipe.diet,
      mealTypes: [...new Set(recipe.mealTypes ?? [])],
      startSeconds: parseTimestamp(recipe.startTime),
    }))
    // An entry with no name and nothing to cook isn't worth reviewing.
    .filter((r) => r.title || r.ingredients.length > 0 || r.instructions)
    .slice(0, MAX_RECIPES);

  return { isRecipe: output.isRecipe && recipes.length > 0, recipes };
}

/** A caption that only names the dish leaves nothing to cook from, so the
 *  import has to fall back to the video instead of saving a hollow meal. */
export function isRecipeComplete(recipe: ExtractedRecipe): boolean {
  return recipe.ingredients.length > 0 && recipe.instructions.length > 0;
}

/** Reads recipes straight out of a post's caption. Shared by TikTok and
 *  Instagram, where creators routinely write the whole recipe out: it costs a
 *  fraction of watching the video and returns in a second or two. */
export async function extractRecipesFromCaption(
  caption: string
): Promise<RecipeExtraction> {
  const { output } = await generateText({
    // Reading a caption is plain text extraction, and the small model measured
    // identical to the larger ones on real captions at a fraction of the wait.
    model: google(CAPTION_MODEL),
    output: Output.object({ schema: extractionSchema }),
    messages: [
      {
        role: "user",
        content: `${CAPTION_PROMPT}\n\nCaption:\n"""\n${caption}\n"""`,
      },
    ],
  });

  return normalizeExtraction(output);
}
