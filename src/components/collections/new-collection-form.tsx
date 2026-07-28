"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CollectionFields,
  emptyDetails,
  type CollectionDetails,
} from "@/components/collections/collection-fields";
import { createCollection } from "@/app/(app)/collections/creator-actions";

export function NewCollectionForm({ cuisines }: { cuisines: string[] }) {
  const router = useRouter();
  const [details, setDetails] = useState<CollectionDetails>(emptyDetails);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await createCollection(details);

    if (!res.ok || !res.slug) {
      setSaving(false);
      toast.error(res.error ?? "Couldn't create that collection.");
      return;
    }

    // Straight into the editor, which is where the meals get picked. Left
    // saving so the button stays disabled until the new route paints.
    router.push(`/collections/${res.slug}/edit`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href="/collections/mine" />}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> My collections
      </Button>

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">New collection</h1>
        <p className="text-sm text-muted-foreground">
          Name it first, then pick the meals. It stays a private draft until you
          publish it.
        </p>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <CollectionFields
            value={details}
            onChange={setDetails}
            cuisines={cuisines}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              render={<Link href="/collections/mine" />}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !details.title.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create and add meals
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
