/**
 * The collection new accounts land on. Data only — `publish-starter-collection.ts`
 * turns it into a Collection document.
 *
 * Two constraints shape the list rather than taste alone:
 *
 * 1. The planner pools meals per meal type and leaves a slot blank when that
 *    pool is empty (src/lib/generate.ts), so breakfast, lunch and dinner each
 *    need seven meals of their own — one per day — in both diets, or the veg
 *    slider at either extreme starts serving the same dish three times.
 * 2. Ingredient amounts are written for two people, because the shopping list
 *    scales everything from `BASE_SERVINGS` up to the household size
 *    (src/lib/shopping.ts). Every line therefore leads with a quantity and a
 *    unit the parser knows, except things bought once and used to taste.
 *
 * `scripts/data/starter-collection.test.ts` holds both to account.
 *
 * Images are deliberately unset: an invented URL 404s on the collection page,
 * where a missing one falls back to a placeholder that looks intentional.
 */
import { DIETS, MEAL_TYPES, type Diet, type MealType } from "../../src/lib/constants";

export interface StarterMeal {
  /** Stable within the collection: the import de-dupe and React keys hang off
   *  it, so it must survive the dish being renamed or reordered. */
  key: string;
  name: string;
  diet: Diet;
  mealTypes: MealType[];
  cuisine: string;
  /** For two servings. */
  ingredients: string[];
  /** Numbered steps, one per line. The UI splits on the newline. */
  recipe: string;
}

