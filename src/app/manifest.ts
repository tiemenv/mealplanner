import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mealmate — Weekly Meal Planner",
    short_name: "Mealmate",
    description:
      "Build your meal library and auto-generate a varied, balanced weekly meal plan.",
    start_url: "/planner",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#171717",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Puts Mealmate in the phone's share sheet, so a recipe video can be sent
    // straight here from TikTok, Instagram or YouTube. TikTok and Instagram
    // share the link inside the text rather than as a URL, which /import
    // allows for.
    share_target: {
      action: "/import",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
