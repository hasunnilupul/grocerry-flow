import type { MetadataRoute } from "next";

/** The three fields a phone actually needs to offer "install": a name, a
 *  512px icon, and `display: standalone`. Everything else here is polish. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // A stable id keeps an already-installed copy updating in place even if
    // `start_url` ever changes.
    id: "/",
    name: "Grocery Flow",
    // Home screens truncate at roughly 12 characters.
    short_name: "Grocery",
    description:
      "Track what the household buys each month, and plan the next one.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // The layout is a single 28rem column with a bottom nav; landscape only
    // stretches it.
    orientation: "portrait",
    // Matches the light `--background`, which is what shows behind the app
    // while it launches. The dark equivalent comes from the `themeColor`
    // media queries in the root layout, which override this once loaded.
    background_color: "#f5f7f3",
    theme_color: "#f5f7f3",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops these to whatever shape the launcher uses, so they are
      // full-bleed with the bag inside the safe zone.
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-pressing the home screen icon jumps straight to the two things
    // you open the app to do.
    shortcuts: [
      {
        name: "Log a trip",
        short_name: "Log",
        description: "Record what you just bought",
        url: "/log",
      },
      {
        name: "Shopping list",
        short_name: "Plan",
        description: "This month's plan, ready to tick off",
        url: "/plan",
      },
    ],
  };
}
