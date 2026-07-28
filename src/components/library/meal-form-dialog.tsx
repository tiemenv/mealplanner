"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Upload,
  X,
  Sparkles,
  Clapperboard,
  Shuffle,
  TriangleAlert,
} from "lucide-react";
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
  importFromVideo,
  suggestMealImages,
  type VideoImport,
} from "@/app/(app)/library/actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal?: MealView | null;
  cuisines: string[];
  /** A link shared into the app: imported as soon as the dialog opens. */
  initialVideoUrl?: string;
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

export function MealFormDialog({
  open,
  onOpenChange,
  meal,
  cuisines,
  initialVideoUrl,
}: Props) {
  const [form, setForm] = useState(() => toForm(meal));
  const [lastMealId, setLastMealId] = useState(meal?.id ?? null);
  const [lastOpen, setLastOpen] = useState(open);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [imageOptions, setImageOptions] = useState<{
    query: string;
    urls: string[];
    index: number;
  } | null>(null);
  const [cyclingImage, setCyclingImage] = useState(false);
  // Set when a video turned out to hold several recipes: the dialog then walks
  // through them one at a time instead of editing a single draft.
  const [queue, setQueue] = useState<VideoImport[] | null>(null);
  const [queueIndex, setQueueIndex] = useState(0);
  const [queueAdded, setQueueAdded] = useState(0);
  // Shown when the source named a dish but never spelled the recipe out.
  const [missingRecipe, setMissingRecipe] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const autoImported = useRef<string | null>(null);

  // Reset on every open, not just when the target changes: adding two meals
  // in a row leaves the target id null both times. Skipping the reset on close
  // keeps the fields from blanking out during the dialog's exit animation.
  const mealId = meal?.id ?? null;
  if (open !== lastOpen || mealId !== lastMealId) {
    setLastOpen(open);
    setLastMealId(mealId);
    if (open) {
      setForm(toForm(meal));
      setVideoUrl("");
      setImageOptions(null);
      setQueue(null);
      setQueueIndex(0);
      setQueueAdded(0);
      setMissingRecipe(false);
    }
  }

  // A shared link should import itself — the point of sharing is not having
  // to press anything. Guarded by the URL so the import
  // runs once per shared link rather than on every re-render.
  useEffect(() => {
    if (!open || !initialVideoUrl) return;
    if (autoImported.current === initialVideoUrl) return;
    autoImported.current = initialVideoUrl;
    void runImport(initialVideoUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialVideoUrl]);

  const isEdit = !!meal;
  const review = queue
    ? { index: queueIndex, total: queue.length, added: queueAdded }
    : null;

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
      if (!res.ok) {
        toast.error(res.error ?? "Something went wrong");
        return;
      }
      if (review) {
        advanceReview(1);
        return;
      }
      toast.success(isEdit ? "Meal updated" : "Meal added");
      onOpenChange(false);
    });
  }

  /** Loads the recipes of a multi-recipe video into the review queue. */
  function startReview(imports: VideoImport[]) {
    setQueue(imports);
    setQueueIndex(0);
    setQueueAdded(0);
    setForm(importToForm(imports[0]));
    setImageOptions(null);
    setVideoUrl("");
    setMissingRecipe(imports[0].needsRecipe);
    toast.success(
      `Found ${imports.length} recipes in that video. Review them one by one.`
    );
  }

  /** Moves to the next queued recipe, or wraps up if that was the last one. */
  function advanceReview(added: number) {
    if (!queue) return;
    const total = queue.length;
    const addedSoFar = queueAdded + added;
    const next = queueIndex + 1;

    if (next >= total) {
      endReview(addedSoFar, total);
      return;
    }
    setQueueIndex(next);
    setQueueAdded(addedSoFar);
    setForm(importToForm(queue[next]));
    setImageOptions(null);
    setMissingRecipe(queue[next].needsRecipe);
  }

  function endReview(added: number, total: number) {
    if (added > 0) {
      toast.success(
        `Added ${added} of ${total} recipes from that video to your library.`
      );
    }
    setQueue(null);
    onOpenChange(false);
  }

  /** Closing mid-review abandons the recipes that are still queued. */
  function handleOpenChange(next: boolean) {
    if (!next && queue) {
      endReview(queueAdded, queue.length);
      return;
    }
    onOpenChange(next);
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

  async function handleVideoImport() {
    const url = videoUrl.trim();
    if (!url) {
      toast.error("Paste a YouTube, TikTok or Instagram link first.");
      return;
    }
    await runImport(url);
  }

  async function runImport(url: string) {
    setImporting(true);
    const res = await importFromVideo(url);
    setImporting(false);

    if (!res.ok || !res.imports?.length) {
      toast.error(res.error ?? "Couldn't import that video.");
      return;
    }

    const imports = res.imports;
    // A video can teach several dishes. When adding, walk through them one at
    // a time; an edit has a single target, so only the first one can land.
    if (imports.length > 1 && !isEdit) {
      startReview(imports);
      return;
    }
    if (imports.length > 1) {
      toast.info(
        `That video has ${imports.length} recipes — filling from the first one.`
      );
    }
    fillFromImport(imports[0]);
  }

  /** Fills the blanks in the current draft, leaving anything typed in place. */
  function fillFromImport(s: VideoImport) {
    setMissingRecipe(s.needsRecipe);
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
      if (next.mealTypes.length === 0 && s.mealTypes.length) {
        next.mealTypes = s.mealTypes;
        filled.push("meal types");
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
    } else if (s.needsRecipe) {
      toast.info(
        `Imported ${filled.join(", ")}. The caption stopped short of the full recipe, so fill in the rest yourself.`
      );
    } else {
      toast.success(`Imported ${filled.join(", ")}. Review before saving.`);
    }
  }

  async function handleCycleImage() {
    const title = form.name.trim();
    if (title.length < 2) {
      toast.error("Enter a meal name first.");
      return;
    }

    // Cycle through the cached batch if it matches the current name.
    if (imageOptions && imageOptions.query === title) {
      const next = (imageOptions.index + 1) % imageOptions.urls.length;
      setImageOptions({ ...imageOptions, index: next });
      update("imageUrl", imageOptions.urls[next]);
      return;
    }

    setCyclingImage(true);
    const res = await suggestMealImages(title);
    setCyclingImage(false);

    if (!res.ok || !res.images?.length) {
      toast.error(res.error ?? "No image suggestions found.");
      return;
    }

    // Start at the first suggestion that differs from the current image.
    const start = res.images.findIndex((u) => u !== form.imageUrl);
    const index = start === -1 ? 0 : start;
    setImageOptions({ query: title, urls: res.images, index });
    update("imageUrl", res.images[index]);
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

  // A thin caption can still list the ingredients and leave out the method, so
  // the warning names whichever half is actually blank — and disappears once
  // it has been typed in.
  const missingParts = [
    !form.ingredients.trim() && "ingredients",
    !form.recipe.trim() && "steps",
  ].filter(Boolean) as string[];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {review
              ? `Recipe ${review.index + 1} of ${review.total}`
              : isEdit
                ? "Edit meal"
                : "Add a meal"}
          </DialogTitle>
          <DialogDescription>
            {review
              ? `That video had ${review.total} recipes in it. Edit anything that looks off, then add this one or skip to the next.${
                  review.added > 0 ? ` ${review.added} added so far.` : ""
                }`
              : "Tag it so the planner can build a balanced, varied week."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {review && (
            <div className="flex items-center gap-1.5">
              {queue!.map((r, i) => (
                <span
                  key={`${r.title}-${i}`}
                  title={r.title || `Recipe ${i + 1}`}
                  className={cn(
                    "h-1.5 flex-1 rounded-full",
                    i < review.index
                      ? "bg-primary/40"
                      : i === review.index
                        ? "bg-primary"
                        : "bg-muted"
                  )}
                />
              ))}
            </div>
          )}

          {!review && (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
              <Label htmlFor="video" className="flex items-center gap-1.5">
                <Clapperboard className="h-4 w-4 text-red-600" /> Import from a
                video
              </Label>
              <div className="flex gap-2">
                <Input
                  id="video"
                  type="url"
                  inputMode="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Paste a YouTube, TikTok or Instagram link"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!importing) handleVideoImport();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVideoImport}
                  disabled={importing || videoUrl.trim().length === 0}
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
                YouTube videos are transcribed; TikToks and Reels are read from
                their caption. Only empty fields are filled, and videos with
                several recipes are reviewed one at a time.
              </p>
            </div>
          )}

          {missingRecipe && missingParts.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>
                The caption never spells out the {missingParts.join(" or the ")}{" "}
                — the creator kept that in the video or behind a link.
                Everything else is filled in; add the rest to save it.
              </p>
            </div>
          )}

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
            <div className="flex items-center justify-between">
              <Label>Image</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCycleImage}
                disabled={cyclingImage || form.name.trim().length < 2}
                className="h-7 gap-1.5 px-2 text-xs"
              >
                {cyclingImage ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Shuffle className="h-3.5 w-3.5" />
                )}
                {imageOptions && imageOptions.query === form.name.trim()
                  ? `Next image (${imageOptions.index + 1}/${imageOptions.urls.length})`
                  : "Suggest image"}
              </Button>
            </div>
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
          {review ? (
            <>
              <Button
                variant="outline"
                onClick={() => advanceReview(0)}
                disabled={pending}
              >
                Skip this one
              </Button>
              <Button onClick={handleSubmit} disabled={pending}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {review.index + 1 === review.total
                  ? "Add meal & finish"
                  : "Add meal & next"}
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A queued recipe becomes the whole draft, unlike a fill-the-blanks import. */
function importToForm(s: VideoImport) {
  return {
    name: s.title,
    diet: s.diet ?? empty.diet,
    mealTypes: s.mealTypes,
    cuisine: s.cuisine,
    imageUrl: s.imageUrl,
    ingredients: s.ingredients.join("\n"),
    recipe: s.recipe,
    recipeUrl: s.recipeUrl,
  };
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
