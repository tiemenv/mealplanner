/**
 * Seeds ~100 meals into a user's PERSONAL library, with ingredients, a recipe
 * link, and a best-effort image for each.
 *
 * Usage:
 *   npm run seed                       # seed missing meals + backfill assets
 *   npm run seed -- <clerkUserId>      # seed a specific user
 *   npm run seed -- <clerkUserId> --wipe   # delete that user's meals first
 *   npm run seed -- --no-images        # skip image fetching (still sets data)
 *   npm run seed -- --refresh-images   # re-fetch images even if already set
 *   npm run seed -- --refresh-data     # re-set ingredients/recipe links too
 *
 * Image methodology (best-effort, no API keys), in priority order:
 *   1. TheMealDB  — curated real photos for dishes in its database
 *   2. Wikipedia  — the dish article's lead image (broad, fairly accurate)
 *   3. LoremFlickr — keyword fallback (food photo, not always the exact dish)
 *
 * Reads MONGODB_URI from .env / .env.local (same as the app).
 */
import { loadEnvConfig } from "@next/env";
import mongoose, { Schema } from "mongoose";

loadEnvConfig(process.cwd());

const DEFAULT_CLERK_USER_ID = "user_3FrmmlzM9xfjMnqz2MlLZCmpKs6";

type Diet = "veg" | "nonveg";
type MealType = "breakfast" | "lunch" | "dinner";

interface SeedMeal {
  name: string;
  diet: Diet;
  // shorthand: b = breakfast, l = lunch, d = dinner
  types: string;
  cuisine: string;
  ingredients: string[];
}

