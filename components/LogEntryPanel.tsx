"use client";

import { useState } from "react";
import { KeyboardIcon, ScanLineIcon } from "lucide-react";
import ImportReceiptForm from "@/components/ImportReceiptForm";
import TripForm from "@/components/TripForm";
import type { CatalogItem } from "@/lib/trips";
import { Button } from "@/components/ui/button";

/** Picks between typing a trip in and scanning a receipt. Both end at the
 *  same form and the same server action — scanning only fills it in first. */
export default function LogEntryPanel({
  today,
  catalog,
  stores,
}: {
  today: string;
  catalog: CatalogItem[];
  stores: string[];
}) {
  const [mode, setMode] = useState<"manual" | "import">("manual");

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="How to log this trip" className="flex gap-2">
        <Button
          type="button"
          variant={mode === "manual" ? "secondary" : "ghost"}
          aria-pressed={mode === "manual"}
          onClick={() => setMode("manual")}
          className="h-11 flex-1"
        >
          <KeyboardIcon />
          Type it in
        </Button>
        <Button
          type="button"
          variant={mode === "import" ? "secondary" : "ghost"}
          aria-pressed={mode === "import"}
          onClick={() => setMode("import")}
          className="h-11 flex-1"
        >
          <ScanLineIcon />
          Scan a receipt
        </Button>
      </div>

      {mode === "manual" ? (
        <TripForm today={today} catalog={catalog} stores={stores} />
      ) : (
        <ImportReceiptForm today={today} catalog={catalog} stores={stores} />
      )}
    </div>
  );
}
