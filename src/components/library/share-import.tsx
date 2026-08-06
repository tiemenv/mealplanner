"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard } from "lucide-react";
import { MealFormDialog } from "@/components/library/meal-form-dialog";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  url: string;
  cuisines: string[];
}

/** Landing spot for a link shared into the app. The dialog does the work; this
 *  only gives it somewhere to sit and somewhere to go when it closes. */
export function ShareImport({ url, cuisines }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <div className="mx-auto w-full max-w-lg py-10">
      <Card>
        <CardContent className="space-y-4 py-6 text-center">
          <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clapperboard className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">Importing a shared recipe</p>
            <p className="truncate text-sm text-muted-foreground">{url}</p>
          </div>
          {!open && (
            <ButtonLink variant="outline" href="/library">
              Back to library
            </ButtonLink>
          )}
        </CardContent>
      </Card>

      <MealFormDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) router.push("/library");
        }}
        cuisines={cuisines}
        initialVideoUrl={url}
      />
    </div>
  );
}
