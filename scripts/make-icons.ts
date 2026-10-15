// Makes the app icons in public/icons from the TurnAround mark.
// Run with:  npm run icons

import { mkdirSync, writeFileSync } from "node:fs";
import { COLORS, MARK_64, pngSize, renderPng } from "./brand";

mkdirSync("public/icons", { recursive: true });

// Regular icon: rounded navy square with the mark filling most of it.
function roundedIcon(size: number): string {
  const s = size / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${14 * s}" fill="${COLORS.navy}"/>
  <g transform="scale(${s})">${MARK_64}</g>
</svg>`;
}

// Full-bleed square (no transparent corners). Phones cut their own shape out of it, so the
// mark is shrunk to stay inside the middle "safe zone" (a circle 80% of the icon's width).
function fullBleedIcon(size: number, markShare: number): string {
  const s = (size * markShare) / 44; // the mark is about 44 units wide
  const cx = 31; // center of the mark on its 64-unit grid
  const cy = 33.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${COLORS.navy}"/>
  <g transform="translate(${size / 2 - cx * s} ${size / 2 - cy * s}) scale(${s})">${MARK_64}</g>
</svg>`;
}

const outputs: [string, string][] = [
  ["public/icons/icon-192.png", roundedIcon(192)],
  ["public/icons/icon-512.png", roundedIcon(512)],
  ["public/icons/icon-maskable-512.png", fullBleedIcon(512, 0.55)],
  ["public/icons/apple-touch-icon.png", fullBleedIcon(180, 0.62)],
  // Large versions for forms and app listings (not used by the website itself).
  ["cover/icon-1024-rounded.png", roundedIcon(1024)],
  ["cover/icon-1024-square.png", fullBleedIcon(1024, 0.62)],
];

for (const [file, svg] of outputs) {
  const png = renderPng(svg).asPng();
  writeFileSync(file, png);
  const { width, height } = pngSize(png);
  console.log(`${file}: ${width} x ${height}`);
}

writeFileSync("public/favicon.svg", roundedIcon(64));
console.log("public/favicon.svg");
