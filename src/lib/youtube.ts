import "server-only";
import { google } from "@ai-sdk/google";
import { APICallError, RetryError, generateText, Output } from "ai";
import {
  extractionSchema,
  normalizeExtraction,
  VIDEO_PROMPT,
  type RecipeExtraction,
} from "@/lib/recipe-extraction";

/** Gemini is the only provider that ingests a YouTube URL directly rather than
 *  needing the file, so watching a video keeps us here whatever else changes. */
const VIDEO_MODEL = "gemini-3.6-flash";

/** Validates a YouTube URL (watch, youtu.be, shorts, embed) and returns a
 *  normalized canonical watch URL, or null if it isn't a YouTube link. */
export function parseYouTubeUrl(input: string): { id: string; url: string } | null {
  const raw = input?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  let id = "";
  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0];
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v") ?? "";
    } else if (/^\/(shorts|embed|v|live)\//.test(url.pathname)) {
      id = url.pathname.split("/")[2] ?? "";
    }
  }
  if (!/^[\w-]{6,15}$/.test(id)) return null;
  return { id, url: `https://www.youtube.com/watch?v=${id}` };
}

/** Fallback title via the public oEmbed endpoint (no API key needed). */
export async function fetchYouTubeTitle(url: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    );
    if (!res.ok) return "";
    const data = (await res.json()) as { title?: string };
    return data.title?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Thumbnail sizes YouTube serves, largest first. Only `hqdefault` is
 *  guaranteed to exist; the bigger ones depend on the upload resolution. */
const THUMBNAIL_SIZES = ["maxresdefault", "sddefault", "hqdefault"] as const;

/** Returns the highest-resolution thumbnail available for a video, or "". */
export async function fetchYouTubeThumbnail(id: string): Promise<string> {
  for (const size of THUMBNAIL_SIZES) {
    const url = `https://i.ytimg.com/vi/${id}/${size}.jpg`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return url;
    } catch {
      // Network hiccup — try the next size rather than failing the import.
    }
  }
  return "";
}

/** Sends the YouTube URL to Gemini and returns every recipe it found.
 *  Assumes GOOGLE_GENERATIVE_AI_API_KEY is set (checked by the caller). */
export async function extractRecipesFromYouTube(
  url: string
): Promise<RecipeExtraction> {
  const { output } = await generateText({
    model: google(VIDEO_MODEL),
    // Lower media resolution keeps token cost down for longer videos while
    // preserving audio transcription quality.
    providerOptions: {
      google: { mediaResolution: "MEDIA_RESOLUTION_LOW" },
    },
    output: Output.object({ schema: extractionSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: VIDEO_PROMPT },
          { type: "file", data: url, mediaType: "video/mp4" },
        ],
      },
    ],
  });

  return normalizeExtraction(output);
}

/** Flat, log-friendly summary of why an import failed. Kept flat so each
 *  field can be searched on its own in the Vercel logs. */
export interface ImportFailure {
  /** `quota` covers both per-minute rate limits and exhausted daily quota. */
  kind: "quota" | "api" | "unknown";
  name: string;
  message: string;
  statusCode?: number;
  /** Google puts the real reason in the body, e.g. RESOURCE_EXHAUSTED. */
  responseBody?: string;
  retryAfter?: string;
  isRetryable?: boolean;
  url?: string;
  /** How many times the SDK tried before giving up. */
  attempts?: number;
}

function truncate(value: string | undefined, max = 600): string | undefined {
  if (!value) return undefined;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/** Unwraps an AI SDK failure into something worth writing to the logs. */
export function describeImportFailure(error: unknown): ImportFailure {
  // The SDK retries transient failures and wraps them, so dig out the call
  // that actually failed rather than reporting the wrapper.
  let attempts: number | undefined;
  let cause: unknown = error;
  if (RetryError.isInstance(error)) {
    attempts = error.errors.length;
    cause = error.lastError;
  }

  if (APICallError.isInstance(cause)) {
    const body = cause.responseBody ?? "";
    const outOfQuota =
      cause.statusCode === 429 || /RESOURCE_EXHAUSTED|quota/i.test(body);
    return {
      kind: outOfQuota ? "quota" : "api",
      name: cause.name,
      message: cause.message,
      statusCode: cause.statusCode,
      responseBody: truncate(body),
      retryAfter: cause.responseHeaders?.["retry-after"],
      isRetryable: cause.isRetryable,
      // Drop the query string in case a key ever rides along in the URL.
      url: cause.url.split("?")[0],
      attempts,
    };
  }

  return {
    kind: "unknown",
    name: cause instanceof Error ? cause.name : typeof cause,
    message: cause instanceof Error ? cause.message : String(cause),
    attempts,
  };
}
