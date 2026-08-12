/* Second pass: built for the pale ground the site actually uses, and pushed
   for contrast. The first pass was dark navy on a light site — heavy, and too
   dim to read. */
import sharp from '/Users/ianlieberman/Documents/GitHub/CandyLab/node_modules/sharp/lib/index.js';
import { writeFileSync } from 'node:fs';

const PAPER = '#eef1f5', INK = '#0e1c2b', SIGNAL = '#00778c', BRIGHT = '#00c2d9';
const W = 1600, H = 900;

/* Contour field on paper. Ink lines at real weight, one signal band picked out
   every sixth ring so it reads as a measured surface rather than a doodle. */
function contoursLight() {
  const cx = W * 0.5, cy = H * 0.55;
  let out = '';
  for (let ring = 40; ring >= 0; ring--) {
    const base = 30 + ring * 21;
    const pts = [];
    for (let a = 0; a <= 360; a += 4) {
      const rad = (a * Math.PI) / 180;
      const wob =
        Math.sin(rad * 3 + ring * 0.32) * 26 +
        Math.sin(rad * 5 - ring * 0.21) * 15 +
        Math.sin(rad * 2 + ring * 0.63) * 20 +
        Math.sin(rad * 7 + ring * 0.11) * 7;
      const rr = base + wob;
      pts.push(`${(cx + Math.cos(rad) * rr * 1.55).toFixed(1)},${(cy + Math.sin(rad) * rr * 0.8).toFixed(1)}`);
    }
    const key = ring % 6 === 0;
    const fade = 1 - ring / 46;
    out += `<polyline points="${pts.join(' ')}" fill="none" stroke="${key ? SIGNAL : INK}" stroke-opacity="${((key ? 0.5 : 0.24) * (0.35 + fade)).toFixed(3)}" stroke-width="${key ? 1.6 : 0.85}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>${out}</svg>`;
}

/* Two fields meeting. The lab's actual subject — a social world and a body,
   in relation — drawn as two overlapping gradient fields rather than
   illustrated with clip-art. */
function fields() {
  let rings = '';
  const sources = [{ x: W * 0.36, y: H * 0.47, n: 30 }, { x: W * 0.64, y: H * 0.55, n: 30 }];
  for (const s of sources) {
    for (let k = 1; k <= s.n; k++) {
      const r = k * 26;
      const o = Math.max(0, 0.42 - k / 52);
      rings += `<circle cx="${s.x}" cy="${s.y}" r="${r}" fill="none" stroke="${k % 4 === 0 ? SIGNAL : INK}" stroke-opacity="${o.toFixed(3)}" stroke-width="${k % 4 === 0 ? 1.4 : 0.8}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="l" cx="36%" cy="47%" r="46%">
      <stop offset="0%" stop-color="${BRIGHT}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${BRIGHT}" stop-opacity="0"/></radialGradient>
    <radialGradient id="r" cx="64%" cy="55%" r="46%">
      <stop offset="0%" stop-color="${INK}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${INK}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <rect width="${W}" height="${H}" fill="url(#l)"/>
  <rect width="${W}" height="${H}" fill="url(#r)"/>
  ${rings}</svg>`;
}

/* A trace field — many overlaid signal traces, the way a dense-sampling study
   actually looks. Closest of the three to "data made beautiful". */
function traces() {
  let out = '';
  for (let s = 0; s < 26; s++) {
    const y0 = 90 + s * 29;
    const amp = 12 + (s % 7) * 6;
    const pts = [];
    for (let x = 0; x <= W; x += 8) {
      const t = x / W;
      const y = y0
        + Math.sin(t * Math.PI * 6 + s * 0.7) * amp
        + Math.sin(t * Math.PI * 15 - s * 0.4) * (amp * 0.35)
        + Math.sin(t * Math.PI * 2.2 + s) * (amp * 0.8);
      pts.push(`${x},${y.toFixed(1)}`);
    }
    const key = s % 5 === 0;
    out += `<polyline points="${pts.join(' ')}" fill="none" stroke="${key ? SIGNAL : INK}" stroke-opacity="${key ? 0.55 : 0.2}" stroke-width="${key ? 1.5 : 0.85}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>${out}</svg>`;
}

const set = { 'd-contours-light': contoursLight(), 'e-fields': fields(), 'f-traces': traces() };
const tiles = [];
let i = 0;
for (const [name, svg] of Object.entries(set)) {
  writeFileSync(`art-${name}.svg`, svg);
  tiles.push({ input: await sharp(Buffer.from(svg)).resize(760, 428).png().toBuffer(), left: 0, top: i * 428 });
  i++;
}
await sharp({ create: { width: 760, height: 428 * tiles.length, channels: 3, background: '#fff' } })
  .composite(tiles).jpeg({ quality: 88 }).toFile('art-sheet2.jpg');
console.log('wrote', Object.keys(set).join(', '));
