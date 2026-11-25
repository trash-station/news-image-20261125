// news-image-20261125 — "The World Today": one day's world news, drawn in code.
// A program that draws a newspaper front page summing up Wednesday 25 November
// 2026 and writes it to /output/entry.png (PNG, 1024x1024, stdlib only).
// No network, no fonts, no image files: every pixel is drawn here, so both runs
// write byte-identical output.
//
// The five stories (each verified from wire reports of 25 Nov 2026):
//  1. IRGC says two oil tankers hit naval mines in the Strait of Hormuz (claims
//     unverified, ships unnamed) — Reuters / Press TV, 25 Nov 2026.
//  2. Putin says retaliation for Ukraine's refinery strikes is "inevitable" —
//     Reuters, 24-25 Nov 2026.
//  3. Nvidia falls ~7% and Asia's tech stocks slide on AI doubts — Barron's /
//     BBC, 25 Nov 2026 (Nikkei -2.76%, S&P 500 -0.5%).
//  4. Shenzhou-24 docks at Tiangong with Zeeshan Ali, Pakistan's first astronaut
//     and the station's first foreign guest — Reuters, 25 Nov 2026.
//  5. All hostages freed as Colombian forces storm a Cartagena supermarket after
//     a ~20-hour siege; one gunman killed, four detained — Reuters / AFP, 25 Nov.
//
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 bits ("1" = ink). Text is set in
// capitals, newspaper style; anything unknown renders as a space.
// ---------------------------------------------------------------------------
type Glyph = [string, string, string, string, string, string, string];
const FONT: Record<string, Glyph> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '+': ['00000', '00100', '00100', '01110', '00100', '00100', '00000'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '"': ['01010', '01010', '00000', '00000', '00000', '00000', '00000'],
  '=': ['00000', '00000', '01110', '00000', '01110', '00000', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  '\u2014': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '*': ['00000', '10101', '01110', '10101', '00000', '00000', '00000'],
  '\u2022': ['00000', '00000', '01100', '01100', '01100', '00000', '00000'],
  '>': ['10000', '01000', '00100', '00010', '00100', '01000', '10000'],
  '<': ['00001', '00010', '00100', '01000', '00100', '00010', '00001'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  _: ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  '[': ['01110', '01000', '01000', '01000', '01000', '01000', '01110'],
  ']': ['01110', '00010', '00010', '00010', '00010', '00010', '01110'],
};
const BLANK: Glyph = ['00000', '00000', '00000', '00000', '00000', '00000', '00000'];

// ---------------------------------------------------------------------------
// Raster canvas (RGB) and drawing primitives.
// ---------------------------------------------------------------------------
type RGB = [number, number, number];
const PAPER: RGB = [246, 241, 231];
const INK: RGB = [25, 25, 25];
const NAVY: RGB = [22, 35, 63];
const NAVY2: RGB = [44, 62, 99];
const RED: RGB = [179, 38, 30];
const WHITE: RGB = [255, 255, 255];
const PANEL: RGB = [255, 255, 255];
const RULE: RGB = [201, 194, 178];
const SEA: RGB = [31, 78, 121];
const SEA2: RGB = [58, 120, 170];
const FLAME: RGB = [232, 100, 28];
const FLAME2: RGB = [240, 178, 44];
const GREEN: RGB = [30, 122, 52];
const GOLD: RGB = [201, 162, 39];
const GREY: RGB = [110, 108, 100];

const px = new Uint8Array(W * H * 3);

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
    }
  }
}

function frame(x: number, y: number, w: number, h: number, c: RGB, t = 2): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

function line(x0: number, y0: number, x1: number, y1: number, c: RGB, w = 1): void {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) {
    for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) setPixel(x + a, y + b, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    for (let x = -half; x <= half; x++) setPixel(cx + x, cy + y, c);
  }
}

function ring(cx: number, cy: number, r: number, c: RGB, t = 2): void {
  for (let a = 0; a < 360; a++) {
    const rad = (a * Math.PI) / 180;
    for (let k = 0; k < t; k++) {
      setPixel(Math.round(cx + (r - k) * Math.cos(rad)), Math.round(cy + (r - k) * Math.sin(rad)), c);
    }
  }
}

function fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minX = Math.max(0, Math.min(x0, x1, x2)), maxX = Math.min(W - 1, Math.max(x0, x1, x2));
  const minY = Math.max(0, Math.min(y0, y1, y2)), maxY = Math.min(H - 1, Math.max(y0, y1, y2));
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
      const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
      const cc = 1 - a - b;
      if (a >= 0 && b >= 0 && cc >= 0) setPixel(x, y, c);
    }
  }
}