// Note: eggs/dairy are treated as vegetarian; meat/poultry/fish/seafood as non-veg.
const RAW: SeedMeal[] = [
  // --- Breakfast ---
  { name: "Veggie Omelette", diet: "veg", types: "b", cuisine: "American", ingredients: ["3 eggs", "Bell pepper", "Onion", "Spinach", "Cheese", "Salt & pepper"] },
  { name: "Buttermilk Pancakes", diet: "veg", types: "b", cuisine: "American", ingredients: ["Flour", "Buttermilk", "Egg", "Baking powder", "Butter", "Maple syrup"] },
  { name: "Bacon & Eggs", diet: "nonveg", types: "b", cuisine: "American", ingredients: ["Bacon", "Eggs", "Butter", "Toast", "Salt & pepper"] },
  { name: "Avocado Toast", diet: "veg", types: "b l", cuisine: "American", ingredients: ["Sourdough bread", "Avocado", "Lemon juice", "Chili flakes", "Olive oil", "Salt"] },
  { name: "Granola & Berry Bowl", diet: "veg", types: "b", cuisine: "American", ingredients: ["Granola", "Greek yogurt", "Mixed berries", "Honey", "Chia seeds"] },
  { name: "Banana Oat Smoothie", diet: "veg", types: "b", cuisine: "American", ingredients: ["Banana", "Rolled oats", "Milk", "Peanut butter", "Honey"] },
  { name: "Chia Seed Pudding", diet: "veg", types: "b", cuisine: "American", ingredients: ["Chia seeds", "Milk", "Vanilla", "Maple syrup", "Berries"] },
  { name: "Smoked Salmon Bagel", diet: "nonveg", types: "b", cuisine: "American", ingredients: ["Bagel", "Smoked salmon", "Cream cheese", "Capers", "Red onion", "Dill"] },
  { name: "Greek Yogurt Parfait", diet: "veg", types: "b", cuisine: "Mediterranean", ingredients: ["Greek yogurt", "Granola", "Honey", "Strawberries", "Blueberries"] },
  { name: "Masala Dosa", diet: "veg", types: "b l", cuisine: "Indian", ingredients: ["Dosa batter", "Potatoes", "Onion", "Mustard seeds", "Turmeric", "Curry leaves"] },
  { name: "Idli with Sambar", diet: "veg", types: "b", cuisine: "Indian", ingredients: ["Idli batter", "Toor dal", "Mixed vegetables", "Sambar powder", "Tamarind"] },
  { name: "Aloo Paratha", diet: "veg", types: "b", cuisine: "Indian", ingredients: ["Whole wheat flour", "Potatoes", "Green chili", "Coriander", "Cumin", "Ghee"] },
  { name: "Poha", diet: "veg", types: "b", cuisine: "Indian", ingredients: ["Flattened rice", "Onion", "Peanuts", "Mustard seeds", "Turmeric", "Curry leaves"] },
  { name: "Upma", diet: "veg", types: "b", cuisine: "Indian", ingredients: ["Semolina", "Onion", "Mustard seeds", "Green chili", "Curry leaves", "Ghee"] },
  { name: "Shakshuka", diet: "veg", types: "b l", cuisine: "Middle Eastern", ingredients: ["Eggs", "Tomatoes", "Bell pepper", "Onion", "Paprika", "Cumin"] },
  { name: "Congee with Pork", diet: "nonveg", types: "b", cuisine: "Chinese", ingredients: ["Rice", "Pork", "Ginger", "Scallions", "Soy sauce", "White pepper"] },
  { name: "Scallion Pancakes", diet: "veg", types: "b l", cuisine: "Chinese", ingredients: ["Flour", "Scallions", "Sesame oil", "Salt", "Vegetable oil"] },
  { name: "Tamago Kake Gohan", diet: "veg", types: "b", cuisine: "Japanese", ingredients: ["Steamed rice", "Egg", "Soy sauce", "Scallions"] },
  { name: "Breakfast Burrito", diet: "nonveg", types: "b", cuisine: "Mexican", ingredients: ["Flour tortilla", "Eggs", "Chorizo", "Potatoes", "Cheese", "Salsa"] },
  { name: "Chilaquiles Verdes", diet: "veg", types: "b", cuisine: "Mexican", ingredients: ["Tortilla chips", "Salsa verde", "Eggs", "Onion", "Cotija cheese", "Cilantro"] },
  { name: "French Toast", diet: "veg", types: "b", cuisine: "French", ingredients: ["Bread", "Eggs", "Milk", "Cinnamon", "Vanilla", "Maple syrup"] },
  { name: "Croissant & Jam", diet: "veg", types: "b", cuisine: "French", ingredients: ["Croissant", "Butter", "Strawberry jam"] },
  { name: "Full English Breakfast", diet: "nonveg", types: "b", cuisine: "British", ingredients: ["Sausages", "Bacon", "Eggs", "Baked beans", "Tomato", "Toast"] },
  { name: "Quiche Lorraine", diet: "nonveg", types: "b l", cuisine: "French", ingredients: ["Pie crust", "Eggs", "Cream", "Bacon", "Gruyère", "Nutmeg"] },

  // --- Italian ---
  { name: "Margherita Pizza", diet: "veg", types: "l d", cuisine: "Italian", ingredients: ["Pizza dough", "Tomato sauce", "Mozzarella", "Fresh basil", "Olive oil"] },
  { name: "Pepperoni Pizza", diet: "nonveg", types: "l d", cuisine: "Italian", ingredients: ["Pizza dough", "Tomato sauce", "Mozzarella", "Pepperoni", "Oregano"] },
  { name: "Spaghetti Carbonara", diet: "nonveg", types: "d", cuisine: "Italian", ingredients: ["Spaghetti", "Eggs", "Pancetta", "Parmesan", "Black pepper"] },
  { name: "Penne Arrabbiata", diet: "veg", types: "l d", cuisine: "Italian", ingredients: ["Penne", "Tomatoes", "Garlic", "Chili flakes", "Olive oil", "Parsley"] },
  { name: "Lasagna Bolognese", diet: "nonveg", types: "d", cuisine: "Italian", ingredients: ["Lasagna sheets", "Ground beef", "Tomato sauce", "Béchamel", "Parmesan", "Onion"] },
  { name: "Mushroom Risotto", diet: "veg", types: "d", cuisine: "Italian", ingredients: ["Arborio rice", "Mushrooms", "Onion", "White wine", "Parmesan", "Butter"] },
  { name: "Caprese Salad", diet: "veg", types: "l", cuisine: "Italian", ingredients: ["Tomatoes", "Fresh mozzarella", "Basil", "Olive oil", "Balsamic"] },
  { name: "Eggplant Parmigiana", diet: "veg", types: "d", cuisine: "Italian", ingredients: ["Eggplant", "Tomato sauce", "Mozzarella", "Parmesan", "Basil", "Breadcrumbs"] },
  { name: "Spaghetti Aglio e Olio", diet: "veg", types: "l d", cuisine: "Italian", ingredients: ["Spaghetti", "Garlic", "Olive oil", "Chili flakes", "Parsley", "Parmesan"] },
  { name: "Chicken Alfredo", diet: "nonveg", types: "d", cuisine: "Italian", ingredients: ["Fettuccine", "Chicken breast", "Cream", "Parmesan", "Butter", "Garlic"] },
  { name: "Minestrone Soup", diet: "veg", types: "l d", cuisine: "Italian", ingredients: ["Mixed vegetables", "Cannellini beans", "Tomatoes", "Pasta", "Vegetable stock", "Basil"] },

  // --- Indian ---
  { name: "Chana Masala", diet: "veg", types: "l d", cuisine: "Indian", ingredients: ["Chickpeas", "Onion", "Tomatoes", "Ginger-garlic", "Garam masala", "Cumin"] },
  { name: "Paneer Butter Masala", diet: "veg", types: "l d", cuisine: "Indian", ingredients: ["Paneer", "Tomatoes", "Cream", "Butter", "Cashews", "Garam masala"] },
  { name: "Chicken Tikka Masala", diet: "nonveg", types: "d", cuisine: "Indian", ingredients: ["Chicken", "Yogurt", "Tomatoes", "Cream", "Garam masala", "Ginger-garlic"] },
  { name: "Butter Chicken", diet: "nonveg", types: "d", cuisine: "Indian", ingredients: ["Chicken", "Tomatoes", "Butter", "Cream", "Fenugreek", "Garam masala"] },
  { name: "Dal Tadka", diet: "veg", types: "l d", cuisine: "Indian", ingredients: ["Toor dal", "Onion", "Tomato", "Cumin", "Turmeric", "Ghee"] },
  { name: "Palak Paneer", diet: "veg", types: "l d", cuisine: "Indian", ingredients: ["Spinach", "Paneer", "Onion", "Garlic", "Cream", "Garam masala"] },
  { name: "Vegetable Biryani", diet: "veg", types: "l d", cuisine: "Indian", ingredients: ["Basmati rice", "Mixed vegetables", "Yogurt", "Biryani masala", "Saffron", "Fried onions"] },
  { name: "Chicken Biryani", diet: "nonveg", types: "l d", cuisine: "Indian", ingredients: ["Basmati rice", "Chicken", "Yogurt", "Biryani masala", "Saffron", "Fried onions"] },
  { name: "Rogan Josh", diet: "nonveg", types: "d", cuisine: "Indian", ingredients: ["Lamb", "Yogurt", "Onion", "Kashmiri chili", "Garam masala", "Ginger-garlic"] },
  { name: "Aloo Gobi", diet: "veg", types: "l d", cuisine: "Indian", ingredients: ["Potatoes", "Cauliflower", "Onion", "Tomato", "Turmeric", "Cumin"] },
  { name: "Rajma Chawal", diet: "veg", types: "l d", cuisine: "Indian", ingredients: ["Kidney beans", "Onion", "Tomato", "Ginger-garlic", "Garam masala", "Rice"] },
  { name: "Goan Fish Curry", diet: "nonveg", types: "d", cuisine: "Indian", ingredients: ["Fish", "Coconut milk", "Tamarind", "Red chili", "Turmeric", "Curry leaves"] },

  // --- Mexican ---
  { name: "Chicken Tacos", diet: "nonveg", types: "l d", cuisine: "Mexican", ingredients: ["Corn tortillas", "Chicken", "Onion", "Cilantro", "Lime", "Salsa"] },
  { name: "Veggie Burrito", diet: "veg", types: "l d", cuisine: "Mexican", ingredients: ["Flour tortilla", "Rice", "Black beans", "Bell pepper", "Cheese", "Guacamole"] },
  { name: "Beef Enchiladas", diet: "nonveg", types: "d", cuisine: "Mexican", ingredients: ["Tortillas", "Ground beef", "Enchilada sauce", "Cheese", "Onion"] },
  { name: "Cheese Quesadilla", diet: "veg", types: "l", cuisine: "Mexican", ingredients: ["Flour tortilla", "Cheddar", "Monterey jack", "Butter"] },
  { name: "Chicken Fajitas", diet: "nonveg", types: "d", cuisine: "Mexican", ingredients: ["Chicken", "Bell peppers", "Onion", "Fajita seasoning", "Tortillas", "Lime"] },
  { name: "Black Bean Tostadas", diet: "veg", types: "l d", cuisine: "Mexican", ingredients: ["Tostada shells", "Black beans", "Lettuce", "Cheese", "Avocado", "Salsa"] },
  { name: "Guacamole & Chips", diet: "veg", types: "l", cuisine: "Mexican", ingredients: ["Avocado", "Lime", "Onion", "Tomato", "Cilantro", "Tortilla chips"] },

  // --- Chinese ---
  { name: "Kung Pao Chicken", diet: "nonveg", types: "d", cuisine: "Chinese", ingredients: ["Chicken", "Peanuts", "Dried chilies", "Soy sauce", "Garlic", "Scallions"] },
  { name: "Mapo Tofu", diet: "veg", types: "l d", cuisine: "Chinese", ingredients: ["Tofu", "Doubanjiang", "Garlic", "Ginger", "Sichuan peppercorn", "Scallions"] },
  { name: "Sweet and Sour Pork", diet: "nonveg", types: "d", cuisine: "Chinese", ingredients: ["Pork", "Bell pepper", "Pineapple", "Vinegar", "Ketchup", "Sugar"] },
  { name: "Vegetable Chow Mein", diet: "veg", types: "l d", cuisine: "Chinese", ingredients: ["Noodles", "Cabbage", "Carrot", "Bell pepper", "Soy sauce", "Sesame oil"] },
  { name: "Beef and Broccoli", diet: "nonveg", types: "d", cuisine: "Chinese", ingredients: ["Beef", "Broccoli", "Soy sauce", "Garlic", "Ginger", "Oyster sauce"] },
  { name: "Egg Fried Rice", diet: "veg", types: "l d", cuisine: "Chinese", ingredients: ["Cooked rice", "Eggs", "Peas", "Carrot", "Scallions", "Soy sauce"] },
  { name: "Vegetable Spring Rolls", diet: "veg", types: "l", cuisine: "Chinese", ingredients: ["Spring roll wrappers", "Cabbage", "Carrot", "Bean sprouts", "Soy sauce"] },
  { name: "Hot and Sour Soup", diet: "veg", types: "l", cuisine: "Chinese", ingredients: ["Tofu", "Mushrooms", "Bamboo shoots", "Vinegar", "White pepper", "Egg"] },
  { name: "General Tso's Chicken", diet: "nonveg", types: "d", cuisine: "Chinese", ingredients: ["Chicken", "Soy sauce", "Sugar", "Garlic", "Dried chili", "Cornstarch"] },

  // --- Japanese ---
  { name: "Chicken Teriyaki", diet: "nonveg", types: "d", cuisine: "Japanese", ingredients: ["Chicken thighs", "Soy sauce", "Mirin", "Sugar", "Ginger", "Sesame"] },
  { name: "Salmon Sushi Rolls", diet: "nonveg", types: "l d", cuisine: "Japanese", ingredients: ["Sushi rice", "Nori", "Salmon", "Cucumber", "Avocado", "Rice vinegar"] },
  { name: "Vegetable Tempura", diet: "veg", types: "l d", cuisine: "Japanese", ingredients: ["Mixed vegetables", "Tempura flour", "Cold water", "Soy dipping sauce"] },
  { name: "Shoyu Ramen", diet: "nonveg", types: "l d", cuisine: "Japanese", ingredients: ["Ramen noodles", "Chicken broth", "Soy sauce", "Soft egg", "Scallions", "Nori"] },
  { name: "Veggie Udon", diet: "veg", types: "l d", cuisine: "Japanese", ingredients: ["Udon noodles", "Dashi", "Soy sauce", "Mushrooms", "Scallions", "Tofu"] },
  { name: "Katsu Curry", diet: "nonveg", types: "d", cuisine: "Japanese", ingredients: ["Pork cutlet", "Panko", "Curry roux", "Onion", "Carrot", "Rice"] },
  { name: "Edamame", diet: "veg", types: "l", cuisine: "Japanese", ingredients: ["Edamame pods", "Sea salt"] },

  // --- Thai ---
  { name: "Chicken Pad Thai", diet: "nonveg", types: "l d", cuisine: "Thai", ingredients: ["Rice noodles", "Chicken", "Eggs", "Bean sprouts", "Tamarind", "Peanuts"] },
  { name: "Thai Green Curry", diet: "veg", types: "d", cuisine: "Thai", ingredients: ["Green curry paste", "Coconut milk", "Mixed vegetables", "Tofu", "Thai basil", "Rice"] },
  { name: "Massaman Beef Curry", diet: "nonveg", types: "d", cuisine: "Thai", ingredients: ["Beef", "Massaman paste", "Coconut milk", "Potatoes", "Peanuts", "Onion"] },
  { name: "Tom Yum Soup", diet: "nonveg", types: "l", cuisine: "Thai", ingredients: ["Shrimp", "Lemongrass", "Galangal", "Lime leaves", "Chili", "Mushrooms"] },
  { name: "Tofu Pad See Ew", diet: "veg", types: "l d", cuisine: "Thai", ingredients: ["Wide rice noodles", "Tofu", "Chinese broccoli", "Soy sauce", "Egg", "Garlic"] },
  { name: "Thai Basil Chicken", diet: "nonveg", types: "d", cuisine: "Thai", ingredients: ["Chicken", "Thai basil", "Garlic", "Chili", "Soy sauce", "Fish sauce"] },
  { name: "Mango Sticky Rice", diet: "veg", types: "d", cuisine: "Thai", ingredients: ["Glutinous rice", "Mango", "Coconut milk", "Sugar", "Salt"] },

  // --- Middle Eastern / Mediterranean ---
  { name: "Falafel Wrap", diet: "veg", types: "l d", cuisine: "Middle Eastern", ingredients: ["Chickpeas", "Garlic", "Parsley", "Cumin", "Pita", "Tahini sauce"] },
  { name: "Chicken Shawarma", diet: "nonveg", types: "l d", cuisine: "Middle Eastern", ingredients: ["Chicken", "Yogurt", "Garlic", "Shawarma spices", "Pita", "Garlic sauce"] },
  { name: "Hummus & Pita", diet: "veg", types: "l", cuisine: "Middle Eastern", ingredients: ["Chickpeas", "Tahini", "Lemon", "Garlic", "Olive oil", "Pita"] },
  { name: "Greek Salad", diet: "veg", types: "l", cuisine: "Mediterranean", ingredients: ["Tomatoes", "Cucumber", "Red onion", "Feta", "Olives", "Olive oil"] },
  { name: "Beef Kofta", diet: "nonveg", types: "d", cuisine: "Middle Eastern", ingredients: ["Ground beef", "Onion", "Parsley", "Cumin", "Coriander", "Garlic"] },
  { name: "Tabbouleh", diet: "veg", types: "l", cuisine: "Middle Eastern", ingredients: ["Bulgur", "Parsley", "Tomatoes", "Mint", "Lemon", "Olive oil"] },
  { name: "Lamb Gyro", diet: "nonveg", types: "l d", cuisine: "Mediterranean", ingredients: ["Lamb", "Pita", "Tzatziki", "Tomato", "Onion", "Lettuce"] },
  { name: "Baba Ganoush", diet: "veg", types: "l", cuisine: "Middle Eastern", ingredients: ["Eggplant", "Tahini", "Garlic", "Lemon", "Olive oil", "Parsley"] },
  { name: "Lentil Soup", diet: "veg", types: "l d", cuisine: "Mediterranean", ingredients: ["Red lentils", "Onion", "Carrot", "Cumin", "Garlic", "Vegetable stock"] },

  // --- American / Comfort ---
  { name: "Classic Cheeseburger", diet: "nonveg", types: "l d", cuisine: "American", ingredients: ["Beef patty", "Burger bun", "Cheddar", "Lettuce", "Tomato", "Onion"] },
  { name: "Grilled Cheese", diet: "veg", types: "l", cuisine: "American", ingredients: ["Bread", "Cheddar", "Butter"] },
  { name: "Caesar Salad", diet: "veg", types: "l", cuisine: "American", ingredients: ["Romaine", "Croutons", "Parmesan", "Caesar dressing", "Black pepper"] },
  { name: "BBQ Pork Ribs", diet: "nonveg", types: "d", cuisine: "American", ingredients: ["Pork ribs", "BBQ sauce", "Brown sugar", "Paprika", "Garlic powder"] },
  { name: "Mac and Cheese", diet: "veg", types: "l d", cuisine: "American", ingredients: ["Macaroni", "Cheddar", "Milk", "Butter", "Flour", "Breadcrumbs"] },
  { name: "Buffalo Wings", diet: "nonveg", types: "d", cuisine: "American", ingredients: ["Chicken wings", "Hot sauce", "Butter", "Garlic powder", "Celery"] },
  { name: "Cobb Salad", diet: "nonveg", types: "l", cuisine: "American", ingredients: ["Lettuce", "Chicken", "Bacon", "Egg", "Avocado", "Blue cheese"] },
  { name: "Black Bean Veggie Burger", diet: "veg", types: "l d", cuisine: "American", ingredients: ["Black beans", "Breadcrumbs", "Onion", "Cumin", "Burger bun", "Lettuce"] },
  { name: "Roast Chicken Dinner", diet: "nonveg", types: "d", cuisine: "American", ingredients: ["Whole chicken", "Potatoes", "Carrots", "Rosemary", "Garlic", "Butter"] },
  { name: "Grilled Salmon & Veg", diet: "nonveg", types: "d", cuisine: "American", ingredients: ["Salmon fillet", "Asparagus", "Lemon", "Olive oil", "Garlic", "Dill"] },
  { name: "Stuffed Bell Peppers", diet: "veg", types: "d", cuisine: "American", ingredients: ["Bell peppers", "Rice", "Tomato", "Onion", "Cheese", "Herbs"] },
  { name: "Tomato Basil Soup", diet: "veg", types: "l", cuisine: "American", ingredients: ["Tomatoes", "Onion", "Garlic", "Basil", "Cream", "Vegetable stock"] },

  // --- French / British ---
  { name: "Ratatouille", diet: "veg", types: "d", cuisine: "French", ingredients: ["Eggplant", "Zucchini", "Bell pepper", "Tomatoes", "Onion", "Herbes de Provence"] },
  { name: "Beef Bourguignon", diet: "nonveg", types: "d", cuisine: "French", ingredients: ["Beef", "Red wine", "Carrots", "Onion", "Mushrooms", "Bacon"] },
  { name: "Croque Monsieur", diet: "nonveg", types: "l", cuisine: "French", ingredients: ["Bread", "Ham", "Gruyère", "Béchamel", "Dijon mustard"] },
  { name: "French Onion Soup", diet: "veg", types: "l", cuisine: "French", ingredients: ["Onions", "Vegetable stock", "Baguette", "Gruyère", "Butter", "Thyme"] },
  { name: "Fish and Chips", diet: "nonveg", types: "l d", cuisine: "British", ingredients: ["White fish", "Potatoes", "Flour", "Beer batter", "Peas", "Malt vinegar"] },
  { name: "Shepherd's Pie", diet: "nonveg", types: "d", cuisine: "British", ingredients: ["Ground lamb", "Mashed potatoes", "Carrots", "Peas", "Onion", "Gravy"] },

  // --- Korean ---
  { name: "Bibimbap", diet: "veg", types: "l d", cuisine: "Korean", ingredients: ["Rice", "Spinach", "Carrot", "Mushrooms", "Egg", "Gochujang"] },
  { name: "Beef Bulgogi", diet: "nonveg", types: "d", cuisine: "Korean", ingredients: ["Beef", "Soy sauce", "Pear", "Garlic", "Sesame oil", "Scallions"] },
  { name: "Kimchi Fried Rice", diet: "veg", types: "l d", cuisine: "Korean", ingredients: ["Rice", "Kimchi", "Egg", "Scallions", "Sesame oil", "Gochujang"] },
  { name: "Korean Fried Chicken", diet: "nonveg", types: "d", cuisine: "Korean", ingredients: ["Chicken", "Cornstarch", "Gochujang", "Soy sauce", "Garlic", "Honey"] },
  { name: "Soondubu Jjigae", diet: "veg", types: "l d", cuisine: "Korean", ingredients: ["Soft tofu", "Kimchi", "Mushrooms", "Gochugaru", "Egg", "Scallions"] },

  // --- Extra veg-friendly mains ---
  { name: "Vegetable Stir Fry", diet: "veg", types: "l d", cuisine: "Asian", ingredients: ["Mixed vegetables", "Soy sauce", "Garlic", "Ginger", "Sesame oil", "Rice"] },
  { name: "Chickpea Buddha Bowl", diet: "veg", types: "l d", cuisine: "American", ingredients: ["Chickpeas", "Quinoa", "Kale", "Sweet potato", "Tahini", "Avocado"] },
  { name: "Caprese Panini", diet: "veg", types: "l", cuisine: "Italian", ingredients: ["Ciabatta", "Mozzarella", "Tomato", "Basil", "Pesto", "Balsamic"] },
];

