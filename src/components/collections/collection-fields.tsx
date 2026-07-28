"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { CuisineCombobox } from "@/components/cuisine-combobox";
import { uploadMealImage } from "@/app/(app)/library/actions";
import type { CollectionDetailsInput } from "@/app/(app)/collections/creator-actions";

export type CollectionDetails = CollectionDetailsInput;

export const emptyDetails: CollectionDetails = {
  title: "",
  description: "",
  cuisine: "",
  coverImageUrl: "",
};

interface Props {
  value: CollectionDetails;
  onChange: (value: CollectionDetails) => void;
  /** Cuisines already used in the creator's library. */
  cuisines: string[];
  /** Shown under the cover field when nothing has been chosen. */
  fallbackCoverUrl?: string;
}

/** The title, blurb, cuisine and cover, shared by the create page and the
 *  editor so both stay in step. */
export function CollectionFields({
  value,
  onChange,
  cuisines,
  fallbackCoverUrl,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof CollectionDetails>(
    key: K,
    next: CollectionDetails[K]
  ) {
    onChange({ ...value, [key]: next });
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
      update("coverImageUrl", res.url);
      toast.success("Cover uploaded");
    } else {
      toast.error(res.error ?? "Upload failed");
    }
  }

  const preview = value.coverImageUrl || fallbackCoverUrl || "";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="collection-title">Title</Label>
        <Input
          id="collection-title"
          placeholder="Weeknight pasta"
          value={value.title}
          onChange={(e) => update("title", e.target.value)}
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="collection-description">Description</Label>
        <Textarea
          id="collection-description"
          placeholder="What ties these meals together, and who they're for."
          value={value.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
          maxLength={600}
        />
      </div>

      <div className="space-y-2">
        <Label>Cuisine (optional)</Label>
        <CuisineCombobox
          value={value.cuisine}
          onChange={(next) => update("cuisine", next)}
          options={cuisines}
        />
      </div>

      <div className="space-y-2">
        <Label>Cover image</Label>
        {preview && (
          <div className="h-32 w-full overflow-hidden rounded-lg bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <Tabs defaultValue="url">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">Paste URL</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="pt-2">
            <Input
              placeholder="https://…"
              value={value.coverImageUrl}
              onChange={(e) => update("coverImageUrl", e.target.value)}
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
                <ImagePlus className="mr-2 h-4 w-4" />
              )}
              {uploading ? "Uploading…" : "Choose image"}
            </Button>
          </TabsContent>
        </Tabs>
        <p className="text-xs text-muted-foreground">
          Leave this empty and the first meal&apos;s photo is used.
        </p>
      </div>
    </div>
  );
}