export const STARTER_MEALS: StarterMeal[] = [
  // --- Breakfast ---
  {
    key: "masala-scrambled-eggs",
    name: "Masala Scrambled Eggs on Toast",
    diet: "veg",
    mealTypes: ["breakfast"],
    cuisine: "Indian",
    ingredients: [
      "4 eggs",
      "1 onion",
      "1 tomato",
      "1 green chilli",
      "1/2 tsp ground turmeric",
      "15 g butter",
      "4 bread slices",
      "2 tbsp coriander",
      "Salt",
      "Black pepper",
    ],
    recipe: [
      "1. Finely chop the onion, tomato, chilli and coriander.",
      "2. Melt the butter in a non-stick pan over medium heat and soften the onion for 3 minutes.",
      "3. Add the chilli, turmeric and tomato and cook for 2 minutes, until the tomato collapses.",
      "4. Beat the eggs with salt and pepper, pour them in and stir slowly. Take the pan off the heat while they still look slightly wet — they carry on cooking.",
      "5. Fold through the coriander and pile onto toast.",
    ].join("\n"),
  },
  {
    key: "greek-yogurt-granola-bowl",
    name: "Greek Yogurt Bowl with Granola and Berries",
    diet: "veg",
    mealTypes: ["breakfast"],
    cuisine: "Mediterranean",
    ingredients: [
      "400 g plain yogurt",
      "100 g granola",
      "150 g mixed berries",
      "20 g flaked almonds",
      "2 tbsp honey",
    ],
    recipe: [
      "1. Toast the almonds in a dry pan over medium heat for a minute, until they smell nutty. Tip them straight out of the pan.",
      "2. Spoon the yogurt into two bowls.",
      "3. Scatter over the granola, berries and almonds.",
      "4. Drizzle with honey and eat straight away, while the granola is still crisp.",
    ].join("\n"),
  },
  {
    key: "peanut-butter-banana-oats",
    name: "Peanut Butter Banana Oats",
    diet: "veg",
    mealTypes: ["breakfast"],
    cuisine: "American",
    ingredients: [
      "100 g rolled oats",
      "400 ml milk",
      "2 bananas",
      "2 tbsp peanut butter",
      "1 tbsp honey",
      "1/2 tsp ground cinnamon",
      "Salt",
    ],
    recipe: [
      "1. Bring the oats, milk and a pinch of salt to a simmer in a small pan.",
      "2. Cook for 5 minutes, stirring often, until thick and creamy. Loosen with a splash more milk if it tightens too far.",
      "3. Off the heat, stir in the peanut butter and cinnamon.",
      "4. Top with sliced banana and honey.",
    ].join("\n"),
  },
  {
    key: "shakshuka",
    name: "Shakshuka",
    diet: "veg",
    mealTypes: ["breakfast", "lunch"],
    cuisine: "Middle Eastern",
    ingredients: [
      "4 eggs",
      "400 g chopped tomatoes",
      "1 onion",
      "1 red pepper",
      "2 garlic cloves",
      "1 tsp ground cumin",
      "1 tsp paprika",
      "2 tbsp olive oil",
      "2 tbsp parsley",
      "4 bread slices",
      "Salt",
      "Black pepper",
    ],
    recipe: [
      "1. Slice the onion and pepper and soften them in the oil in a wide frying pan for 8 minutes.",
      "2. Add the sliced garlic, cumin and paprika and cook for 1 minute.",
      "3. Pour in the tomatoes, season, and simmer for 10 minutes until thick enough that a spoon leaves a trough.",
      "4. Make four wells, crack an egg into each, cover the pan and cook for 5 to 7 minutes until the whites are set but the yolks still run.",
      "5. Scatter with parsley and serve with bread for scooping.",
    ].join("\n"),
  },
  {
    key: "spinach-feta-omelette",
    name: "Spinach and Feta Omelette",
    diet: "veg",
    mealTypes: ["breakfast"],
    cuisine: "Mediterranean",
    ingredients: [
      "4 eggs",
      "100 g spinach",
      "60 g feta",
      "15 g butter",
      "1 tbsp olive oil",
      "Salt",
      "Black pepper",
    ],
    recipe: [
      "1. Wilt the spinach in the oil in a small non-stick pan, then tip it into a sieve and press out the water. This is what stops the omelette going soggy.",
      "2. Beat the eggs with salt and pepper.",
      "3. Melt half the butter in the pan over medium heat, pour in half the egg and draw the set edges into the middle until the top is just moist.",
      "4. Scatter over half the spinach and crumbled feta, fold, and slide onto a plate.",
      "5. Repeat for the second omelette.",
    ].join("\n"),
  },
  {
    key: "blueberry-buttermilk-pancakes",
    name: "Blueberry Buttermilk Pancakes",
    diet: "veg",
    mealTypes: ["breakfast"],
    cuisine: "American",
    ingredients: [
      "150 g plain flour",
      "250 ml buttermilk",
      "2 eggs",
      "100 g blueberries",
      "20 g butter",
      "1 tbsp sugar",
      "1 tsp baking powder",
      "2 tbsp maple syrup",
      "Salt",
    ],
    recipe: [
      "1. Whisk the flour, sugar, baking powder and a pinch of salt in a bowl.",
      "2. Beat the eggs into the buttermilk, pour into the dry mix and stir until only just combined — lumps are fine, over-mixing makes them tough.",
      "3. Rest the batter for 10 minutes.",
      "4. Melt a little butter in a non-stick pan over medium-low heat and cook the pancakes in batches, dropping a few blueberries onto each one as it sets.",
      "5. Flip when bubbles hold their shape, give them another minute, and serve with maple syrup.",
    ].join("\n"),
  },
  {
    key: "avocado-chilli-toast",
    name: "Avocado and Chilli Toast",
    diet: "veg",
    mealTypes: ["breakfast", "lunch"],
    cuisine: "American",
    ingredients: [
      "2 avocados",
      "4 bread slices",
      "1 lemon",
      "2 tbsp olive oil",
      "1/2 tsp chilli flakes",
      "Salt",
      "Black pepper",
    ],
    recipe: [
      "1. Toast the bread well — it needs to hold the weight.",
      "2. Scoop the avocados into a bowl, add the juice of half the lemon, salt and pepper, and crush roughly with a fork.",
      "3. Taste and add more lemon until it tastes bright rather than flat.",
      "4. Pile onto the toast, drizzle with olive oil and scatter over the chilli flakes.",
    ].join("\n"),
  },
  {
    key: "bacon-egg-breakfast-muffins",
    name: "Bacon and Egg Breakfast Muffins",
    diet: "nonveg",
    mealTypes: ["breakfast"],
    cuisine: "British",
    ingredients: [
      "6 eggs",
      "4 bacon rashers",
      "60 g cheddar",
      "2 spring onions",
      "1 tsp olive oil",
      "Salt",
      "Black pepper",
    ],
    recipe: [
      "1. Heat the oven to 190C and oil six holes of a muffin tin.",
      "2. Fry the chopped bacon until crisp, then divide it between the holes with the sliced spring onions.",
      "3. Beat the eggs with the grated cheddar, salt and pepper, and pour in until each hole is three-quarters full.",
      "4. Bake for 15 to 18 minutes, until puffed and just firm in the centre.",
      "5. Cool for 2 minutes before lifting them out, or they stick.",
    ].join("\n"),
  },
  {
    key: "smoked-salmon-bagels",
    name: "Smoked Salmon and Cream Cheese Bagels",
    diet: "nonveg",
    mealTypes: ["breakfast"],
    cuisine: "American",
    ingredients: [
      "2 bagels",
      "120 g smoked salmon",
      "80 g cream cheese",
      "1/2 red onion",
      "1 lemon",
      "1 tbsp capers",
      "1 tbsp dill",
      "Black pepper",
    ],
    recipe: [
      "1. Slice and toast the bagels.",
      "2. Slice the red onion as thinly as you can and squeeze over a little lemon juice to take the raw edge off.",
      "3. Spread the cream cheese thickly over the bagel halves.",
      "4. Layer on the salmon, onion, capers and dill, then finish with black pepper and a squeeze of lemon.",
    ].join("\n"),
  },
  {
    key: "chorizo-potato-hash",
    name: "Chorizo and Potato Hash with Fried Eggs",
    diet: "nonveg",
    mealTypes: ["breakfast"],
    cuisine: "Spanish",
    ingredients: [
      "400 g potatoes",
      "120 g chorizo",
      "1 onion",
      "1 red pepper",
      "2 eggs",
      "1 tsp paprika",
      "2 tbsp olive oil",
      "2 tbsp parsley",
      "Salt",
      "Black pepper",
    ],
    recipe: [
      "1. Dice the potatoes small and boil for 6 minutes, until just tender. Drain and let them steam dry.",
      "2. Fry the diced chorizo in a large pan over medium heat until its oil runs, then lift it out.",
      "3. Cook the potatoes in the chorizo oil, adding olive oil if needed, pressing them flat and turning only every few minutes so they crust.",
      "4. Add the chopped onion and pepper and cook for 6 minutes, then return the chorizo with the paprika.",
      "5. Fry the eggs separately and set one on each portion. Finish with parsley.",
    ].join("\n"),
  },
  {
    key: "chicken-ginger-congee",
    name: "Chicken and Ginger Congee",
    diet: "nonveg",
    // Breakfast only, and the quesadillas below likewise: with five non-veg
    // breakfasts and seven mornings to fill, letting lunch borrow from that
    // pool is what starts a week repeating.
    mealTypes: ["breakfast"],
    cuisine: "Chinese",
    ingredients: [
      "100 g jasmine rice",
      "1 l chicken stock",
      "200 g chicken thighs",
      "20 g ginger",
      "2 spring onions",
      "1 tbsp soy sauce",
      "1 tsp sesame oil",
      "Black pepper",
    ],
    recipe: [
      "1. Rinse the rice, then bring it to the boil with the stock and half the ginger, sliced.",
      "2. Turn the heat right down and simmer for 40 minutes, stirring now and then, until the grains have broken down into a loose porridge.",
      "3. Add the chicken thighs whole and poach for 12 minutes, then lift them out and shred.",
      "4. Return the chicken, season with soy sauce and pepper, and loosen with hot water if it has gone claggy.",
      "5. Serve topped with the remaining ginger cut into matchsticks, sliced spring onion and sesame oil.",
    ].join("\n"),
  },
  {
    key: "turkey-cheddar-breakfast-quesadillas",
    name: "Turkey and Cheddar Breakfast Quesadillas",
    diet: "nonveg",
    mealTypes: ["breakfast"],
    cuisine: "Mexican",
    ingredients: [
      "4 flour tortillas",
      "150 g sliced turkey",
      "80 g cheddar",
      "2 eggs",
      "2 spring onions",
      "2 tbsp salsa",
      "1 tsp olive oil",
      "Black pepper",
    ],
    recipe: [
      "1. Scramble the eggs softly in the oil and season with pepper.",
      "2. Lay two tortillas out and cover each with turkey, scrambled egg, sliced spring onion and grated cheddar, then top with the other tortillas.",
      "3. Toast each quesadilla in a dry pan over medium heat for 2 to 3 minutes a side, pressing down, until the cheese has melted and the outside is spotted brown.",
      "4. Rest for a minute before cutting into wedges, so the filling stays put. Serve with salsa.",
    ].join("\n"),
  },

  // --- Lunch and dinner ---
  {
    key: "chana-masala",
    name: "Chana Masala with Rice",
    diet: "veg",
    mealTypes: ["lunch", "dinner"],
    cuisine: "Indian",
    ingredients: [
      "400 g chickpeas",
      "400 g chopped tomatoes",
      "150 g basmati rice",
      "1 onion",
      "3 garlic cloves",
      "20 g ginger",
      "1 tsp ground cumin",
      "1 tsp garam masala",
      "1/2 tsp ground turmeric",
      "2 tbsp vegetable oil",
      "2 tbsp coriander",
      "Salt",
    ],
    recipe: [
      "1. Fry the finely chopped onion in the oil over medium heat for 10 minutes, until properly golden — this is where the depth comes from, so don't rush it.",
      "2. Add the grated garlic and ginger, then the cumin, turmeric and garam masala, and cook for 1 minute.",
      "3. Stir in the tomatoes and cook for 8 minutes, until the oil separates out at the edges.",
      "4. Add the drained chickpeas and 150 ml water, season, and simmer for 15 minutes, crushing a few chickpeas against the pan to thicken the sauce.",
      "5. Meanwhile cook the rice. Finish the curry with coriander.",
    ].join("\n"),
  },
  {
    key: "spaghetti-aglio-e-olio",
    name: "Spaghetti Aglio e Olio",
    diet: "veg",
    mealTypes: ["lunch", "dinner"],
    cuisine: "Italian",
    ingredients: [
      "200 g spaghetti",
      "4 garlic cloves",
      "60 ml olive oil",
      "40 g parmesan",
      "3 tbsp parsley",
      "1/2 tsp chilli flakes",
      "Salt",
    ],
    recipe: [
      "1. Boil the spaghetti in well-salted water until a minute short of al dente.",
      "2. While it cooks, warm the thinly sliced garlic in the oil in a wide pan over low heat until it just turns pale gold. Browned garlic turns bitter, so pull the pan off early if it is colouring fast.",
      "3. Add the chilli flakes and a ladle of pasta water and let it bubble.",
      "4. Drag the pasta straight into the pan and toss hard for a minute, adding more pasta water until the sauce clings and looks glossy.",
      "5. Off the heat, stir through the parsley and parmesan.",
    ].join("\n"),
  },
  {
    key: "red-lentil-soup",
    name: "Red Lentil Soup",
    diet: "veg",
    mealTypes: ["lunch", "dinner"],
    cuisine: "Middle Eastern",
    ingredients: [
      "200 g red lentils",
      "1 l vegetable stock",
      "1 onion",
      "1 carrot",
      "2 garlic cloves",
      "1 tsp ground cumin",
      "1 lemon",
      "2 tbsp olive oil",
      "Salt",
      "Black pepper",
    ],
    recipe: [
      "1. Soften the chopped onion and carrot in the oil for 8 minutes.",
      "2. Add the chopped garlic and cumin and cook for 1 minute.",
      "3. Rinse the lentils, add them with the stock, and simmer for 25 minutes until they have collapsed.",
      "4. Blend until smooth, adding water until it pours easily.",
      "5. Season, then add lemon juice a squeeze at a time until the soup tastes lifted rather than sour.",
    ].join("\n"),
  },
  {
    key: "halloumi-chickpea-salad",
    name: "Halloumi and Chickpea Salad",
    diet: "veg",
    mealTypes: ["lunch"],
    cuisine: "Mediterranean",
    ingredients: [
      "200 g halloumi",
      "240 g chickpeas",
      "200 g cherry tomatoes",
      "1 cucumber",
      "1/2 red onion",
      "1 lemon",
      "2 tbsp olive oil",
      "2 tbsp mint",
      "Black pepper",
    ],
    recipe: [
      "1. Halve the tomatoes, chop the cucumber and slice the red onion thinly.",
      "2. Toss them with the drained chickpeas, olive oil, lemon juice, torn mint and plenty of pepper. No salt — the halloumi brings it.",
      "3. Slice the halloumi into 1 cm slabs, pat them dry, and fry in a dry non-stick pan for 2 minutes a side until deeply browned.",
      "4. Lay the hot halloumi over the salad and eat immediately, while it is still soft.",
    ].join("\n"),
  },
  {
    key: "egg-fried-rice",
    name: "Egg Fried Rice with Peas",
    diet: "veg",
    mealTypes: ["lunch", "dinner"],
    cuisine: "Chinese",
    ingredients: [
      "300 g cooked rice",
      "3 eggs",
      "100 g peas",
      "1 carrot",
      "2 spring onions",
      "2 garlic cloves",
      "2 tbsp soy sauce",
      "1 tbsp vegetable oil",
      "1 tbsp sesame oil",
    ],
    recipe: [
      "1. Use rice cooked the day before and chilled. Warm rice steams instead of frying and turns to paste.",
      "2. Beat the eggs and scramble them quickly in half the oil, then tip them out while still soft.",
      "3. Turn the heat high, add the rest of the oil and fry the diced carrot for 2 minutes, then the chopped garlic for 30 seconds.",
      "4. Add the rice and press it against the pan, tossing every 30 seconds for 3 minutes, until the grains separate and start to pop.",
      "5. Return the egg with the peas and soy sauce, toss through, and finish off the heat with sesame oil and sliced spring onions.",
    ].join("\n"),
  },
  {
    key: "black-bean-corn-tacos",
    name: "Black Bean and Corn Tacos",
    diet: "veg",
    mealTypes: ["lunch", "dinner"],
    cuisine: "Mexican",
    ingredients: [
      "240 g black beans",
      "150 g sweetcorn",
      "6 corn tortillas",
      "1 red onion",
      "1 avocado",
      "1 lime",
      "1 tsp ground cumin",
      "1 tsp paprika",
      "1 tbsp olive oil",
      "2 tbsp coriander",
      "Salt",
    ],
    recipe: [
      "1. Fry half the diced red onion in the oil for 4 minutes, then add the cumin and paprika for 30 seconds.",
      "2. Add the drained beans and sweetcorn with 3 tbsp water and cook for 5 minutes, crushing about a third of the beans so the mix holds together.",
      "3. Slice the avocado and toss the remaining raw onion with lime juice and a pinch of salt.",
      "4. Warm the tortillas one at a time in a dry pan until flexible and lightly blistered.",
      "5. Fill with the beans, avocado, pickled onion and coriander, and squeeze over more lime.",
    ].join("\n"),
  },
  {
    key: "tofu-pad-thai",
    name: "Tofu Pad Thai",
    diet: "veg",
    mealTypes: ["lunch", "dinner"],
    cuisine: "Thai",
    ingredients: [
      "200 g rice noodles",
      "250 g firm tofu",
      "2 eggs",
      "100 g bean sprouts",
      "40 g peanuts",
      "2 spring onions",
      "2 tbsp tamarind paste",
      "2 tbsp soy sauce",
      "1 tbsp brown sugar",
      "2 tbsp vegetable oil",
      "1 lime",
    ],
    recipe: [
      "1. Soak the noodles in hot water until pliable but still firm, then drain. They finish cooking in the pan.",
      "2. Mix the tamarind, soy sauce and sugar into a sauce.",
      "3. Press the tofu dry, cube it, and fry in the oil over high heat until browned on several sides. Push it to one side.",
      "4. Scramble the eggs in the space, then add the noodles and sauce and toss for 2 minutes until they have taken up the liquid.",
      "5. Throw in the bean sprouts for 30 seconds only, then serve with crushed peanuts, spring onions and lime.",
    ].join("\n"),
  },
  {
    key: "tomato-mozzarella-flatbreads",
    name: "Tomato and Mozzarella Flatbreads",
    diet: "veg",
    mealTypes: ["lunch", "dinner"],
    cuisine: "Italian",
    ingredients: [
      "2 flatbreads",
      "150 g passata",
      "150 g mozzarella",
      "150 g cherry tomatoes",
      "2 garlic cloves",
      "2 tbsp olive oil",
      "10 g basil",
      "Salt",
    ],
    recipe: [
      "1. Heat the oven as high as it will go with a baking tray inside.",
      "2. Season the passata with salt, the crushed garlic and half the oil.",
      "3. Spread it thinly over the flatbreads, leaving a border, and top with torn mozzarella and halved tomatoes.",
      "4. Slide onto the hot tray and bake for 7 to 9 minutes, until the cheese is bubbling and the edges are crisp.",
      "5. Finish with basil and the rest of the oil.",
    ].join("\n"),
  },
  {
    key: "paneer-butter-masala",
    name: "Paneer Butter Masala",
    diet: "veg",
    mealTypes: ["dinner"],
    cuisine: "Indian",
    ingredients: [
      "250 g paneer",
      "400 g chopped tomatoes",
      "150 g basmati rice",
      "1 onion",
      "3 garlic cloves",
      "20 g ginger",
      "30 g butter",
      "100 ml cream",
      "1 tsp garam masala",
      "1 tsp paprika",
      "Salt",
    ],
    recipe: [
      "1. Melt the butter and fry the chopped onion for 8 minutes until soft and golden.",
      "2. Add the grated garlic and ginger, then the paprika and garam masala, and cook for 1 minute.",
      "3. Add the tomatoes and simmer for 12 minutes, then blend the sauce smooth and return it to the pan.",
      "4. Cube the paneer and stir it in with the cream. Simmer gently for 5 minutes — boiling makes paneer squeaky and tough.",
      "5. Season and serve with the rice.",
    ].join("\n"),
  },
  {
    key: "vegetable-bibimbap",
    name: "Vegetable Bibimbap",
    diet: "veg",
    mealTypes: ["lunch", "dinner"],
    cuisine: "Korean",
    ingredients: [
      "200 g short grain rice",
      "2 eggs",
      "150 g spinach",
      "150 g mushrooms",
      "100 g bean sprouts",
      "1 carrot",
      "2 tbsp gochujang",
      "2 tbsp sesame oil",
      "1 tbsp soy sauce",
      "1 tbsp sesame seeds",
    ],
    recipe: [
      "1. Cook the rice and keep it warm.",
      "2. Cook the vegetables separately so each keeps its own character: wilt the spinach, blanch the bean sprouts for 1 minute, and fry the sliced mushrooms and shredded carrot until just tender.",
      "3. Dress each one with a little sesame oil and soy sauce.",
      "4. Fry the eggs so the yolks stay soft.",
      "5. Arrange the vegetables in sections over the rice, add the egg and a spoon of gochujang, scatter with sesame seeds, and mix it all together at the table.",
    ].join("\n"),
  },
  {
    key: "chicken-caesar-wraps",
    name: "Chicken Caesar Wraps",
    diet: "nonveg",
    mealTypes: ["lunch"],
    cuisine: "American",
    ingredients: [
      "300 g chicken breast",
      "2 flour tortillas",
      "1 romaine lettuce",
      "40 g parmesan",
      "4 tbsp caesar dressing",
      "1 tbsp olive oil",
      "Salt",
      "Black pepper",
    ],
    recipe: [
      "1. Butterfly the chicken breasts so they are an even thickness, season, and fry in the oil for 4 to 5 minutes a side until cooked through.",
      "2. Rest for 5 minutes, then slice. Resting is what keeps the wrap from going watery.",
      "3. Shred the lettuce and toss it with the dressing and grated parmesan.",
      "4. Warm the tortillas briefly, pile the salad and chicken along the middle, fold in the ends and roll tightly.",
    ].join("\n"),
  },
  {
    key: "tuna-white-bean-salad",
    name: "Tuna and White Bean Salad",
    diet: "nonveg",
    mealTypes: ["lunch"],
    cuisine: "Mediterranean",
    ingredients: [
      "160 g tuna",
      "240 g cannellini beans",
      "200 g cherry tomatoes",
      "50 g rocket",
      "1/2 red onion",
      "1 lemon",
      "2 tbsp olive oil",
      "2 tbsp parsley",
      "Black pepper",
    ],
    recipe: [
      "1. Slice the red onion thinly and soak it in the lemon juice for 10 minutes to soften its bite.",
      "2. Drain and rinse the beans, then fold them into the onion and lemon with the olive oil and plenty of pepper.",
      "3. Add the halved tomatoes, parsley and drained tuna, breaking it into large flakes rather than stirring it to a paste.",
      "4. Pile onto the rocket and serve.",
    ].join("\n"),
  },
  {
    key: "croque-monsieur",
    name: "Croque Monsieur",
    diet: "nonveg",
    mealTypes: ["lunch"],
    cuisine: "French",
    ingredients: [
      "4 bread slices",
      "150 g ham",
      "120 g gruyere",
      "300 ml milk",
      "25 g butter",
      "25 g plain flour",
      "1 tsp dijon mustard",
      "Black pepper",
    ],
    recipe: [
      "1. Melt the butter in a small pan, stir in the flour and cook for a minute, then whisk in the milk a splash at a time until the sauce is thick and smooth.",
      "2. Off the heat, stir in the mustard, a third of the grated gruyere and plenty of pepper.",
      "3. Spread a little sauce on two slices of bread, layer on the ham and half the remaining cheese, and close the sandwiches.",
      "4. Spread the rest of the sauce over the tops and scatter with the last of the cheese.",
      "5. Grill for 4 to 5 minutes until blistered and brown, watching it closely — it turns from golden to burnt in seconds.",
    ].join("\n"),
  },
  {
    key: "ginger-chicken-noodle-soup",
    name: "Ginger Chicken Noodle Soup",
    diet: "nonveg",
    mealTypes: ["lunch"],
    cuisine: "Vietnamese",
    ingredients: [
      "300 g chicken breast",
      "1 l chicken stock",
      "150 g rice noodles",
      "100 g pak choi",
      "20 g ginger",
      "2 garlic cloves",
      "2 spring onions",
      "1 tbsp soy sauce",
      "1 tsp sesame oil",
      "1 lime",
      "Black pepper",
    ],
    recipe: [
      "1. Bring the stock to a bare simmer with the sliced ginger and garlic and leave it to infuse for 10 minutes.",
      "2. Poach the chicken in the stock for 12 minutes, then lift it out and shred it.",
      "3. Cook the noodles in a separate pan and divide them between two bowls. Cooking them in the broth would cloud it with starch.",
      "4. Add the pak choi to the stock for 2 minutes and season with the soy sauce and pepper.",
      "5. Ladle the broth over the noodles, add the chicken, and finish with spring onions, sesame oil and a squeeze of lime.",
    ].join("\n"),
  },
  {
    key: "chicken-shawarma-bowls",
    name: "Chicken Shawarma Bowls",
    diet: "nonveg",
    mealTypes: ["lunch", "dinner"],
    cuisine: "Middle Eastern",
    ingredients: [
      "400 g chicken thighs",
      "150 g plain yogurt",
      "150 g couscous",
      "200 g cherry tomatoes",
      "1 cucumber",
      "2 garlic cloves",
      "1 lemon",
      "2 tsp ground cumin",
      "1 tsp paprika",
      "1/2 tsp ground turmeric",
      "2 tbsp olive oil",
      "Salt",
    ],
    recipe: [
      "1. Toss the chicken with half the yogurt, the crushed garlic, cumin, paprika, turmeric, oil and salt. Leave for 20 minutes, or overnight.",
      "2. Heat the oven to 220C and roast the chicken on a tray for 20 to 25 minutes, until charred at the edges.",
      "3. Cover the couscous with an equal volume of boiling water, cover, and leave for 8 minutes, then fork it through.",
      "4. Mix the rest of the yogurt with lemon juice and a pinch of salt for the sauce.",
      "5. Slice the chicken and pile it over the couscous with chopped cucumber and tomatoes, then spoon over the sauce.",
    ].join("\n"),
  },
  {
    key: "beef-broccoli-stir-fry",
    name: "Beef and Broccoli Stir-fry",
    diet: "nonveg",
    mealTypes: ["dinner"],
    cuisine: "Chinese",
    ingredients: [
      "350 g beef steak",
      "300 g broccoli",
      "150 g jasmine rice",
      "3 garlic cloves",
      "20 g ginger",
      "3 tbsp soy sauce",
      "1 tbsp oyster sauce",
      "1 tsp cornflour",
      "1 tbsp vegetable oil",
    ],
    recipe: [
      "1. Slice the beef thinly across the grain and toss it with the cornflour and 1 tbsp of the soy sauce.",
      "2. Blanch the broccoli florets for 2 minutes, then drain well.",
      "3. Get a large pan very hot, add the oil, and sear the beef in a single layer for 1 minute without moving it. Toss and cook 30 seconds more, then lift it out.",
      "4. Add the chopped garlic and ginger for 30 seconds, return the broccoli and beef, and add the remaining soy sauce, the oyster sauce and 3 tbsp water.",
      "5. Toss for a minute until the sauce coats everything, and serve with rice.",
    ].join("\n"),
  },
  {
    key: "lemon-butter-cod",
    name: "Lemon Butter Cod with Green Beans",
    diet: "nonveg",
    mealTypes: ["dinner"],
    cuisine: "French",
    ingredients: [
      "2 cod fillets",
      "400 g new potatoes",
      "300 g green beans",
      "40 g butter",
      "2 garlic cloves",
      "1 lemon",
      "1 tbsp olive oil",
      "2 tbsp parsley",
      "Salt",
      "Black pepper",
    ],
    recipe: [
      "1. Boil the potatoes for 15 minutes, adding the beans for the last 4.",
      "2. Pat the cod completely dry and season it. Dry fish is the difference between a crust and a steam.",
      "3. Fry it in the oil, skin-side down if it has skin, for 3 to 4 minutes without moving it, then turn and give it 2 minutes more.",
      "4. Lift the fish out, drop the butter and sliced garlic into the pan, and swirl over low heat for a minute until nutty.",
      "5. Add lemon juice and parsley, then spoon the sauce over the fish, potatoes and beans.",
    ].join("\n"),
  },
  {
    key: "teriyaki-salmon",
    name: "Teriyaki Salmon with Rice",
    diet: "nonveg",
    mealTypes: ["dinner"],
    cuisine: "Japanese",
    ingredients: [
      "2 salmon fillets",
      "150 g jasmine rice",
      "200 g broccoli",
      "20 g ginger",
      "3 tbsp soy sauce",
      "2 tbsp mirin",
      "1 tbsp brown sugar",
      "1 tbsp vegetable oil",
      "1 tbsp sesame seeds",
    ],
    recipe: [
      "1. Cook the rice, and stir the soy sauce, mirin, sugar and grated ginger together in a cup.",
      "2. Pat the salmon dry and fry it skin-side down in the oil over medium-high heat for 4 minutes, pressing it flat for the first few seconds so the skin crisps evenly.",
      "3. Turn the fillets and give them 2 minutes more, then steam or blanch the broccoli for 3 minutes.",
      "4. Pour the sauce into the pan and let it bubble for a minute until sticky, spooning it over the fish as it thickens.",
      "5. Serve on the rice with the broccoli and a scatter of sesame seeds.",
    ].join("\n"),
  },
  {
    key: "coconut-chicken-curry",
    name: "Coconut Chicken Curry",
    diet: "nonveg",
    mealTypes: ["dinner"],
    cuisine: "Indian",
    ingredients: [
      "500 g chicken thighs",
      "400 ml coconut milk",
      "200 g spinach",
      "150 g basmati rice",
      "1 onion",
      "3 garlic cloves",
      "20 g ginger",
      "2 tsp curry powder",
      "1 tsp ground turmeric",
      "1 tbsp vegetable oil",
      "Salt",
    ],
    recipe: [
      "1. Brown the chicken thighs in the oil over high heat, then set them aside.",
      "2. Lower the heat and cook the sliced onion in the same pan for 8 minutes, scraping up the browned bits.",
      "3. Add the grated garlic and ginger with the curry powder and turmeric, and cook for 1 minute.",
      "4. Pour in the coconut milk, return the chicken, and simmer uncovered for 20 minutes until the sauce has reduced and the chicken pulls apart easily.",
      "5. Stir in the spinach until wilted, season, and serve with rice.",
    ].join("\n"),
  },
  {
    key: "spaghetti-bolognese",
    name: "Spaghetti Bolognese",
    diet: "nonveg",
    mealTypes: ["lunch", "dinner"],
    cuisine: "Italian",
    ingredients: [
      "300 g beef mince",
      "200 g spaghetti",
      "400 g chopped tomatoes",
      "1 onion",
      "1 carrot",
      "2 garlic cloves",
      "40 g parmesan",
      "2 tbsp tomato puree",
      "1 tsp dried oregano",
      "1 tbsp olive oil",
      "Salt",
      "Black pepper",
    ],
    recipe: [
      "1. Soften the finely chopped onion and carrot in the oil for 10 minutes.",
      "2. Turn the heat up, add the mince, and leave it to brown properly before breaking it up. Stirring too early makes it grey and steamed.",
      "3. Add the chopped garlic, tomato puree and oregano and cook for 2 minutes.",
      "4. Pour in the tomatoes with 150 ml water, season, and simmer gently for at least 30 minutes, until the sauce is thick and glossy.",
      "5. Cook the spaghetti, then toss it through the sauce with a splash of pasta water and serve with parmesan.",
    ].join("\n"),
  },
  {
    key: "chicken-fajitas",
    name: "Chicken Fajitas",
    diet: "nonveg",
    mealTypes: ["lunch", "dinner"],
    cuisine: "Mexican",
    ingredients: [
      "400 g chicken breast",
      "6 flour tortillas",
      "2 peppers",
      "1 onion",
      "100 g soured cream",
      "1 lime",
      "2 tsp paprika",
      "1 tsp ground cumin",
      "2 tbsp olive oil",
      "Salt",
    ],
    recipe: [
      "1. Slice the chicken, peppers and onion into strips of roughly the same size so they cook at the same rate.",
      "2. Toss the chicken with the paprika, cumin, salt and half the oil.",
      "3. Get a large pan smoking hot and cook the peppers and onion in the rest of the oil for 5 minutes, until charred in places but still with bite. Tip them out.",
      "4. Cook the chicken in the same pan for 5 to 6 minutes, undisturbed at first, until cooked through.",
      "5. Return the vegetables, squeeze over the lime, and serve with warm tortillas and soured cream.",
    ].join("\n"),
  },
];