const typeMap: Record<string, MealType> = {
  b: "breakfast",
  l: "lunch",
  d: "dinner",
};

function parseTypes(shorthand: string): MealType[] {
  return shorthand
    .split(/\s+/)
    .map((t) => typeMap[t])
    .filter(Boolean);
}

/** A working "sample" recipe link: an AllRecipes search for the dish. */
function recipeLink(name: string): string {
  return `https://www.allrecipes.com/search?q=${encodeURIComponent(name)}`;
}

const MealSchema = new Schema(
  {
    ownerKey: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    diet: { type: String, enum: ["veg", "nonveg"], required: true },
    mealTypes: { type: [String], required: true },
    cuisine: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    ingredients: { type: [String], default: [] },
    recipe: { type: String, default: "" },
    recipeUrl: { type: String, default: "" },
    createdByClerkId: { type: String, required: true },
  },
  { timestamps: true }
);

const Meal = mongoose.models.Meal || mongoose.model("Meal", MealSchema);

// ---------------------------------------------------------------------------
// Image fetching — TheMealDB -> Wikipedia -> LoremFlickr
// ---------------------------------------------------------------------------

type ImageSource = "themealdb" | "wikipedia" | "fallback";

const STOP_WORDS = new Set([
  "with",
  "and",
  "the",
  "of",
  "a",
  "classic",
  "veggie",
  "vegetable",
  "fresh",
  "homemade",
]);

