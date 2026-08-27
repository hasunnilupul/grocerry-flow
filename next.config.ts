import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is Next.js 16's answer to ISR. Pages prerender to a
  // static shell, `use cache` scopes hold the rendered data, and a mutation
  // regenerates them by tag instead of every page view hitting Postgres.
  cacheComponents: true,
  // Prefetch one reusable shell per route as its nav link comes into view.
  // The bottom nav is always on screen, so all four tabs are ready to render
  // before they're tapped.
  partialPrefetching: true,
};

export default nextConfig;
