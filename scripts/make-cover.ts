// Makes the Congressional App Challenge cover image: cover/turnaround-cover.png (600 x 800).
// Run with:  npm run cover
//
// The picture is written as SVG (cover/cover.svg), then turned into a PNG. All artwork is
// original: a made-up street grid, not a traced map. The script then checks itself:
//   1. the PNG is exactly 600 x 800, and
//   2. no text comes closer than 40 px to any edge (so nothing gets cropped).

import { mkdirSync, writeFileSync } from "node:fs";
import { COLORS, MARK_64, pngSize, renderPng } from "./brand";

const W = 600;
const H = 800;
const MARGIN = 40;

// ---- Middle: the stylized map, inside a rounded card ----
const CARD = { x: 40, y: 300, w: 520, h: 380 };

function streetGrid(): string {
  const lines: string[] = [];
  for (let x = CARD.x + 30; x < CARD.x + CARD.w; x += 52) {
    lines.push(`<line x1="${x}" y1="${CARD.y}" x2="${x}" y2="${CARD.y + CARD.h}"/>`);
  }
  for (let y = CARD.y + 26; y < CARD.y + CARD.h; y += 52) {
    lines.push(`<line x1="${CARD.x}" y1="${y}" x2="${CARD.x + CARD.w}" y2="${y}"/>`);
  }
  return `<g stroke="${COLORS.mapStreet}" stroke-width="7">${lines.join("")}</g>`;
}

// Two wider "main roads" so the grid doesn't look like graph paper.
const MAJOR_ROADS = `<g stroke="${COLORS.mapMajor}" stroke-width="14">
  <line x1="${CARD.x + 30 + 52 * 5}" y1="${CARD.y}" x2="${CARD.x + 30 + 52 * 5}" y2="${CARD.y + CARD.h}"/>
  <line x1="${CARD.x}" y1="${CARD.y + 26 + 52 * 1}" x2="${CARD.x + CARD.w}" y2="${CARD.y + 26 + 52 * 1}"/>
</g>`;

// The bayou: a winding blue line across the card.
const BAYOU_PATH = "M20 556 C 100 520, 150 600, 230 556 S 360 470, 440 482 S 540 480, 590 440";

// Two flooded areas sitting on the bayou, with a gap between them.
const FLOODS = `<g fill="${COLORS.flood}" fill-opacity="0.6" stroke="${COLORS.floodOutline}" stroke-width="4">
  <ellipse cx="165" cy="560" rx="80" ry="48" transform="rotate(-8 165 560)"/>
  <ellipse cx="440" cy="482" rx="80" ry="48" transform="rotate(-10 440 482)"/>
</g>`;

// The route: from a start dot in the south-west, along streets, through the dry gap between
// the floods, around the top of the second flood, out to an arrow at the right edge.
// It runs along the grid's streets (x = 278, y = 638 and the main road at y = 378) and stays
// at least 20 px clear of both flooded areas.
const ROUTE_POINTS = "M100 638 H 278 V 378 H 520";
const ROUTE = `
  <path d="${ROUTE_POINTS}" fill="none" stroke="${COLORS.white}" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="${ROUTE_POINTS}" fill="none" stroke="${COLORS.navy}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M514 352 L 556 378 L 514 404 Z" fill="${COLORS.navy}" stroke="${COLORS.white}" stroke-width="5" stroke-linejoin="round"/>
  <circle cx="100" cy="638" r="15" fill="${COLORS.navy}" stroke="${COLORS.white}" stroke-width="6"/>`;

const MAP = `
<defs>
  <clipPath id="card"><rect x="${CARD.x}" y="${CARD.y}" width="${CARD.w}" height="${CARD.h}" rx="26"/></clipPath>
</defs>
<g clip-path="url(#card)">
  <rect x="${CARD.x}" y="${CARD.y}" width="${CARD.w}" height="${CARD.h}" fill="${COLORS.mapLand}"/>
  ${streetGrid()}
  ${MAJOR_ROADS}
  <path d="${BAYOU_PATH}" fill="none" stroke="${COLORS.bayou}" stroke-width="16" stroke-linecap="round"/>
  ${FLOODS}
  ${ROUTE}
</g>`;

// ---- Top third: logo, name and tagline. Bottom: the three features. ----
const TEXT = `
<g font-family="Inter">
  <text x="${MARGIN}" y="178" font-size="78" font-weight="800" fill="${COLORS.white}" letter-spacing="-1.5">TurnAround</text>
  <text x="${MARGIN}" y="224" font-size="28" font-weight="400" fill="${COLORS.paleText}">Get out of Meyerland without</text>
  <text x="${MARGIN}" y="260" font-size="28" font-weight="400" fill="${COLORS.paleText}">driving into water.</text>
  <text x="${W / 2}" y="720" font-size="20" font-weight="700" fill="${COLORS.white}" text-anchor="middle">Live Brays Bayou levels · Flood-safe routing</text>
  <text x="${W / 2}" y="750" font-size="20" font-weight="700" fill="${COLORS.white}" text-anchor="middle">Tested on Hurricane Harvey</text>
</g>`;

const LOGO = `<g transform="translate(${MARGIN} 44) scale(1.1)">
  <rect width="64" height="64" rx="14" fill="#13345F"/>${MARK_64}
</g>`;

function svgDoc(body: string, background = true): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${background ? `<rect width="${W}" height="${H}" fill="${COLORS.navy}"/>` : ""}
${body}
</svg>
`;
}

const fullSvg = svgDoc(`${LOGO}\n${MAP}\n${TEXT}`);

mkdirSync("cover", { recursive: true });
writeFileSync("cover/cover.svg", fullSvg);
const png = renderPng(fullSvg).asPng();
writeFileSync("cover/turnaround-cover.png", png);

// Check 1: exact size.
const { width, height } = pngSize(png);
if (width !== W || height !== H) throw new Error(`Cover is ${width} x ${height}, expected ${W} x ${H}`);

// Check 2: render the text alone on a see-through background and find its edges.
const textOnly = renderPng(svgDoc(TEXT, false));
const px = textOnly.pixels;
let minX = W;
let minY = H;
let maxX = -1;
let maxY = -1;
for (let y = 0; y < textOnly.height; y++) {
  for (let x = 0; x < textOnly.width; x++) {
    if (px[(y * textOnly.width + x) * 4 + 3] > 0) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
}
if (maxX < 0) throw new Error("No text was drawn. Are the fonts in scripts/fonts?");
const gaps = { left: minX, right: W - 1 - maxX, top: minY, bottom: H - 1 - maxY };
const tooClose = Object.entries(gaps).filter(([, gap]) => gap < MARGIN);
if (tooClose.length > 0) {
  throw new Error(`Text is too close to the edge: ${JSON.stringify(gaps)}`);
}

console.log(`cover/turnaround-cover.png: ${width} x ${height}`);
console.log(`Text distance from edges (px): ${JSON.stringify(gaps)}`);
