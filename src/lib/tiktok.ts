import "server-only";

/** oEmbed resolves by video id alone, but the handle is kept so the meal links
 *  back to a URL a person would recognize. */
const VIDEO_PATH = /^\/(?:(@[\w.-]+)\/)?video\/(\d{6,25})/;
/** Share sheets hand out vm./vt. links and /t/ paths that redirect. */
const SHORT_HOSTS = new Set(["vm.tiktok.com", "vt.tiktok.com"]);
const FULL_HOSTS = new Set([
  "tiktok.com",
  "m.tiktok.com",
  "www.tiktok.com",
]);

export interface TikTokLink {
  /** Canonical video URL, once any short link has been followed. */
  url: string;
  id: string;
  /** True while the link still has to be resolved to reach the video. */
  short: boolean;
}

/** Recognizes a TikTok link without touching the network. Short links carry no
 *  video id, so they come back flagged for `resolveTikTokUrl` to follow. */
export function parseTikTokUrl(input: string): TikTokLink | null {
  const raw = input?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (SHORT_HOSTS.has(host)) {
    return { url: url.toString(), id: "", short: true };
  }
  if (!FULL_HOSTS.has(host.replace(/^www\./, "")) && !FULL_HOSTS.has(host)) {
    return null;
  }

  const match = url.pathname.match(VIDEO_PATH);
  if (match) {
    const [, handle, id] = match;
    // Drop tracking parameters, keep a link that opens the video anywhere.
    const canonical = handle
      ? `https://www.tiktok.com/${handle}/video/${id}`
      : `https://www.tiktok.com/video/${id}`;
    return { url: canonical, id, short: false };
  }
  // /t/ZTxxxx and other share paths redirect to the real video.
  if (/^\/t\//.test(url.pathname)) {
    return { url: url.toString(), id: "", short: true };
  }
  return null;
}

/** Follows a share link to the video it points at. */
export async function resolveTikTokUrl(link: TikTokLink): Promise<TikTokLink | null> {
  if (!link.short) return link;
  try {
    const res = await fetch(link.url, { redirect: "follow" });
    return parseTikTokUrl(res.url);
  } catch {
    return null;
  }
}

export interface TikTokPost {
  /** The creator's caption — often the entire recipe. */
  caption: string;
  authorName: string;
  /** Cover image. The URL is signed and expires within days, so copy the bytes
   *  rather than storing this. */
  thumbnailUrl: string;
  url: string;
}

/** Public oEmbed: no key, no OAuth, and it returns the untruncated caption. */
export async function fetchTikTokPost(url: string): Promise<TikTokPost | null> {
  try {
    const res = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    return {
      caption: data.title?.trim() ?? "",
      authorName: data.author_name?.trim() ?? "",
      thumbnailUrl: data.thumbnail_url ?? "",
      url,
    };
  } catch {
    return null;
  }
}