// A starburst (explosion / sun) centred at (cx, cy).
function starburst(cx: number, cy: number, rOuter: number, rInner: number, points: number, c: RGB): void {
  for (let i = 0; i < points; i++) {
    const a0 = (i * 2 * Math.PI) / points - Math.PI / 2;
    const a1 = ((i + 0.5) * 2 * Math.PI) / points - Math.PI / 2;
    const a2 = ((i + 1) * 2 * Math.PI) / points - Math.PI / 2;
    const x0 = Math.round(cx + rOuter * Math.cos(a0)), y0 = Math.round(cy + rOuter * Math.sin(a0));
    const x1 = Math.round(cx + rInner * Math.cos(a1)), y1 = Math.round(cy + rInner * Math.sin(a1));
    const x2 = Math.round(cx + rOuter * Math.cos(a2)), y2 = Math.round(cy + rOuter * Math.sin(a2));
    fillTriangle(cx, cy, x0, y0, x1, y1, c);
    fillTriangle(cx, cy, x1, y1, x2, y2, c);
  }
}

// ---------------------------------------------------------------------------
// Text. One glyph is 5x7 cells; scale s makes each cell s pixels. Advance is
// 6*s, line height 9*s. All text is upper-cased by the renderer.
// ---------------------------------------------------------------------------
function textWidth(text: string, s: number): number {
  return text.toUpperCase().length * 6 * s - s;
}

function drawText(x: number, y: number, text: string, s: number, c: RGB): void {
  const t = text.toUpperCase();
  for (let ci = 0; ci < t.length; ci++) {
    const g = FONT[t[ci]] ?? BLANK;
    const gx = x + ci * 6 * s;
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === '1') fillRect(gx + col * s, y + r * s, s, s, c);
      }
    }
  }
}

function drawTextCentred(cx: number, y: number, text: string, s: number, c: RGB): void {
  drawText(cx - Math.floor(textWidth(text, s) / 2), y, text, s, c);
}

