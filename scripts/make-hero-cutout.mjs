/* Prepare the white-ground hero photograph so it has no visible boundary.
 *
 * Measured on the source (1920x2400): the ground is uniform #f9fafb across the
 * top and middle, and falls to ~#eceae9 along the bottom where the shadow sits.
 * The brain's own highlights reach 255, so a global white-point lift would
 * clip real detail out of the subject — the fix has to be geometric, not tonal.
 *
 * So: the flat ground is left exactly as it is and the PAGE is set to match it
 * (--color-hero-ground below), which is an exact match by construction rather
 * than an approximation. Every edge is then feathered to transparency, with a
 * long fade along the bottom that swallows the darker shadow region entirely
 * and leaves the threads dissolving into the page instead of stopping at a
 * rectangle.
 *
 * Output is PNG-with-alpha so it composites onto whatever colour the page is,
 * including if the client later changes it.
 *
 *   node scripts/make-hero-cutout.mjs <source.png>
 */
import sharp from 'sharp';
import { basename } from 'node:path';

const SRC = process.argv[2];
if (!SRC) {
  console.error('usage: node scripts/make-hero-cutout.mjs <source-image>');
  process.exit(1);
}
const OUT = 'content/pages/images/covers/home-brain-cut.png';

const { width: W, height: H } = await sharp(SRC).metadata();

// Feather geometry, as fractions of each dimension. The bottom fade is long
// because that is where the shadow gradient lives and where the threads want
// to trail off; the others only need to kill a hard edge.
const FADE = { top: 0.04, side: 0.05, bottom: 0.3 };
const t = Math.round(H * FADE.top);
const s = Math.round(W * FADE.side);
const b = Math.round(H * FADE.bottom);

// Alpha is the product of four independent edge ramps, so corners fall off
// smoothly rather than in a hard L.
const ramp = (d, len) => (len <= 0 ? 1 : Math.min(1, Math.max(0, d / len)));
const smooth = (v) => v * v * (3 - 2 * v); // smoothstep: no visible banding

const mask = Buffer.alloc(W * H);
for (let y = 0; y < H; y++) {
  const fTop = smooth(ramp(y, t));
  const fBottom = smooth(ramp(H - 1 - y, b));
  for (let x = 0; x < W; x++) {
    const fLeft = smooth(ramp(x, s));
    const fRight = smooth(ramp(W - 1 - x, s));
    mask[y * W + x] = Math.round(255 * fTop * fBottom * fLeft * fRight);
  }
}

// No removeAlpha() first: on an already-3-channel image it is a no-op that
// nonetheless makes joinChannel drop the mask silently, leaving a 3-channel
// PNG with no alpha and no error.
await sharp(SRC)
  .joinChannel(mask, { raw: { width: W, height: H, channels: 1 } })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

const m = await sharp(OUT).metadata();
console.log(`${basename(SRC)} -> ${OUT}`);
console.log(`  ${m.width}x${m.height}, alpha=${m.hasAlpha}, exif=${m.exif ? 'PRESENT' : 'stripped'}`);
