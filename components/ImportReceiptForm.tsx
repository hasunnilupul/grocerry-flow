"use client";

import { useRef, useState } from "react";
import { FileTextIcon, ScanLineIcon } from "lucide-react";
import TripForm, { type InitialRow } from "@/components/TripForm";
import type { CatalogItem } from "@/lib/trips";
import { parseReceiptText } from "@/lib/receipt-parse";
import type { OcrProgress } from "@/lib/receipt-ocr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type State =
  | { status: "picking" }
  | { status: "scanning"; fileName: string; progress: OcrProgress | null }
  | {
      status: "reviewing";
      rows: InitialRow[];
      store: string | null;
      shoppedAt: string | null;
    }
  | { status: "error"; message: string }
  | { status: "manual" };

function progressLabel(progress: OcrProgress | null): string {
  if (!progress) return "Starting…";

  const percent = Math.round(progress.progress * 100);
  const page =
    progress.pageCount > 1
      ? ` — page ${progress.page} of ${progress.pageCount}`
      : "";

  if (progress.stage === "loading") return `Loading the scanner… ${percent}%`;
  if (progress.stage === "rendering") return `Opening the receipt${page}…`;
  return `Reading the receipt${page}… ${percent}%`;
}

export default function ImportReceiptForm({
  today,
  catalog,
  stores,
}: {
  today: string;
  catalog: CatalogItem[];
  stores: string[];
}) {
  const [state, setState] = useState<State>({ status: "picking" });
  const fileInput = useRef<HTMLInputElement | null>(null);
  // Bumped per scan so a second receipt mounts a fresh review form rather
  // than reusing the first one's defaults, which are uncontrolled.
  const [scan, setScan] = useState(0);

  async function handleFile(file: File) {
    setScan((count) => count + 1);
    setState({ status: "scanning", fileName: file.name, progress: null });

    try {
      // Loaded here, not at the top of the module: the engines are ~13MB,
      // and the Log tab shouldn't carry them for everyone who never scans.
      const { extractReceiptText } = await import("@/lib/receipt-ocr");

      const text = await extractReceiptText(file, (progress) =>
        setState((current) =>
          current.status === "scanning" ? { ...current, progress } : current,
        ),
      );

      const { rows, store, shoppedAt } = parseReceiptText(text);

      if (rows.length === 0) {
        setState({
          status: "error",
          message:
            "Couldn't find any items on that one. A straight-on photo of the itemised part usually reads best.",
        });
        return;
      }

      setState({ status: "reviewing", rows, store, shoppedAt });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Couldn't read that file.",
      });
    }
  }

  if (state.status === "reviewing") {
    return (
      <div className="flex flex-col gap-3">
        <Card className="border-dashed py-0 shadow-none">
          <CardContent className="flex items-center gap-3 px-3 py-3">
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">
              {state.rows.length} item{state.rows.length === 1 ? "" : "s"} read
              off the receipt. Check them over, then save.
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setState({ status: "picking" })}
              className="h-11 shrink-0 text-primary"
            >
              Start over
            </Button>
          </CardContent>
        </Card>

        <TripForm
          key={scan}
          today={today}
          catalog={catalog}
          stores={stores}
          initialRows={state.rows}
          initialStore={state.store}
          initialShoppedAt={state.shoppedAt}
        />
      </div>
    );
  }

  if (state.status === "manual") {
    return <TripForm today={today} catalog={catalog} stores={stores} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={fileInput}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared so picking the same file twice still fires a change.
          event.target.value = "";
          if (file) handleFile(file);
        }}
      />

      <Card className="border-dashed py-0 shadow-none">
        <CardContent className="flex flex-col items-center gap-3 px-4 py-8 text-center">
          {state.status === "scanning" ? (
            <>
              <ScanLineIcon className="size-8 animate-pulse text-primary" />
              <p aria-live="polite" className="text-sm font-medium">
                {progressLabel(state.progress)}
              </p>
              <p className="text-sm text-muted-foreground">
                {state.fileName}
              </p>
              <p className="text-xs text-muted-foreground">
                Reading happens on this phone, so it can take a minute. The
                first scan also downloads the reader.
              </p>
            </>
          ) : (
            <>
              <FileTextIcon className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {state.status === "error"
                  ? state.message
                  : "Take a photo of the receipt, or pick a PDF bill. You'll get a chance to fix anything before it's saved."}
              </p>
              <Button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="h-12 px-5"
              >
                {state.status === "error" ? "Try another file" : "Choose a receipt"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {state.status === "scanning" ? null : (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setState({ status: "manual" })}
          className="h-11 text-muted-foreground"
        >
          Type it in instead
        </Button>
      )}
    </div>
  );
}
