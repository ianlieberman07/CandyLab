/* Variant A/B asset: the photograph extended into a full-width banner.
 *
 * The picture's ground is NOT flat — it runs #8ba19e (left) to #507474
 * (right). So a flat CSS band can never match it; every attempt so far has
 * seamed. Instead the band is built INTO the file: a wide canvas painted with
 * the image's own horizontal gradient (sampled from the image, not guessed),
 * with the original composited in the centre behind a left/right feather.
 * What ships is one JPEG that is already seamless — no CSS colour-matching to
 * drift out of sync.
 *
 * Canvas is 2880px so that at a 1440-CSS-px viewport on a 2x display the
 * brain renders at its native 960px — sharp, not upscaled.
 */
import sharp from '/Users/ianlieberman/Documents/GitHub/CandyLab/node_modules/sharp/lib/index.js';

const SRC = '/Users/ianlieberman/Documents/GitHub/CandyLab/content/pages/images/covers/home-brain.jpg';
const OUT = '/Users/ianlieberman/Documents/GitHub/CandyLab/content/pages/images/covers/home-brain-band.jpg';
const CW = 2880, CH = 1200, IW = 960, IH = 1200;

const img = sharp(SRC);

// Sample the top row of the image to reconstruct its gradient as SVG stops.
const stops = [];
for (const fx of [0.02, 0.2, 0.4, 0.6, 0.8, 0.98]) {
  const left = Math.max(0, Math.round(IW * fx) - 6);
  const buf = await sharp(SRC).extract({ left, top: 8, width: 12, height: 24 }).toBuffer();
  const s = await sharp(buf).stats();
  const hex = '#' + s.channels.slice(0, 3).map((c) => Math.round(c.mean).toString(16).padStart(2, '0')).join('');
  stops.push({ off: fx, hex });
}
console.log('gradient stops:', stops.map((s) => s.hex).join(' '));

// The canvas gradient: the image occupies the centre third, so its own left
// tone continues left and its right tone continues right, with the sampled
// ramp across the middle where the image sits.
const inL = (CW - IW) / 2 / CW, inR = (CW + IW) / 2 / CW;
const svgStops = [
  `<stop offset="0" stop-color="${stops[0].hex}"/>`,
  ...stops.map((s) => `<stop offset="${(inL + (inR - inL) * s.off).toFixed(4)}" stop-color="${s.hex}"/>`),
  `<stop offset="1" stop-color="${stops[stops.length - 1].hex}"/>`,
].join('');
const canvas = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">${svgStops}</linearGradient></defs>
    <rect width="${CW}" height="${CH}" fill="url(#g)"/>
  </svg>`
);

// Left/right feather, built as raw pixels — one row of alpha, repeated.
const FEATHER = 140;
const row = Buffer.alloc(IW);
for (let x = 0; x < IW; x++) {
  const edge = Math.min(x, IW - 1 - x);
  row[x] = edge >= FEATHER ? 255 : Math.round(255 * (edge / FEATHER));
}
const mask = Buffer.alloc(IW * IH);
for (let y = 0; y < IH; y++) row.copy(mask, y * IW);

// RGB + one joined channel = RGBA. (Joining onto an ensureAlpha'd image makes
// a 5-channel buffer that nothing downstream interprets correctly.)
const fadedPng = await sharp(SRC)
  .joinChannel(mask, { raw: { width: IW, height: IH, channels: 1 } })
  .png()
  .toBuffer();

await sharp(canvas)
  .composite([{ input: fadedPng, left: (CW - IW) / 2, top: 0 }])
  .flatten()
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile(OUT);
const m = await sharp(OUT).metadata();
console.log('banner written', m.width + 'x' + m.height);