async function fetchJson(url: string, ms = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "mealplanner-seed/1.0" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** TheMealDB: curated, real photos for dishes in its (~300 meal) database. */
async function fromMealDb(query: string): Promise<string | null> {
  const data = (await fetchJson(
    `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(
      query
    )}`
  )) as { meals?: Array<{ strMealThumb?: string }> } | null;
  return data?.meals?.[0]?.strMealThumb ?? null;
}

/** Wikipedia: the dish article's lead image via the REST summary endpoint. */
async function fromWikipedia(title: string): Promise<string | null> {
  const data = (await fetchJson(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title
    )}?redirect=true`
  )) as {
    type?: string;
    thumbnail?: { source?: string };
    originalimage?: { source?: string };
  } | null;
  if (!data || data.type === "disambiguation") return null;
  return data.thumbnail?.source ?? data.originalimage?.source ?? null;
}

function keywords(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return [...new Set([...words, "food"])].join(",");
}

function stableLock(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 100000;
}

function fallbackImage(name: string): string {
  return `https://loremflickr.com/640/480/${keywords(name)}?lock=${stableLock(
    name
  )}`;
}

async function resolveImage(
  name: string
): Promise<{ url: string; source: ImageSource }> {
  const lastWord = name.split(/\s+/).pop() ?? name;
  for (const q of [name, lastWord]) {
    const thumb = await fromMealDb(q);
    if (thumb) return { url: thumb, source: "themealdb" };
  }
  const wiki = await fromWikipedia(name);
  if (wiki) return { url: wiki, source: "wikipedia" };
  return { url: fallbackImage(name), source: "fallback" };
}

/** Runs `worker` over `items` with a bounded number of concurrent tasks. */
async function pool<T>(
  items: T[],
  size: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, () =>
    (async () => {
      while (cursor < items.length) {
        const index = cursor++;
        await worker(items[index], index);
      }
    })()
  );
  await Promise.all(runners);
}

interface MealDoc {
  _id: unknown;
  name: string;
  imageUrl?: string;
  ingredients?: string[];
  recipeUrl?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const wipe = args.includes("--wipe");
  const noImages = args.includes("--no-images");
  const refreshImages = args.includes("--refresh-images");
  const refreshData = args.includes("--refresh-data");
  const clerkUserId =
    args.find((a) => !a.startsWith("--")) || DEFAULT_CLERK_USER_ID;
  const ownerKey = `user:${clerkUserId}`;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set (check your .env / .env.local).");
  }

  console.log(`Connecting to MongoDB…`);
  await mongoose.connect(uri);
  console.log(`Seeding meals for ${ownerKey}`);

  if (wipe) {
    const { deletedCount } = await Meal.deleteMany({ ownerKey });
    console.log(`Wiped ${deletedCount} existing meal(s).`);
  }

  const rawByName = new Map(RAW.map((m) => [m.name.toLowerCase(), m]));

  const existingNames = new Set<string>(
    (await Meal.find({ ownerKey }).select("name").lean()).map((m) =>
      (m.name as string).toLowerCase()
    )
  );

  const docs = RAW.filter((m) => !existingNames.has(m.name.toLowerCase())).map(
    (m) => ({
      ownerKey,
      name: m.name,
      diet: m.diet,
      mealTypes: parseTypes(m.types),
      cuisine: m.cuisine,
      imageUrl: "",
      ingredients: m.ingredients,
      recipe: "",
      recipeUrl: recipeLink(m.name),
      createdByClerkId: clerkUserId,
    })
  );

  if (docs.length === 0) {
    console.log("No new meals to insert — all already exist.");
  } else {
    await Meal.insertMany(docs);
    console.log(`Inserted ${docs.length} new meal(s).`);
  }

  // --- Backfill ingredients & recipe links on existing meals ---
  const all = (await Meal.find({ ownerKey })
    .select("name imageUrl ingredients recipeUrl")
    .lean()) as MealDoc[];

  let dataUpdated = 0;
  for (const m of all) {
    const curated = rawByName.get(m.name.toLowerCase());
    if (!curated) continue;
    const set: Record<string, unknown> = {};
    if (refreshData || !m.ingredients?.length) {
      set.ingredients = curated.ingredients;
    }
    if (refreshData || !m.recipeUrl) {
      set.recipeUrl = recipeLink(m.name);
    }
    if (Object.keys(set).length > 0) {
      await Meal.updateOne({ _id: m._id }, { $set: set });
      dataUpdated++;
    }
  }
  console.log(`Updated ingredients/recipe links on ${dataUpdated} meal(s).`);

  // --- Fetch images ---
  if (!noImages) {
    const targets = all.filter((m) => refreshImages || !m.imageUrl);
    if (targets.length === 0) {
      console.log("All meals already have images.");
    } else {
      console.log(`Fetching images for ${targets.length} meal(s)…`);
      const counts: Record<ImageSource, number> = {
        themealdb: 0,
        wikipedia: 0,
        fallback: 0,
      };
      let done = 0;
      await pool(targets, 6, async (m) => {
        const { url, source } = await resolveImage(m.name);
        await Meal.updateOne({ _id: m._id }, { $set: { imageUrl: url } });
        counts[source]++;
        done++;
        if (done % 20 === 0 || done === targets.length) {
          console.log(`  …${done}/${targets.length}`);
        }
      });
      console.log(
        `Images set — TheMealDB: ${counts.themealdb}, Wikipedia: ${counts.wikipedia}, fallback: ${counts.fallback}.`
      );
    }
  }

  const total = await Meal.countDocuments({ ownerKey });
  const veg = await Meal.countDocuments({ ownerKey, diet: "veg" });
  const withImg = await Meal.countDocuments({
    ownerKey,
    imageUrl: { $ne: "" },
  });
  console.log(
    `Done. ${ownerKey} now has ${total} meals (${veg} veg / ${
      total - veg
    } non-veg), ${withImg} with images.`
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
