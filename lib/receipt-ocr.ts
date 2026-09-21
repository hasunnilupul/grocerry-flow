/** Reads the text off a receipt, in the browser. Both engines are loaded on
 *  demand — they are ~13MB between them, which no one should pay for just by
 *  opening the Log tab — so this module must only ever be reached through a
 *  dynamic import inside a client component's event handler.
 *
 *  Running OCR on the phone rather than the server is what keeps this feature
 *  free: no vision API to pay per receipt, no serverless function billed for
 *  the seconds Tesseract spends, and no upload of the photo itself. Only the
 *  handful of parsed rows ever reaches the server, through the same form a
 *  hand-typed trip uses. */

import type { PDFDocumentProxy } from "pdfjs-dist";

export type OcrStage = "loading" | "rendering" | "recognizing";

export type OcrProgress = {
  stage: OcrStage;
  /** 1-based; always 1 for an image. */
  page: number;
  pageCount: number;
  /** 0..1 within the current stage and page. */
  progress: number;
};

/** Everything the engines need, served from this app rather than the public
 *  CDNs both libraries fall back to. `scripts/copy-ocr-assets.mjs` puts them
 *  there. The core is named as a file, not a directory, which pins the build
 *  instead of letting tesseract.js feature-detect among six of them. */
const TESSERACT_PATHS = {
  workerPath: "/tesseract/worker.min.js",
  corePath: "/tesseract/tesseract-core-simd-lstm.wasm.js",
  langPath: "/tesseract/lang",
};

const PDF_WORKER_SRC = "/pdf/pdf.worker.min.mjs";
const PDF_STANDARD_FONTS = "/pdf/standard_fonts/";
const PDF_WASM = "/pdf/wasm/";

/** A PDF page is 72dpi at scale 1, which Tesseract reads badly. ~200dpi is
 *  the usual floor for reliable OCR, hence the target width — an A4 page
 *  lands near 1700px wide. The cap stops an unusually small page (a till
 *  receipt saved at its true 80mm width) from being blown up to a canvas a
 *  phone can't allocate. */
const TARGET_WIDTH = 1700;
const MAX_SCALE = 4;

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    (file.type === "" && file.name.toLowerCase().endsWith(".pdf"))
  );
}

function isImage(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    (file.type === "" && /\.(jpe?g|png|webp|bmp|gif)$/i.test(file.name))
  );
}

async function renderPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNumber);
  const scale = Math.min(
    TARGET_WIDTH / page.getViewport({ scale: 1 }).width,
    MAX_SCALE,
  );
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  // `intent: "print"` isn't about printing here — it's the one rendering path
  // pdf.js drives with promises instead of requestAnimationFrame. A phone
  // that locks, or a tab sent to the background while the scan runs, stops
  // firing animation frames, and a display render would sit there unfinished
  // until the page was looked at again. Nothing is being displayed anyway:
  // this canvas exists to be read by the OCR engine and thrown away.
  await page.render({ canvas, viewport, intent: "print" }).promise;
  page.cleanup();

  return canvas;
}

/** Reads every page of `file` and returns the text as one string, pages
 *  separated by newlines — which is all `parseReceiptText` needs, since it
 *  works a line at a time. Throws with a message worth showing if the file
 *  isn't something the engine can read. */
export async function extractReceiptText(
  file: File,
  onProgress?: (progress: OcrProgress) => void,
): Promise<string> {
  const pdf = isPdf(file);
  if (!pdf && !isImage(file)) {
    throw new Error("That file isn't a photo or a PDF.");
  }

  // Mutable so the logger below, which tesseract.js owns and calls whenever
  // it likes, reports against the page being worked on right now.
  const at = { page: 1, pageCount: 1 };
  const report = (stage: OcrStage, progress: number) =>
    onProgress?.({ stage, page: at.page, pageCount: at.pageCount, progress });

  const { createWorker, OEM } = await import("tesseract.js");
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    ...TESSERACT_PATHS,
    logger: (message) => {
      if (message.status === "recognizing text") {
        report("recognizing", message.progress);
      } else {
        report("loading", message.progress);
      }
    },
  });

  try {
    if (!pdf) {
      const { data } = await worker.recognize(file);
      return data.text;
    }

    const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
    GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;

    // Held onto because tearing the PDF down — worker included — is the
    // loading task's job, not the document's.
    const loadingTask = getDocument({
      data: await file.arrayBuffer(),
      standardFontDataUrl: PDF_STANDARD_FONTS,
      wasmUrl: PDF_WASM,
    });
    const document = await loadingTask.promise;

    at.pageCount = document.numPages;
    const pages: string[] = [];

    try {
      // One page at a time: a rendered A4 canvas is ~16MB, and holding every
      // page of a long receipt open at once is how a phone tab gets killed.
      for (let number = 1; number <= document.numPages; number++) {
        at.page = number;
        report("rendering", 0);

        const canvas = await renderPage(document, number);
        try {
          const { data } = await worker.recognize(canvas);
          pages.push(data.text);
        } finally {
          canvas.width = 0;
          canvas.height = 0;
        }
      }
    } finally {
      await loadingTask.destroy();
    }

    return pages.join("\n");
  } finally {
    await worker.terminate();
  }
}
