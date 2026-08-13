/* Variant C asset: the brain keyed off its background entirely.
 *
 * A single-colour chroma key cannot work here — the ground is a gradient with
 * a deep shadow. But every ground pixel shares one property the subject never
 * has: green exceeds red (sage #768d8a: g-r=23; deep shadow #335750: g-r=36).
 * The subject is the opposite: warm white brain (r>=g) and red threads
 * (r>>g). So alpha is keyed on warmth (r-g), with a brightness bonus so the
 * cool-white highlights survive.
 *
 * The honest risk: shaded creases inside the brain pick up green ambient
 * light and may key out as holes. The result gets inspected, not assumed.
 */
import sharp from '/Users/ianlieberman/Documents/GitHub/CandyLab/node_modules/sharp/lib/index.js';

const SRC = '/Users/ianlieberman/Documents/GitHub/CandyLab/content/pages/images/covers/home-brain.jpg';
const OUT = '/Users/ianlieberman/Documents/GitHub/CandyLab/content/pages/images/covers/home-brain-cutout.png';

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

const rgba = Buffer.alloc(W * H * 4);
let holes = 0;
for (let i = 0; i < W * H; i++) {
  const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Warmth: negative on the sage ground, ~0..+ on the brain, strongly + on
  // the threads. Brightness bonus keeps near-neutral bright whites.
  const score = (r - g) + Math.max(0, lum - 150) / 105 * 26;
  const a01 = Math.min(1, Math.max(0, (score + 10) / 16));
  rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b;
  rgba[i * 4 + 3] = Math.round(a01 * 255);
  // Count semi-transparent pixels inside the brain's bounding region to gauge
  // hole damage (brain occupies roughly x 25-78%, y 8-45%).
  const x = i % W, y = (i / W) | 0;
  if (a01 < 0.6 && lum > 120 && x > W * 0.28 && x < W * 0.75 && y > H * 0.1 && y < H * 0.42) holes++;
}
console.log('possible holes inside brain region:', holes, 'px');

await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png().toFile(OUT);
// A judgement copy over the site's paper colour.
await sharp({ create: { width: W, height: H, channels: 3, background: '#eef1f5' } })
  .composite([{ input: OUT }])
  .jpeg({ quality: 88 })
  .toFile('/private/tmp/claude-501/-Users-ianlieberman-Documents-GitHub-EisenbergerLab/fa02a997-a711-4d36-946a-b7fdd28cecc2/scratchpad/cutout-on-paper.jpg');
console.log('cutout written');
