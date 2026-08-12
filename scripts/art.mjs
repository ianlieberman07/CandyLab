/* Three generative cover concepts, authored as SVG in the site's palette.
   Deterministic: a seeded PRNG, so the same file is produced every run and the
   art is reviewable in git rather than being a new picture each build. */
import sharp from '/Users/ianlieberman/Documents/GitHub/CandyLab/node_modules/sharp/lib/index.js';
import { writeFileSync } from 'node:fs';

const NAVY = '#0e1c2b', DEEP = '#071119', SIGNAL = '#00c2d9', TEAL = '#00778c';
const W = 1600, H = 900;

// mulberry32 — tiny seeded PRNG.
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* A — Connectome. Nodes weighted toward two loose clusters that face each
   other, so it reads as two systems in relation rather than a random mesh. */
function connectome() {
  const r = rng(7);
  const nodes = [];
  for (let i = 0; i < 130; i++) {
    const side = i % 2;
    const cx = side ? W * 0.66 : W * 0.34;
    const g = () => (r() + r() + r() - 1.5) / 1.5;
    nodes.push({ x: cx + g() * W * 0.2, y: H / 2 + g() * H * 0.36, r: 1 + r() * 2.6, side });
  }
  let edges = '';
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const near = a.side === b.side ? 140 : 260; // cross-cluster links reach further
      if (d < near) {
        const o = (1 - d / near) * (a.side === b.side ? 0.3 : 0.5);
        edges += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${SIGNAL}" stroke-opacity="${o.toFixed(3)}" stroke-width="${(0.5 + o).toFixed(2)}"/>`;
      }
    }
  }
  const dots = nodes.map((n) =>
    `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.r.toFixed(2)}" fill="${n.r > 2.4 ? SIGNAL : '#7fd8e6'}" fill-opacity="${(0.5 + n.r / 8).toFixed(2)}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs><radialGradient id="g" cx="50%" cy="45%" r="72%">
    <stop offset="0%" stop-color="${NAVY}"/><stop offset="100%" stop-color="${DEEP}"/>
  </radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <g>${edges}</g><g>${dots}</g></svg>`;
}

/* B — Contour field. Nested closed curves, like a height map of a cortical
   surface. Reads as data rather than decoration. */
function contours() {
  const r = rng(21);
  const cx = W * 0.5, cy = H * 0.52;
  let out = '';
  for (let ring = 0; ring < 34; ring++) {
    const base = 40 + ring * 22;
    const pts = [];
    for (let a = 0; a <= 360; a += 6) {
      const rad = (a * Math.PI) / 180;
      const wob = Math.sin(rad * 3 + ring * 0.4) * 22 + Math.sin(rad * 5 - ring * 0.25) * 13
        + Math.sin(rad * 2 + ring * 0.7) * 18;
      const rr = base + wob;
      pts.push(`${(cx + Math.cos(rad) * rr * 1.5).toFixed(1)},${(cy + Math.sin(rad) * rr * 0.82).toFixed(1)}`);
    }
    const o = 0.1 + (1 - ring / 34) * 0.42;
    out += `<polyline points="${pts.join(' ')}" fill="none" stroke="${ring % 6 === 0 ? SIGNAL : TEAL}" stroke-opacity="${o.toFixed(3)}" stroke-width="${ring % 6 === 0 ? 1.5 : 0.9}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${DEEP}"/>
  <rect width="${W}" height="${H}" fill="${NAVY}" opacity="0.65"/>
  ${out}</svg>`;
}

/* C — Interference. Two ripple sources meeting: the lab's actual subject,
   drawn as physics rather than illustrated. */
function interference() {
  const sources = [{ x: W * 0.33, y: H * 0.5 }, { x: W * 0.67, y: H * 0.5 }];
  let out = '';
  for (const s of sources) {
    for (let k = 1; k < 46; k++) {
      const rad = k * 17;
      const o = Math.max(0, 0.5 - k / 70);
      out += `<circle cx="${s.x}" cy="${s.y}" r="${rad}" fill="none" stroke="${k % 5 === 0 ? SIGNAL : TEAL}" stroke-opacity="${o.toFixed(3)}" stroke-width="${k % 5 === 0 ? 1.3 : 0.7}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${NAVY}"/><stop offset="100%" stop-color="${DEEP}"/>
  </linearGradient>
  <clipPath id="c"><rect width="${W}" height="${H}"/></clipPath></defs>
  <rect width="${W}" height="${H}" fill="url(#v)"/>
  <g clip-path="url(#c)">${out}</g></svg>`;
}

const set = { 'a-connectome': connectome(), 'b-contours': contours(), 'c-interference': interference() };
const tiles = [];
let i = 0;
for (const [name, svg] of Object.entries(set)) {
  writeFileSync(`art-${name}.svg`, svg);
  const buf = await sharp(Buffer.from(svg)).resize(760, 428).png().toBuffer();
  tiles.push({ input: buf, left: 0, top: i * 428 });
  i++;
}
await sharp({ create: { width: 760, height: 428 * tiles.length, channels: 3, background: '#000' } })
  .composite(tiles).jpeg({ quality: 88 }).toFile('art-sheet.jpg');
console.log('wrote', Object.keys(set).join(', '));
