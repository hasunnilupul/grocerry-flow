import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import manifest from "./manifest";

// Vitest runs from the repo root, and jsdom's `URL` mangles Windows file URLs.
const publicFile = (src: string) => join(process.cwd(), "public", src);

describe("manifest", () => {
  const { icons = [], shortcuts = [] } = manifest();

  it("asks to be installed rather than opened in a tab", () => {
    expect(manifest().display).toBe("standalone");
    expect(manifest().start_url).toBe("/");
  });

  // Chrome refuses the install prompt without both of these, and the failure
  // is silent — the prompt simply never appears.
  it.each(["192x192", "512x512"])("ships a %s icon", (sizes) => {
    expect(icons.some((icon) => icon.sizes === sizes && icon.purpose === "any")).toBe(true);
  });

  it("ships maskable icons so Android does not letterbox the mark", () => {
    expect(icons.filter((icon) => icon.purpose === "maskable")).toHaveLength(2);
  });

  it("points every icon at a file that exists", () => {
    for (const icon of icons) {
      expect(existsSync(publicFile(icon.src)), `missing ${icon.src}`).toBe(true);
    }
  });

  it("points every shortcut at a route in scope", () => {
    for (const shortcut of shortcuts) {
      expect(shortcut.url.startsWith("/")).toBe(true);
    }
  });
});
