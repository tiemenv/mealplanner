import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/mongoose";
import { Meal } from "@/models/Meal";
import { getSession } from "@/lib/workspace";
import { ShareImport } from "@/components/library/share-import";

export const dynamic = "force-dynamic";

/** Share sheets rarely hand over a bare URL: TikTok and Instagram send the
 *  link wrapped in the creator's caption, so it has to be picked out of the
 *  text. */
function findSharedUrl(...values: (string | string[] | undefined)[]): string {
  for (const value of values) {
    const text = Array.isArray(value) ? value.join(" ") : value;
    const match = text?.match(/https?:\/\/[^\s]+/);
    if (match) return match[0];
  }
  return "";
}

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const params = await searchParams;

  const shared = findSharedUrl(params.url, params.text, params.title);
  // Nothing shareable — someone opened /import directly.
  if (!shared) redirect("/library");

  await dbConnect();
  const cuisines = (
    (await Meal.distinct("cuisine", {
      ownerKey: session.workspace.ownerKey,
    })) as string[]
  )
    .filter((c) => c && c.trim())
    .sort((a, b) => a.localeCompare(b));

  return <ShareImport url={shared} cuisines={cuisines} />;
}
