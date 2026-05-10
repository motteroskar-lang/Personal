import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Personal OS",
    short_name: "PersonalOS",
    description: "Your life, optimized — health, training, nutrition, goals & finance in one place.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#050506",
    theme_color: "#050506",
    categories: ["health", "fitness", "productivity", "finance"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [],
    shortcuts: [
      {
        name: "Goals",
        url: "/goals",
        description: "View today's action plan",
      },
      {
        name: "Health",
        url: "/health",
        description: "Log health data",
      },
      {
        name: "Training",
        url: "/training",
        description: "Log workout",
      },
      {
        name: "Finance",
        url: "/finance",
        description: "Track finances",
      },
    ],
  };
}
