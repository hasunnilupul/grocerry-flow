// Draws the app icon — a shopping bag on the brand green — and writes every
// size the install prompts ask for. Run it with `pnpm icons` after changing
// anything below; the PNGs it produces are committed, so a build never has to
// rasterise anything.
//
// Everything here is deliberately dependency-free: Node's zlib is enough to
// write a PNG, and the mark is simple enough to describe with distance fields
// rather than a drawing library.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Brand green — `--primary` from the light theme in `app/globals.css`. */
const BRAND = [0x2f, 0x7d, 0x4f];
const GLYPH = [0xff, 0xff, 0xff];

/** Samples per pixel axis. 4x4 is enough to keep the curves clean at 48px. */
const SUBSAMPLES = 4;

// --- The mark, in a 0..1 box ------------------------------------------------

/** Distance to a rounded rectangle: negative inside, positive outside. */
function roundedRectDistance(x, y, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(x - cx) - (halfW - radius);
  const dy = Math.abs(y - cy) - (halfH - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

const BAG_BODY = {
  cx: 0.5,
  cy: 0.585,
  halfH: 0.185,
  halfWTop: 0.275,
  halfWBottom: 0.23,
  radius: 0.055,
};
/** The ring's lower ends stop exactly on the body's top edge, so the handle
 *  and the bag read as one shape. */
const BAG_HANDLE = { cx: 0.5, cy: 0.4, radius: 0.145, stroke: 0.052 };

function insideBag(x, y) {
  // The body tapers, so squeeze x back to a straight-sided box by the amount
  // the bag has narrowed at this height and test that instead.
  const t = (y - (BAG_BODY.cy - BAG_BODY.halfH)) / (2 * BAG_BODY.halfH);
  const halfW =
    BAG_BODY.halfWTop + (BAG_BODY.halfWBottom - BAG_BODY.halfWTop) * t;
  const squeezed = BAG_BODY.cx + (x - BAG_BODY.cx) * (BAG_BODY.halfWTop / halfW);
  if (
    t >= 0 &&
    t <= 1 &&
    roundedRectDistance(squeezed, y, BAG_BODY.cx, BAG_BODY.cy, BAG_BODY.halfWTop, BAG_BODY.halfH, BAG_BODY.radius) <= 0
  ) {
    return true;
  }
  // Only the top half of the ring is drawn — the rest would sit inside the bag.
  if (y > BAG_HANDLE.cy) return false;
  const ring = Math.abs(Math.hypot(x - BAG_HANDLE.cx, y - BAG_HANDLE.cy) - BAG_HANDLE.radius);
  return ring <= BAG_HANDLE.stroke / 2;
}

// --- Rasteriser -------------------------------------------------------------

/**
 * @param size       pixel width and height
 * @param corner     corner radius as a fraction of `size`; 0 is a full square
 * @param glyphScale the bag is scaled about the centre by this much
 */
function render(size, { corner, glyphScale }) {
  const pixels = Buffer.alloc(size * size * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let tileHits = 0;
      let glyphHits = 0;

      for (let sy = 0; sy < SUBSAMPLES; sy++) {
        for (let sx = 0; sx < SUBSAMPLES; sx++) {
          const x = (px + (sx + 0.5) / SUBSAMPLES) / size;
          const y = (py + (sy + 0.5) / SUBSAMPLES) / size;

          const onTile =
            corner === 0 ||
            roundedRectDistance(x, y, 0.5, 0.5, 0.5, 0.5, corner) <= 0;
          if (!onTile) continue;
          tileHits++;

          const gx = (x - 0.5) / glyphScale + 0.5;
          const gy = (y - 0.5) / glyphScale + 0.5;
          if (insideBag(gx, gy)) glyphHits++;
        }
      }

      const samples = SUBSAMPLES * SUBSAMPLES;
      const tile = tileHits / samples;
      const glyph = glyphHits / samples;
      const i = (py * size + px) * 4;
      if (tile === 0) continue;

      // Composite white over green in premultiplied space, then divide the
      // colour back out — PNG stores straight alpha.
      const alpha = tile;
      for (let c = 0; c < 3; c++) {
        const premultiplied = GLYPH[c] * glyph + BRAND[c] * (tile - glyph);
        pixels[i + c] = Math.round(premultiplied / alpha);
      }
      pixels[i + 3] = Math.round(alpha * 255);
    }
  }
  return pixels;
}

// --- PNG / ICO encoders -----------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // truecolour with alpha
  // Bytes 10-12 stay zero: deflate, no filter, no interlace.

  // One filter byte per scanline; `0` means the row is stored as-is.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let row = 0; row < size; row++) {
    pixels.copy(raw, row * (stride + 1) + 1, row * stride, (row + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** An .ico is a directory of images; every modern browser reads PNG entries. */
function encodeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(entries.length, 4);

  let cursor = 6 + entries.length * 16;
  const directory = entries.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size; // 0 means 256
    entry[1] = size >= 256 ? 0 : size;
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(cursor, 12);
    cursor += png.length;
    return entry;
  });

  return Buffer.concat([header, ...directory, ...entries.map((e) => e.png)]);
}

// --- Outputs ----------------------------------------------------------------

/** iOS rounds the corners itself, Android masks maskable icons itself; only
 *  the plain manifest icons and the favicon draw their own tile. */
const TILE = { corner: 0.22, glyphScale: 1 };
const SQUARE = { corner: 0, glyphScale: 1 };
/** Android's maskable safe zone is the middle 80%, so the bag shrinks to fit. */
const MASKABLE = { corner: 0, glyphScale: 0.88 };

const PNGS = [
  ["public/icon-192.png", 192, TILE],
  ["public/icon-512.png", 512, TILE],
  ["public/icon-maskable-192.png", 192, MASKABLE],
  ["public/icon-maskable-512.png", 512, MASKABLE],
  ["app/apple-icon.png", 180, SQUARE],
];

for (const [path, size, options] of PNGS) {
  const file = join(ROOT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, encodePng(size, render(size, options)));
  console.log(`${path} (${size}x${size})`);
}

const icoSizes = [16, 32, 48];
writeFileSync(
  join(ROOT, "app/favicon.ico"),
  encodeIco(
    icoSizes.map((size) => ({
      size,
      // Small favicons lose the corner rounding to smudge, so keep it tight.
      png: encodePng(size, render(size, { corner: 0.16, glyphScale: 1 })),
    })),
  ),
);
console.log(`app/favicon.ico (${icoSizes.join(", ")})`);
