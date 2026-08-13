/* Import the generated study images into the research collection.
 *
 * Matches each download to its study by a distinctive phrase from the prompt
 * (the filename carries it), rather than by download order — order is not
 * stable and a silent mis-assignment would put the wrong picture on the wrong
 * study, which is worse than failing.
 *
 * Each image is re-encoded, which strips whatever metadata the generator
 * attached, and written next to the research content it belongs to.
 *
 *   node scripts/import-study-images.mjs ~/Downloads
 */
import sharp from 'sharp';
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const SRC_DIR = (process.argv[2] ?? join(homedir(), 'Downloads')).replace('~', homedir());
const OUT_DIR = 'content/research/images';

// slug -> [phrase that identifies the file, alt text]
const STUDIES = {
  tiger: [
    'blood_collection_tube',
    'A laboratory tube of dark red blood standing upright in a rack of empty clear tubes.',
  ],
  'tiger-ears': [
    'smartphone_lying_face_up',
    'A smartphone lying face up, its glowing screen dissolving upward into fine points of light.',
  ],
  bridge: [
    'tightly_packed_translucent_hexagonal',
    'A wall of translucent hexagonal cells with a single red droplet resting in one of them.',
  ],
  boba: [
    'empty_circle_of_simple_pale_chairs',
    'An empty circle of pale chairs facing inward, seen from directly above.',
  ],
  spt: [
    'overlapping_translucent_human_profile',
    'Many overlapping translucent human profiles in teal, layered like panes of glass.',
  ],
  waves: [
    'concentric_waves_rippling',
    'Repeating concentric ripples drawn in fine white sand, seen from above.',
  ],
  mica: [
    'two_bone-white_sculptural_forms',
    'Two bone-white sculptural forms of the same shape at different sizes, the smaller beside the larger.',
  ],
  enigma: [
    'dozens_of_small_identical_bone-white',
    'Dozens of identical small bone-white brain forms in an even grid, one of them lit in teal.',
  ],
};

const files = readdirSync(SRC_DIR).filter((f) => /\.(png|jpe?g)$/i.test(f));
let placed = 0;

for (const [slug, [phrase, alt]] of Object.entries(STUDIES)) {
  const match = files.find((f) => f.includes(phrase));
  if (!match) {
    console.error(`  MISS  ${slug}: no download containing "${phrase}"`);
    continue;
  }
  const out = `${OUT_DIR}/${slug}-cover.jpg`;
  const meta = await sharp(join(SRC_DIR, match)).metadata();
  await sharp(join(SRC_DIR, match))
    .rotate()
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(out);
  const after = await sharp(out).metadata();

  // Point the study's frontmatter at it. hero/heroAlt are replaced if present,
  // inserted after `order:` if not, so hand edits elsewhere are preserved.
  const path = `content/research/${slug}.md`;
  if (!existsSync(path)) {
    console.error(`  MISS  ${slug}: ${path} does not exist`);
    continue;
  }
  let md = readFileSync(path, 'utf8');
  const heroLine = `hero: ./images/${slug}-cover.jpg`;
  const altLine = `heroAlt: '${alt.replace(/'/g, "''")}'`;
  md = /^hero:/m.test(md)
    ? md.replace(/^hero:.*$/m, heroLine)
    : md.replace(/^(order:.*)$/m, `$1\n${heroLine}`);
  md = /^heroAlt:/m.test(md)
    ? md.replace(/^heroAlt:.*$/m, altLine)
    : md.replace(new RegExp(`^${heroLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'), `${heroLine}\n${altLine}`);
  writeFileSync(path, md);

  console.log(
    `  ok    ${slug.padEnd(12)} ${meta.width}x${meta.height} -> ${after.width}x${after.height}  exif=${after.exif ? 'PRESENT' : 'stripped'}`
  );
  placed++;
}

console.log(`\n${placed}/${Object.keys(STUDIES).length} study images placed`);