// Greedy word wrap to a pixel width; returns the lines.
function wrap(text: string, maxW: number, s: number): string[] {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (textWidth(next, s) <= maxW || !cur) cur = next;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawLines(x: number, y: number, lines: string[], s: number, c: RGB, gap = 2): void {
  const lh = 7 * s + gap * s;
  lines.forEach((ln, i) => drawText(x, y + i * lh, ln, s, c));
}

// ---------------------------------------------------------------------------
// PNG encoder (RGB, filter 0, zlib level 9). Deterministic: same pixels give
// the same bytes on every run.
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Pictograms. Each is drawn inside a box (x, y, w, h) with flat shapes only.
// ---------------------------------------------------------------------------

// Lead art: an oil tanker on the sea with a naval mine and a burst of flame.
function drawTanker(x: number, y: number, w: number, h: number): void {
  const seaY = y + Math.floor(h * 0.72);
  fillRect(x, seaY, w, h - (seaY - y), SEA);
  // waves
  for (let i = 0; i < 4; i++) {
    const wy = seaY + 14 + i * 16;
    for (let xx = x + 6; xx < x + w - 6; xx += 34) {
      line(xx, wy, xx + 16, wy, SEA2, 3);
    }
  }
  // hull
  const hullY = seaY - 58;
  fillRect(x + 18, hullY, w - 36, 58, INK);
  fillTriangle(x + 18, hullY, x + 18, hullY + 58, x - 6, hullY + 58, INK);
  fillRect(x + 18, hullY, w - 36, 8, RED);
  // deck tanks
  fillRect(x + 52, hullY - 26, 46, 26, WHITE);
  fillRect(x + 108, hullY - 26, 46, 26, WHITE);
  fillRect(x + 164, hullY - 26, 46, 26, WHITE);
  frame(x + 52, hullY - 26, 46, 26, INK, 2);
  frame(x + 108, hullY - 26, 46, 26, INK, 2);
  frame(x + 164, hullY - 26, 46, 26, INK, 2);
  // bridge + funnel
  fillRect(x + w - 78, hullY - 52, 52, 52, WHITE);
  frame(x + w - 78, hullY - 52, 52, 52, INK, 2);
  fillRect(x + w - 70, hullY - 44, 36, 10, NAVY);
  fillRect(x + w - 96, hullY - 40, 14, 40, INK);
  // flame from the funnel
  starburst(x + w - 89, hullY - 58, 26, 12, 8, FLAME);
  starburst(x + w - 89, hullY - 58, 15, 7, 8, FLAME2);
  // naval mine, lower right, spiked
  const mx = x + w - 52, my = seaY + 34, mr = 17;
  fillCircle(mx, my, mr, INK);
  for (let a = 0; a < 8; a++) {
    const rad = (a * Math.PI) / 4;
    line(
      Math.round(mx + (mr - 2) * Math.cos(rad)), Math.round(my + (mr - 2) * Math.sin(rad)),
      Math.round(mx + (mr + 13) * Math.cos(rad)), Math.round(my + (mr + 13) * Math.sin(rad)),
      INK, 4,
    );
  }
  fillCircle(mx, my, 6, GREY);
}

// Refinery towers with a flame — the refinery strikes.
function drawRefinery(x: number, y: number, w: number, h: number): void {
  const base = y + h - 16;
  fillRect(x, base, w, 16, GREY);
  // distillation towers
  fillRect(x + 8, y + 34, 22, base - (y + 34), NAVY);
  fillRect(x + 38, y + 18, 22, base - (y + 18), NAVY2);
  fillRect(x + 68, y + 44, 22, base - (y + 44), NAVY);
  // pipes
  line(x + 30, y + 60, x + 38, y + 60, INK, 3);
  line(x + 60, y + 70, x + 68, y + 70, INK, 3);
  // flame on the middle tower
  starburst(x + 49, y + 8, 15, 7, 8, FLAME);
  starburst(x + 49, y + 8, 8, 4, 8, FLAME2);
  // warning burst
  starburst(x + 96, y + 26, 17, 8, 8, RED);
  fillCircle(x + 96, y + 26, 6, WHITE);
  drawText(x + 92, y + 20, '!', 2, RED);
}

// Falling market chart — a red arrow down over bars.
function drawChart(x: number, y: number, w: number, h: number): void {
  const base = y + h - 18;
  // bars, descending
  const bars = [0.95, 0.8, 0.86, 0.62, 0.7, 0.45, 0.52, 0.3];
  const bw = Math.floor((w - 16) / bars.length);
  bars.forEach((f, i) => {
    const bh = Math.floor(f * (h - 40));
    fillRect(x + 8 + i * bw, base - bh, bw - 4, bh, i < 5 ? NAVY2 : RED);
  });
  // axis
  line(x + 4, y + 8, x + 4, base, INK, 2);
  line(x + 4, base, x + w - 4, base, INK, 2);
  // falling arrow
  line(x + 12, y + 18, x + w - 34, y + h - 44, RED, 5);
  fillTriangle(x + w - 34, y + h - 44, x + w - 52, y + h - 50, x + w - 38, y + h - 28, RED);
  drawText(x + w - 54, y + 2, '-7%', 3, RED);
}

// Rocket climbing to a small station — the space story.
function drawRocket(x: number, y: number, w: number, h: number): void {
  // stars
  const stars: Array<[number, number]> = [[14, 14], [92, 10], [104, 52], [8, 60], [60, 6]];
  for (const [sx, sy] of stars) fillRect(x + sx, y + sy, 4, 4, GOLD);
  // station: hub + panels
  fillRect(x + 62, y + 12, 40, 16, NAVY);
  fillRect(x + 58, y + 16, 6, 8, GOLD);
  fillRect(x + 100, y + 16, 6, 8, GOLD);
  fillRect(x + 74, y + 28, 16, 10, NAVY2);
  // rocket body, diagonal up: red nose cone so it reads against the white panel
  const rx = x + 18, ry = y + h - 78;
  fillTriangle(rx + 12, ry - 52, rx, ry - 8, rx + 24, ry - 8, RED);
  line(rx + 12, ry - 52, rx, ry - 8, INK, 2);
  line(rx + 12, ry - 52, rx + 24, ry - 8, INK, 2);
  fillRect(rx, ry - 8, 24, 34, WHITE);
  frame(rx, ry - 8, 24, 34, INK, 2);
  fillRect(rx + 8, ry - 34, 8, 12, RED);
  // fins
  fillTriangle(rx, ry + 26, rx - 12, ry + 44, rx, ry + 10, RED);
  fillTriangle(rx + 24, ry + 26, rx + 36, ry + 44, rx + 24, ry + 10, RED);
  // window
  fillCircle(rx + 12, ry - 2, 5, SEA2);
  // flame
  starburst(rx + 12, ry + 48, 16, 8, 8, FLAME);
  starburst(rx + 12, ry + 48, 9, 4, 8, FLAME2);
}

// A supermarket front with a green "freed" check — the rescue.
function drawStore(x: number, y: number, w: number, h: number): void {
  const base = y + h - 14;
  // building
  fillRect(x + 8, y + 34, w - 16, base - (y + 34), WHITE);
  frame(x + 8, y + 34, w - 16, base - (y + 34), INK, 2);
  // striped awning
  for (let i = 0; i < 6; i++) {
    fillRect(x + 8 + i * Math.floor((w - 16) / 6), y + 34, Math.floor((w - 16) / 6), 16, i % 2 ? RED : WHITE);
  }
  fillRect(x + 8, y + 50, w - 16, 3, INK);
  // door + window
  fillRect(x + 16, base - 44, 26, 44, NAVY2);
  fillRect(x + 52, base - 34, 30, 24, SEA2);
  frame(x + 52, base - 34, 30, 24, INK, 2);
  // green check badge
  fillCircle(x + w - 26, y + 78, 20, GREEN);
  ring(x + w - 26, y + 78, 20, WHITE, 3);
  line(x + w - 36, y + 78, x + w - 29, y + 86, WHITE, 4);
  line(x + w - 29, y + 86, x + w - 14, y + 68, WHITE, 4);
}

// ---------------------------------------------------------------------------
// Page layout.
// ---------------------------------------------------------------------------
function drawMasthead(): void {
  fillRect(0, 0, W, 116, NAVY);
  drawTextCentred(W / 2, 18, 'THE WORLD TODAY', 7, WHITE);
  drawTextCentred(W / 2, 76, 'WEDNESDAY 25 NOVEMBER 2026', 3, [214, 196, 120]);
  fillRect(0, 116, W, 6, RED);
}

function drawLead(): void {
  const x = 24, y = 134, w = 976, h = 336;
  fillRect(x, y, w, h, PANEL);
  frame(x, y, w, h, RULE, 2);
  drawTanker(x + 16, y + 14, 288, h - 28);
  const tx = x + 330, tw = w - 330 - 26;
  drawText(tx, y + 20, 'MIDDLE EAST — WAR AT SEA', 3, RED);
  const head = wrap('IRAN SAYS TWO TANKERS HIT MINES IN HORMUZ', tw, 5);
  drawLines(tx, y + 52, head, 5, INK, 2);
  const subY = y + 52 + head.length * (7 * 5 + 2 * 5) + 14;
  const sub = wrap(
    'Tehran says two tankers caught fire after striking naval mines. The claims are unverified.',
    tw, 3,
  );
  drawLines(tx, subY, sub, 3, [60, 60, 60], 2);
  drawText(tx, subY + sub.length * (7 * 3 + 2 * 3) + 12, 'ALSO: COALITION STRIKES YEMEN PORT', 3, RED);
}

interface Story {
  kicker: string;
  kickerColor: RGB;
  headline: string;
  sub: string;
  art: (x: number, y: number, w: number, h: number) => void;
}

const STORIES: Story[] = [
  {
    kicker: 'EUROPE — WAR',
    kickerColor: RED,
    headline: 'PUTIN: RETALIATION IS INEVITABLE',
    sub: 'Kyiv keeps hitting Russian oil plants.',
    art: drawRefinery,
  },
  {
    kicker: 'MARKETS — AI BOOM',
    kickerColor: RED,
    headline: 'NVIDIA SINKS 7% AS AI FEVER BREAKS',
    sub: 'Nikkei falls 2.8%; S&P 500 slips.',
    art: drawChart,
  },
  {
    kicker: 'SPACE — CHINA',
    kickerColor: NAVY2,
    headline: 'PAKISTAN\u2019S FIRST ASTRONAUT IN ORBIT',
    sub: 'Zeeshan Ali, 40, docks at Tiangong.',
    art: drawRocket,
  },
  {
    kicker: 'AMERICAS — RESCUE',
    kickerColor: GREEN,
    headline: 'ALL CARTAGENA HOSTAGES FREED',
    sub: 'Troops storm a supermarket after a 20-hour siege.',
    art: drawStore,
  },
];

function drawGrid(): void {
  const cols = [24, 518];
  const rows = [482, 718];
  const cw = 482, ch = 224;
  STORIES.forEach((s, i) => {
    const x = cols[i % 2], y = rows[Math.floor(i / 2)];
    fillRect(x, y, cw, ch, PANEL);
    frame(x, y, cw, ch, RULE, 2);
    s.art(x + 14, y + 18, 118, ch - 36);
    const tx = x + 146, tw = cw - 146 - 16;
    drawText(tx, y + 16, s.kicker, 3, s.kickerColor);
    const head = wrap(s.headline, tw, 3);
    drawLines(tx, y + 46, head, 3, INK, 2);
    const sub = wrap(s.sub, tw, 3);
    drawLines(tx, y + 46 + head.length * (7 * 3 + 2 * 3) + 10, sub, 3, [60, 60, 60], 2);
  });
}

function drawFooter(): void {
  drawTextCentred(W / 2, 956, 'REPORTED 25 NOVEMBER 2026', 3, INK);
  drawTextCentred(W / 2, 988, 'SOURCES: REUTERS, AFP, BBC', 3, GREY);
}

// ---------------------------------------------------------------------------
function main(): void {
  fillRect(0, 0, W, H, PAPER);
  drawMasthead();
  drawLead();
  drawGrid();
  drawFooter();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), encodePNG());
}

main();
