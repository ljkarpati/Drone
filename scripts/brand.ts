// Shared drawing pieces for the icons and the cover image, plus a helper that turns SVG
// text into a PNG with the Inter font that ships in scripts/fonts (so the result looks the
// same on every computer).

import { Resvg } from "@resvg/resvg-js";
import path from "node:path";

export const COLORS = {
  navy: "#0B2545",
  white: "#FFFFFF",
  wave: "#7CC4FA",
  bayou: "#2F7FC1",
  flood: "#C42B1C",
  floodOutline: "#7A140B",
  paleText: "#D6E4F5",
  mapLand: "#EAF0F6",
  mapStreet: "#FFFFFF",
  mapMajor: "#F6EDC8",
};

// The TurnAround mark drawn on a 64 x 64 grid: a U-turn arrow above a wave.
// Same shapes as src/components/Logo.tsx.
export const MARK_64 = `
  <path d="M41 38V23a9 9 0 0 0-18 0v10" fill="none" stroke="${COLORS.white}" stroke-width="6" stroke-linecap="round"/>
  <path d="M15 31h16l-8 10z" fill="${COLORS.white}" stroke="${COLORS.white}" stroke-width="2" stroke-linejoin="round"/>
  <path d="M9 51q5.5-5 11 0t11 0 11 0 11 0" fill="none" stroke="${COLORS.wave}" stroke-width="4" stroke-linecap="round"/>`;

const FONT_DIR = path.resolve("scripts/fonts");

export function renderPng(svg: string) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "original" },
    font: {
      loadSystemFonts: false,
      fontFiles: ["Inter-Regular.otf", "Inter-Bold.otf", "Inter-ExtraBold.otf"].map((f) =>
        path.join(FONT_DIR, f),
      ),
      defaultFontFamily: "Inter",
    },
  });
  return resvg.render();
}

/** Reads the width and height stored in a PNG file's header. */
export function pngSize(png: Buffer): { width: number; height: number } {
  // A PNG starts with an 8-byte signature, then the IHDR chunk: width at byte 16, height at 20.
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}
