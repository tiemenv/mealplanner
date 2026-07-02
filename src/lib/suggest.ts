import "server-only";
import type { Diet } from "@/lib/constants";

export interface MealSuggestion {
  imageUrl: string;
  ingredients: string[];
  recipe: string;
  recipeUrl: string;
  cuisine: string;
  /** null when we couldn't determine it. */
  diet: Diet | null;
  /** True when a recipe database match was found (vs. heuristic-only). */
  matched: boolean;
}

const NONVEG_KEYWORDS = [
  "chicken", "beef", "pork", "lamb", "mutton", "goat", "veal", "bacon", "ham",
  "sausage", "salami", "pepperoni", "turkey", "duck", "fish", "salmon", "tuna",
  "cod", "haddock", "anchovy", "sardine", "shrimp", "prawn", "crab", "lobster",
  "clam", "mussel", "oyster", "squid", "octopus", "meat", "steak", "meatball",
];

// Ordered so more specific dishes win. Each entry: [cuisine, keywords].
const CUISINE_KEYWORDS: [string, string[]][] = [
  ["Indian", ["curry", "masala", "tikka", "dal", "daal", "paneer", "biryani", "korma", "vindaloo", "samosa", "naan", "tandoori", "saag", "chana", "roti", "dosa"]],
  ["Thai", ["pad thai", "tom yum", "green curry", "red curry", "satay", "massaman"]],
  ["Japanese", ["sushi", "ramen", "miso", "teriyaki", "tempura", "udon", "katsu", "donburi", "yakitori"]],
  ["Korean", ["kimchi", "bibimbap", "bulgogi", "gochujang", "japchae", "tteokbokki"]],
  ["Vietnamese", ["pho", "banh mi", "goi cuon"]],
  ["Chinese", ["stir-fry", "stir fry", "kung pao", "chow mein", "fried rice", "dumpling", "wonton", "szechuan", "sichuan", "lo mein", "spring roll", "mapo"]],
  ["Mexican", ["taco", "burrito", "quesadilla", "enchilada", "fajita", "nachos", "guacamole", "tostada", "chilaquiles"]],
  ["Italian", ["pasta", "spaghetti", "risotto", "pizza", "lasagna", "carbonara", "gnocchi", "ravioli", "bolognese", "pesto", "parmigiana", "bruschetta"]],
  ["French", ["ratatouille", "baguette", "quiche", "croissant", "coq au vin", "bourguignon", "cassoulet"]],
  ["Greek", ["gyro", "tzatziki", "souvlaki", "moussaka", "spanakopita", "greek salad"]],
  ["Middle Eastern", ["hummus", "falafel", "shawarma", "kebab", "tabbouleh", "baba ganoush", "shakshuka"]],
  ["American", ["burger", "mac and cheese", "bbq", "meatloaf", "cornbread", "pancake", "hot dog", "buffalo wings"]],
  ["Spanish", ["paella", "tapas", "gazpacho", "tortilla espanola", "chorizo"]],
];

export function inferDiet(title: string): Diet | null {
  const t = title.toLowerCase();
  if (NONVEG_KEYWORDS.some((k) => new RegExp(`\\b${k}`, "i").test(t))) {
    return "nonveg";
  }
  return null;
}

export function inferCuisine(title: string): string {
  const t = title.toLowerCase();
  for (const [cuisine, keywords] of CUISINE_KEYWORDS) {
    if (keywords.some((k) => t.includes(k))) return cuisine;
  }
  return "";
}

export async function fetchUnsplashImage(query: string): Promise<string> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return "";
  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", `${query} food`);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("content_filter", "high");
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
    });
    if (!res.ok) return "";
    const data = (await res.json()) as {
      results?: { urls?: { regular?: string; small?: string } }[];
    };
    const urls = data.results?.[0]?.urls;
    return urls?.regular ?? urls?.small ?? "";
  } catch {
    return "";
  }
}

interface SpoonacularHit {
  imageUrl: string;
  ingredients: string[];
  recipe: string;
  recipeUrl: string;
  cuisine: string;
  diet: Diet | null;
}

async function fetchSpoonacularRecipe(
  query: string
): Promise<SpoonacularHit | null> {
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) return null;
  try {
    const url = new URL("https://api.spoonacular.com/recipes/complexSearch");
    url.searchParams.set("query", query);
    url.searchParams.set("number", "1");
    url.searchParams.set("addRecipeInformation", "true");
    url.searchParams.set("fillIngredients", "true");
    url.searchParams.set("instructionsRequired", "true");
    url.searchParams.set("apiKey", key);

    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{
        image?: string;
        sourceUrl?: string;
        vegetarian?: boolean;
        cuisines?: string[];
        extendedIngredients?: { original?: string }[];
        analyzedInstructions?: { steps?: { number?: number; step?: string }[] }[];
      }>;
    };
    const hit = data.results?.[0];
    if (!hit) return null;

    const ingredients = (hit.extendedIngredients ?? [])
      .map((i) => i.original?.trim())
      .filter((s): s is string => !!s);

    const steps = hit.analyzedInstructions?.[0]?.steps ?? [];
    const recipe = steps
      .map((s) => `${s.number ?? ""}. ${s.step ?? ""}`.trim())
      .filter((s) => s.length > 2)
      .join("\n");

    return {
      imageUrl: hit.image ?? "",
      ingredients: [...new Set(ingredients)],
      recipe,
      recipeUrl: hit.sourceUrl ?? "",
      cuisine: hit.cuisines?.[0] ?? "",
      diet: typeof hit.vegetarian === "boolean" ? (hit.vegetarian ? "veg" : "nonveg") : null,
    };
  } catch {
    return null;
  }
}

/** Runs image + recipe lookups in parallel and merges with heuristics. */
export async function getMealSuggestion(title: string): Promise<MealSuggestion> {
  const query = title.trim();
  const [image, recipe] = await Promise.all([
    fetchUnsplashImage(query),
    fetchSpoonacularRecipe(query),
  ]);

  return {
    // Prefer the Unsplash photo; fall back to the recipe's own image.
    imageUrl: image || recipe?.imageUrl || "",
    ingredients: recipe?.ingredients ?? [],
    recipe: recipe?.recipe ?? "",
    recipeUrl: recipe?.recipeUrl ?? "",
    cuisine: recipe?.cuisine || inferCuisine(query),
    diet: recipe?.diet ?? inferDiet(query),
    matched: !!recipe,
  };
}
