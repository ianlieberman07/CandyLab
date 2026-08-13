/* Key the hero photograph's studio ground to true transparency.
 *
 * Why not just match the page colour to the photograph: the ground is not one
 * colour. Measured across the frame it drifts between #f8f9f7 and #fafbfc, and
 * it is not neutral — the green channel usually runs highest. Any single CSS
 * colour is therefore wrong somewhere, which is visible as a faint patch where
 * a large flat area meets the page.
 *
 * Why not a luminance threshold: the brain is bone-white and its highlights
 * reach 255, identical to the ground. A global threshold eats holes in it.
 *
 * So: a flood fill inward from the border. Ground is defined as "near-white,
 * near-neutral, AND connected to the edge of the frame". The brain's bright
 * highlights are enclosed by darker brain, so the fill never reaches them; the
 * gaps between the threads are reached, because they open onto the border.
 *
 * Edges are then softened by measuring how ground-like each surviving pixel is,
 * so the cut has an anti-aliased boundary rather than a jagged one.
 *
 *   node scripts/make-hero-cutout.mjs <source.png> [output.png]
 */
import sharp from 'sharp';
import { basename } from 'node:path';

const SRC = process.argv[2];
const OUT = process.argv[3] ?? 'content/pages/images/covers/home-brain-cut.png';
if (!SRC) {
  console.error('usage: node scripts/make-hero-cutout.mjs <source-image> [output]');
  process.exit(1);
}

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

// A pixel can be ground only if it is bright and close to neutral. The brain is
// warm (r > b) and the threads are strongly red, so both fail the neutral test
// even where they are bright.
// Neutrality does the discriminating, not brightness. Measured: the ground's
// channel spread is 2-3 levels anywhere in the frame, while the brain runs
// 20+ (it is lit warm) and the threads far more. Brightness alone fails
// because the ground darkens to ~233 at the bottom while the brain's
// highlights reach 255 — the two ranges overlap, the chroma ranges do not.
const MIN = 196; // darkest a ground pixel may be (covers the bottom shadow)
const MAX_CHROMA = 8; // widest channel spread a ground pixel may have
const idx = (x, y) => (y * W + x) * C;
const isGroundish = (x, y) => {
  const i = idx(x, y);
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const lo = Math.min(r, g, b), hi = Math.max(r, g, b);
  return lo >= MIN && hi - lo <= MAX_CHROMA;
};

// Flood fill from every border pixel that qualifies.
const isGround = new Uint8Array(W * H);
const queue = new Int32Array(W * H);
let head = 0, tail = 0;
const push = (x, y) => {
  const p = y * W + x;
  if (isGround[p] || !isGroundish(x, y)) return;
  isGround[p] = 1;
  queue[tail++] = p;
};
for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
while (head < tail) {
  const p = queue[head++];
  const x = p % W, y = (p / W) | 0;
  if (x > 0) push(x - 1, y);
  if (x < W - 1) push(x + 1, y);
  if (y > 0) push(x, y - 1);
  if (y < H - 1) push(x, y + 1);
}

/* Alpha. Fully-filled ground is transparent. Everything else is opaque, except
   pixels that are themselves ground-like and touch the fill — those are the
   anti-aliased rim of the subject, and they get partial alpha scaled by how far
   from the ground they are. Without this the cut has hard, stepped edges. */
const alpha = Buffer.alloc(W * H, 255);
const SOFT_FLOOR = 214; // below this, treat as fully subject
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (isGround[p]) { alpha[p] = 0; continue; }
    let touchesGround = false;
    if (x > 0 && isGround[p - 1]) touchesGround = true;
    else if (x < W - 1 && isGround[p + 1]) touchesGround = true;
    else if (y > 0 && isGround[p - W]) touchesGround = true;
    else if (y < H - 1 && isGround[p + W]) touchesGround = true;
    if (!touchesGround) continue;
    const i = idx(x, y);
    const lum = Math.min(data[i], data[i + 1], data[i + 2]);
    if (lum <= SOFT_FLOOR) continue;
    alpha[p] = Math.round(255 * (1 - (lum - SOFT_FLOOR) / (255 - SOFT_FLOOR)));
  }
}

// One-pixel blur on the mask only: smooths the rim without touching colour.
const softened = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } })
  .blur(0.6)
  .raw()
  .toBuffer();

// NO removeAlpha() here. On an already-3-channel image it is a no-op that
// nonetheless makes joinChannel drop the mask silently — no error, just a
// 3-channel PNG with no transparency. (Reintroduced this once already.)
await sharp(SRC)
  .joinChannel(softened, { raw: { width: W, height: H, channels: 1 } })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

const kept = alpha.reduce((n, a) => n + (a > 0 ? 1 : 0), 0);
const m = await sharp(OUT).metadata();
console.log(`${basename(SRC)} -> ${OUT}`);
console.log(`  ${m.width}x${m.height}  alpha=${m.hasAlpha}  subject=${((kept / (W * H)) * 100).toFixed(1)}% of frame`);
