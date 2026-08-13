/* Lift the studio floor shadow out of the hero photograph.
 *
 * The cast shadow beneath the subject reads as odd on a page that has no floor
 * and no other light source — the brain appears to hover over a surface that
 * is not there.
 *
 * It can be removed safely because it is separable by colour, not by position.
 * Measured down the lower half of the frame: the shadow is neutral, its channel
 * spread never exceeding ~10, and it darkens to about 225. The threads running
 * through the same region carry a channel spread above 200. So "neutral and
 * darker than the ground" isolates the shadow and leaves the threads alone.
 *
 * Only the region below the subject is touched, so the brain — which is also
 * fairly neutral where it is lit — is never in scope.
 *
 *   node scripts/remove-hero-shadow.mjs <source> <output>
 */
import sharp from 'sharp';

const SRC = process.argv[2];
const OUT = process.argv[3];
if (!SRC || !OUT) {
  console.error('usage: node scripts/remove-hero-shadow.mjs <source> <output>');
  process.exit(1);
}

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

// Ground reference, sampled from the top corners where nothing else is.
let gr = 0, gg = 0, gb = 0, n = 0;
for (let y = 4; y < 40; y++) {
  for (const x of [4, 20, W - 24, W - 8]) {
    const i = (y * W + x) * C;
    gr += data[i]; gg += data[i + 1]; gb += data[i + 2]; n++;
  }
}
gr = Math.round(gr / n); gg = Math.round(gg / n); gb = Math.round(gb / n);

const START = Math.round(H * 0.52); // below the subject only
const CHROMA_FULL = 12;  // at or under: certainly shadow or ground
const CHROMA_NONE = 30;  // at or over: certainly a thread, leave alone

const out = Buffer.from(data);
let lifted = 0;
for (let y = START; y < H; y++) {
  // Ease in over the first 8% so the correction has no visible starting edge.
  const ramp = Math.min(1, (y - START) / (H * 0.08));
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lo = Math.min(r, g, b), hi = Math.max(r, g, b);
    const chroma = hi - lo;
    if (chroma >= CHROMA_NONE) continue;
    // Taper across the anti-aliased rim of a thread rather than cutting.
    const neutrality =
      chroma <= CHROMA_FULL ? 1 : 1 - (chroma - CHROMA_FULL) / (CHROMA_NONE - CHROMA_FULL);
    const strength = neutrality * ramp;
    if (strength <= 0) continue;
    if (lo >= Math.min(gr, gg, gb) - 1) continue; // already ground, nothing to lift
    out[i] = Math.round(r + (gr - r) * strength);
    out[i + 1] = Math.round(g + (gg - g) * strength);
    out[i + 2] = Math.round(b + (gb - b) * strength);
    lifted++;
  }
}

await sharp(out, { raw: { width: W, height: H, channels: C } })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(`ground #${[gr, gg, gb].map((v) => v.toString(16).padStart(2, '0')).join('')}`);
console.log(`lifted ${((lifted / (W * H)) * 100).toFixed(1)}% of the frame -> ${OUT}`);