/** Keyed on the slug: re-publishing has to find and update this exact
 *  collection rather than mint a second one, so the slug is fixed here rather
 *  than derived at run time by `uniqueSlug`, which appends a suffix when a
 *  slug is taken. */
export const STARTER_COLLECTION = {
  slug: "everyday-starter-kit",
  title: "Everyday Starter Kit",
  description:
    "Everyday breakfasts, lunches and dinners from a dozen cuisines, balanced " +
    "so a generated week fills completely: enough choices for every meal of " +
    "the day, vegetarian and not, that the veg slider works wherever you put " +
    "it. Recipes are written for two, and the shopping list scales them to " +
    "your household.",
  /** Left empty on purpose: this one spans cuisines rather than being built
   *  around a single one. */
  cuisine: "",
  meals: STARTER_MEALS,
} as const;

export interface StarterSummary {
  total: number;
  /** A meal tagged for two meal types counts towards both. */
  byMealType: Record<MealType, number>;
  byDiet: Record<Diet, number>;
  /** The pool the generator actually draws from for one slot once the veg
   *  slider has decided that slot's diet. */
  byMealTypeAndDiet: Record<MealType, Record<Diet, number>>;
  byCuisine: Record<string, number>;
}

/** The same shape `summarize()` reports on the collections page, computed
 *  before the data is a document so the script can show it in a dry run. */
export function summarizeStarterMeals(meals: StarterMeal[]): StarterSummary {
  const byCuisine: Record<string, number> = {};
  for (const meal of meals) {
    byCuisine[meal.cuisine] = (byCuisine[meal.cuisine] ?? 0) + 1;
  }

  const forType = (type: MealType) =>
    meals.filter((meal) => meal.mealTypes.includes(type));

  return {
    total: meals.length,
    byMealType: Object.fromEntries(
      MEAL_TYPES.map((type) => [type, forType(type).length])
    ) as Record<MealType, number>,
    byDiet: Object.fromEntries(
      DIETS.map((diet) => [diet, meals.filter((m) => m.diet === diet).length])
    ) as Record<Diet, number>,
    byMealTypeAndDiet: Object.fromEntries(
      MEAL_TYPES.map((type) => [
        type,
        Object.fromEntries(
          DIETS.map((diet) => [
            diet,
            forType(type).filter((meal) => meal.diet === diet).length,
          ])
        ),
      ])
    ) as Record<MealType, Record<Diet, number>>,
    byCuisine,
  };
}
