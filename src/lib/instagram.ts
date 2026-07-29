import "server-only";

/** Reels, plain posts and legacy IGTV all carry recipes, and a share link may
 *  or may not include the creator's handle. */
const POST_PATH = /^\/(?:([\w.]+)\/)?(reels?|p|tv)\/([\w-]{5,30})/;
const HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]);

export interface InstagramLink {
  /** Canonical post URL with share tracking stripped. */
  url: string;
  code: string;
}

/** Recognizes an Instagram post link without touching the network. */
export function parseInstagramUrl(input: string): InstagramLink | null {
  const raw = input?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (!HOSTS.has(url.hostname.toLowerCase())) return null;

  const match = url.pathname.match(POST_PATH);
  if (!match) return null;

  const [, , kind, code] = match;
  // Share sheets append ?igsh= tracking; the bare permalink is what gets saved.
  const path = kind === "p" || kind === "tv" ? kind : "reel";
  return { url: `https://www.instagram.com/${path}/${code}/`, code };
}

export interface InstagramPost {
  /** The creator's caption — often the entire recipe. */
  caption: string;
  authorName: string;
  /** Cover images, best first. Signed and short-lived, so copy the bytes
   *  rather than storing these. */
  thumbnailUrls: string[];
  url: string;
}

/** og:image for a Reel is composited with a play button painted over the
 *  middle — its transform starts with "cmp1" — which looks like a mistake once
 *  it is saved as a meal photo. This older endpoint redirects to the same
 *  frame untouched, and larger (up to 1080px against og:image's 640), so it is
 *  tried first. The signature is bound to the transform, so the overlay cannot
 *  simply be edited out of the og:image URL. */
function posterUrl(code: string): string {
  return `https://www.instagram.com/p/${code}/media/?size=l`;
}

// Instagram decides what to serve by user agent: crawlers get the Open Graph
// tags, browsers get an empty shell that fills itself in with JavaScript.
// Sending a realistic browser agent here returns a page with no caption at all,
// so the honest bot identity is the one that works. Verified from a Vercel
// function in iad1 — see the probe results before changing this.
const CRAWLER_AGENT = "facebookexternalhit/1.1";

function readMeta(html: string, property: string): string {
  const match = html.match(
    new RegExp(`<meta property="${property}" content="(.*?)"\\s*/?>`, "s")
  );
  return match ? decodeEntities(match[1]) : "";
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** og:title reads `Author on Instagram: "the caption"`, so the author and the
 *  caption come out of the same tag. */
function splitTitle(title: string): { authorName: string; caption: string } {
  const match = title.match(/^(.*?) on Instagram:\s*"([\s\S]*)"\s*$/);
  if (!match) return { authorName: "", caption: title.trim() };
  return { authorName: match[1].trim(), caption: match[2].trim() };
}

async function fetchPage(url: string, agent?: string): Promise<string> {
  const res = await fetch(url, {
    headers: agent ? { "user-agent": agent } : {},
    redirect: "follow",
  });
  if (!res.ok) return "";
  // A login wall answers with a page that has no post in it.
  if (/\/accounts\/login/.test(res.url)) return "";
  return res.text();
}

/** Instagram's oEmbed carries no caption — Meta stripped the useful fields in
 *  2025 — so the post's own Open Graph tags are the source. */
export async function fetchInstagramPost(
  link: InstagramLink
): Promise<InstagramPost | null> {
  const { url, code } = link;
  try {
    let html = await fetchPage(url);
    let title = readMeta(html, "og:title");
    // Both agents were verified to work; retrying costs one request on the
    // rare miss and saves the import when Instagram is picky.
    if (!title) {
      html = await fetchPage(url, CRAWLER_AGENT);
      title = readMeta(html, "og:title");
    }
    if (!title) return null;

    const { authorName, caption } = splitTitle(title);
    return {
      caption,
      authorName,
      thumbnailUrls: [posterUrl(code), readMeta(html, "og:image")].filter(
        Boolean
      ),
      url,
    };
  } catch {
    return null;
  }
}
