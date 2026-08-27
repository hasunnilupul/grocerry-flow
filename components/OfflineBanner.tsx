"use client";

import { useOffline } from "next/offline";
import { WifiOffIcon } from "lucide-react";

/**
 * Sits above everything and says so when the phone loses its connection, then
 * takes itself away once the connection is back.
 *
 * `useOffline` is more honest than `navigator.onLine`, which still reports
 * true on a WiFi network that cannot reach the internet: Next.js also flips
 * this on when one of its own requests fails, and flips it back only after a
 * `HEAD` check actually succeeds. It needs `experimental.useOffline` in
 * `next.config.ts` — without the flag the hook is hardcoded to `false` and
 * this component never renders.
 */
export default function OfflineBanner() {
  const isOffline = useOffline();

  // Also the "close": there is nothing to dismiss once the connection is back.
  if (!isOffline) return null;

  return (
    // `polite` rather than `alert`: losing signal is not an emergency, and a
    // screen reader should finish the sentence it is on first. Nothing here is
    // tappable, so the strip must not eat taps meant for the page under it.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg animate-in fade-in slide-in-from-top-2">
        <WifiOffIcon className="size-5 shrink-0 text-warning" aria-hidden="true" />
        <p className="text-sm">
          <span className="font-medium">You&rsquo;re offline.</span>{" "}
          <span className="text-muted-foreground">
            Anything you save finishes on its own once you&rsquo;re back.
          </span>
        </p>
      </div>
    </div>
  );
}
