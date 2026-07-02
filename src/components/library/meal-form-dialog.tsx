"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Upload, X, Sparkles, Clapperboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CuisineCombobox } from "@/components/cuisine-combobox";
import { MealTypeSelect } from "@/components/meal-type-select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import type { MealView } from "@/lib/types";
import type { Diet, MealType } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  createMeal,
  updateMeal,
  uploadMealImage,
  suggestMealDetails,
  importFromYouTube,
} from "@/app/(app)/library/actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal?: MealView | null;
  cuisines: string[];
}

const empty = {
  name: "",
  diet: "veg" as Diet,
  mealTypes: [] as MealType[],
  cuisine: "",
  imageUrl: "",
  ingredients: "",
  recipe: "",
  recipeUrl: "",
};

export function MealFormDialog({ open, onOpenChange, meal, cuisines }: Props) {
  const [form, setForm] = useState(() => toForm(meal));
  const [lastMealId, setLastMealId] = useState(meal?.id ?? null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset form when the dialog target changes.
  if ((meal?.id ?? null) !== lastMealId) {
    setLastMealId(meal?.id ?? null);
    setForm(toForm(meal));
    setYoutubeUrl("");
  }

  const isEdit = !!meal;

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit() {
    const input = {
      name: form.name,
      diet: form.diet,
      mealTypes: form.mealTypes,
      cuisine: form.cuisine,
      imageUrl: form.imageUrl,
      ingredients: form.ingredients
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      recipe: form.recipe,
      recipeUrl: form.recipeUrl,
    };

    startTransition(async () => {
      const res = isEdit
        ? await updateMeal(meal!.id, input)
        : await createMeal(input);
      if (res.ok) {
        toast.success(isEdit ? "Meal updated" : "Meal added");
        onOpenChange(false);
      } else {
        toast.error(res.error ?? "Something went wrong");
      }
    });
  }

  async function handleAutofill() {
    const title = form.name.trim();
    if (title.length < 2) {
      toast.error("Enter a meal name first.");
      return;
    }
    setSuggesting(true);
    const res = await suggestMealDetails(title);
    setSuggesting(false);

    if (!res.ok || !res.suggestion) {
      toast.error(res.error ?? "Couldn't fetch suggestions.");
      return;
    }

    const s = res.suggestion;
    const filled: string[] = [];
    setForm((f) => {
      const next = { ...f };
      if (!next.imageUrl && s.imageUrl) {
        next.imageUrl = s.imageUrl;
        filled.push("image");
      }
      if (!next.cuisine && s.cuisine) {
        next.cuisine = s.cuisine;
        filled.push("cuisine");
      }
      if (!next.ingredients.trim() && s.ingredients.length) {
        next.ingredients = s.ingredients.join("\n");
        filled.push("ingredients");
      }
      if (!next.recipe.trim() && s.recipe) {
        next.recipe = s.recipe;
        filled.push("recipe");
      }
      if (!next.recipeUrl.trim() && s.recipeUrl) {
        next.recipeUrl = s.recipeUrl;
        filled.push("recipe link");
      }
      // Diet has no "empty" state, so always apply a detected value.
      if (s.diet && next.diet !== s.diet) {
        next.diet = s.diet;
        filled.push("diet");
      }
      return next;
    });

    if (filled.length === 0) {
      toast.info(
        s.matched
          ? "Nothing new to fill — your fields are already set."
          : "No match found. Try a more specific name."
      );
    } else {
      toast.success(`Filled ${filled.join(", ")}. Review before saving.`);
    }
  }

  async function handleYoutubeImport() {
    const url = youtubeUrl.trim();
    if (!url) {
      toast.error("Paste a YouTube link first.");
      return;
    }
    setImporting(true);
    const res = await importFromYouTube(url);
    setImporting(false);

    if (!res.ok || !res.import) {
      toast.error(res.error ?? "Couldn't import that video.");
      return;
    }

    const s = res.import;
    const filled: string[] = [];
    setForm((f) => {
      const next = { ...f };
      if (!next.name.trim() && s.title) {
        next.name = s.title;
        filled.push("name");
      }
      if (!next.imageUrl && s.imageUrl) {
        next.imageUrl = s.imageUrl;
        filled.push("image");
      }
      if (!next.cuisine && s.cuisine) {
        next.cuisine = s.cuisine;
        filled.push("cuisine");
      }
      if (!next.ingredients.trim() && s.ingredients.length) {
        next.ingredients = s.ingredients.join("\n");
        filled.push("ingredients");
      }
      if (!next.recipe.trim() && s.recipe) {
        next.recipe = s.recipe;
        filled.push("recipe");
      }
      if (!next.recipeUrl.trim() && s.recipeUrl) {
        next.recipeUrl = s.recipeUrl;
        filled.push("recipe link");
      }
      if (s.diet && next.diet !== s.diet) {
        next.diet = s.diet;
        filled.push("diet");
      }
      return next;
    });

    if (filled.length === 0) {
      toast.info("Nothing new to fill — your fields are already set.");
    } else {
      toast.success(`Imported ${filled.join(", ")}. Review before saving.`);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadMealImage(fd);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (res.ok && res.url) {
      update("imageUrl", res.url);
      toast.success("Image uploaded");
    } else {
      toast.error(res.error ?? "Upload failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit meal" : "Add a meal"}</DialogTitle>
          <DialogDescription>
            Tag it so the planner can build a balanced, varied week.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
            <Label htmlFor="youtube" className="flex items-center gap-1.5">
              <Clapperboard className="h-4 w-4 text-red-600" /> Import from YouTube
            </Label>
            <div className="flex gap-2">
              <Input
                id="youtube"
                type="url"
                inputMode="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Paste a recipe video or Short link"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!importing) handleYoutubeImport();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleYoutubeImport}
                disabled={importing || youtubeUrl.trim().length === 0}
                className="shrink-0"
              >
                {importing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Clapperboard className="mr-2 h-4 w-4" />
                )}
                Import
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Transcribes the video and fills in the recipe. Longer videos take
              a few seconds. Only empty fields are filled.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Chickpea curry"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAutofill}
                disabled={suggesting || form.name.trim().length < 2}
                className="shrink-0"
              >
                {suggesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Autofill
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Fills image, ingredients, recipe, cuisine and diet from the title.
              Only empty fields are filled — review before saving.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Diet</Label>
            <div className="flex gap-2">
              {(["veg", "nonveg"] as Diet[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => update("diet", d)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm transition-colors",
                    form.diet === d
                      ? d === "veg"
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-rose-600 bg-rose-600 text-white"
                      : "border-input hover:bg-muted"
                  )}
                >
                  {d === "veg" ? "Vegetarian" : "Non-veg"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Meal types</Label>
            <MealTypeSelect
              value={form.mealTypes}
              onChange={(v) => update("mealTypes", v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Cuisine</Label>
            <CuisineCombobox
              value={form.cuisine}
              onChange={(v) => update("cuisine", v)}
              options={cuisines}
            />
          </div>

          <div className="space-y-2">
            <Label>Image</Label>
            {form.imageUrl ? (
              <div className="relative w-full overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.imageUrl}
                  alt="Meal preview"
                  className="h-40 w-full object-cover"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute right-2 top-2 h-7 w-7"
                  onClick={() => update("imageUrl", "")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="url">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url">Paste URL</TabsTrigger>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="pt-2">
                  <Input
                    placeholder="https://…"
                    value={form.imageUrl}
                    onChange={(e) => update("imageUrl", e.target.value)}
                  />
                </TabsContent>
                <TabsContent value="upload" className="pt-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFile}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {uploading ? "Uploading…" : "Choose image"}
                  </Button>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ingredients">Ingredients</Label>
            <Textarea
              id="ingredients"
              value={form.ingredients}
              onChange={(e) => update("ingredients", e.target.value)}
              placeholder="One per line"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipe">Recipe</Label>
            <Textarea
              id="recipe"
              value={form.recipe}
              onChange={(e) => update("recipe", e.target.value)}
              placeholder="Steps, notes…"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipeUrl">
              Recipe link{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="recipeUrl"
              type="url"
              inputMode="url"
              value={form.recipeUrl}
              onChange={(e) => update("recipeUrl", e.target.value)}
              placeholder="https://example.com/recipe"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Add meal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toForm(meal?: MealView | null) {
  if (!meal) return { ...empty };
  return {
    name: meal.name,
    diet: meal.diet,
    mealTypes: meal.mealTypes,
    cuisine: meal.cuisine,
    imageUrl: meal.imageUrl,
    ingredients: meal.ingredients.join("\n"),
    recipe: meal.recipe,
    recipeUrl: meal.recipeUrl,
  };
}
