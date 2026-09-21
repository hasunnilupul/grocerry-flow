// Copies the OCR engine's runtime assets out of node_modules and into
// public/, so receipt scanning runs entirely from this app's own origin.
// Run with `pnpm ocr-assets`; `pnpm dev` and `pnpm build` run it first.
//
// Left to itself, tesseract.js fetches its WASM core and language data from
// a public CDN, and pdf.js does the same for its worker. That would make an
// offline-ish, self-hosted app quietly depend on someone else's bandwidth,
// so every path handed to those libraries in lib/receipt-ocr.ts points here
// instead.
//
// The output is ~13MB and derived entirely from installed packages, so it is
// generated rather than committed (see .gitignore) — no network access, and
// nothing to keep in sync by hand.

import { createRequire } from "node:module";
import { cp, mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Resolve a package's directory without assuming a node_modules layout.
 *  `from` anchors the lookup at another package, which is what finds
 *  tesseract.js-core: it belongs to tesseract.js, and pnpm keeps transitive
 *  dependencies out of the root node_modules. */
function packageDir(name, from = import.meta.url) {
  return dirname(createRequire(from).resolve(`${name}/package.json`));
}

const TESSERACT = packageDir("tesseract.js");
const TESSERACT_CORE = packageDir(
  "tesseract.js-core",
  join(TESSERACT, "package.json"),
);
const ENG_DATA = packageDir("@tesseract.js-data/eng");
const PDFJS = packageDir("pdfjs-dist");

/** Each entry is [source, destination-relative-to-public].
 *
 *  Only the SIMD+LSTM core is shipped, and lib/receipt-ocr.ts names that file
 *  explicitly rather than pointing at the directory. Given a directory,
 *  tesseract.js feature-detects and picks one of six cores at runtime, which
 *  would mean shipping all of them (~44MB) to cover every branch. Pinning one
 *  costs a device without WASM SIMD (nothing since ~2021) the feature, and
 *  that device still has manual entry. */
const ASSETS = [
  [join(TESSERACT, "dist", "worker.min.js"), "tesseract/worker.min.js"],
  [
    join(TESSERACT_CORE, "tesseract-core-simd-lstm.wasm.js"),
    "tesseract/tesseract-core-simd-lstm.wasm.js",
  ],
  [
    join(TESSERACT_CORE, "tesseract-core-simd-lstm.wasm"),
    "tesseract/tesseract-core-simd-lstm.wasm",
  ],
  // The LSTM-only core reads the "best_int" data; the other copy in this
  // package is for the legacy core, which is not shipped.
  [
    join(ENG_DATA, "4.0.0_best_int", "eng.traineddata.gz"),
    "tesseract/lang/eng.traineddata.gz",
  ],
  [join(PDFJS, "build", "pdf.worker.min.mjs"), "pdf/pdf.worker.min.mjs"],
  // Fonts for PDFs that reference the standard 14 without embedding them,
  // and the decoders pdf.js uses for JPEG 2000 / JBIG2 scans.
  [join(PDFJS, "standard_fonts"), "pdf/standard_fonts"],
  [join(PDFJS, "wasm"), "pdf/wasm"],
];

async function sizeOf(path) {
  try {
    const stats = await stat(path);
    return stats.isDirectory() ? "dir" : stats.size;
  } catch {
    return null;
  }
}

let copied = 0;

for (const [source, target] of ASSETS) {
  const destination = join(ROOT, "public", target);

  // Skip files that are already in place and unchanged, so running this
  // before every `next dev` stays effectively free.
  const [sourceSize, destinationSize] = await Promise.all([
    sizeOf(source),
    sizeOf(destination),
  ]);

  if (sourceSize === null) {
    console.error(`Missing OCR asset: ${source}\nRun \`pnpm install\` first.`);
    process.exit(1);
  }

  if (sourceSize !== "dir" && sourceSize === destinationSize) continue;
  if (sourceSize === "dir" && destinationSize === "dir") continue;

  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
  copied++;
}

console.log(
  copied === 0
    ? "OCR assets already up to date."
    : `Copied ${copied} OCR asset${copied === 1 ? "" : "s"} into public/.`,
);
