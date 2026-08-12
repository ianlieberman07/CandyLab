/**
 * Post-build audit of dist/. Fails the build on the things that are invisible
 * in review and expensive after launch.
 *
 * Every check here exists because it caught something real on this site:
 *
 *  1. IMAGES WITH NO alt ATTRIBUTE. A block comment placed between an Astro
 *     component's attributes is parsed as *attributes* — every word of it
 *     ships as a junk boolean attribute (`caption="true"`, `the="true"`) and
 *     the real attribute after it is swallowed. That silently stripped `alt`
 *     from 60 images here and the build stayed green.
 *
 *     Note `alt` and `alt=""` are the SAME thing to a browser and to a screen
 *     reader — both mean "decorative, skip me" — so a bare `alt` is correct,
 *     not a defect. Only a missing attribute is a bug.
 *
 *  2. JUNK ATTRIBUTES, the other half of the same accident. Caught directly so
 *     the cause is named rather than inferred from a missing alt.
 *
 *  3. INTERNAL LINKS that do not resolve to a built page.
 *
 *  4. noindex / robots.txt / sitemap DISAGREEING. It is easy to noindex a
 *     page, disallow it, and then advertise it in the sitemap anyway.
 *
 * Run by `npm run build` via the postbuild hook.
 */
import { readFileSync, existsSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const problems = [];
const note = (msg) => problems.push(msg);

const pages = globSync(`${DIST}/**/*.html`);
if (pages.length === 0) {
  console.error(`\n✗ ${DIST} contains no HTML. Did the build run?\n`);
  process.exit(1);
}

// Attributes a real <img> can carry. Anything outside this set with a value of
// "true" is a word from a comment that leaked into the tag.
const KNOWN_IMG_ATTRS = new Set([
  'src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding',
  'fetchpriority', 'class', 'style', 'id', 'title', 'role', 'usemap', 'ismap',
  'crossorigin', 'referrerpolicy', 'data-parallax',
]);

let withAlt = 0;
let decorative = 0;
const missingAlt = [];
const junk = [];

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const rel = page.slice(DIST.length + 1);

  for (const tag of html.match(/<img\b[^>]*>/g) ?? []) {
    // Matches both `alt="…"` and a bare `alt`.
    const hasAlt = /\salt(?=[\s=>/])/.test(tag);
    const isEmpty = /\salt(?:=""|(?=[\s>/]))/.test(tag);
    if (!hasAlt) missingAlt.push(`${rel}: ${tag.slice(0, 120)}…`);
    else if (isEmpty) decorative++;
    else withAlt++;

    for (const [, name] of tag.matchAll(/\s([a-zA-Z_:][-a-zA-Z0-9_:.]*)="true"/g)) {
      if (!KNOWN_IMG_ATTRS.has(name.toLowerCase())) {
        junk.push(`${rel}: <img … ${name}="true">`);
      }
    }
  }
}

if (missingAlt.length) {
  note(
    `${missingAlt.length} <img> with NO alt attribute (a bare \`alt\` is fine — these have neither):\n` +
      missingAlt.slice(0, 5).map((m) => `      ${m}`).join('\n')
  );
}
if (junk.length) {
  note(
    `${junk.length} junk attribute(s) on <img> — almost always a /* comment */ placed\n` +
      `    between a component's attributes, which also swallows the attribute after it:\n` +
      junk.slice(0, 5).map((m) => `      ${m}`).join('\n')
  );
}

// ── Internal links ─────────────────────────────────────────────────────────
const resolves = (href) => {
  const path = href.split('#')[0].split('?')[0];
  if (path === '' || path === '/') return existsSync(join(DIST, 'index.html'));
  const clean = path.replace(/^\/+|\/+$/g, '');
  return (
    existsSync(join(DIST, clean, 'index.html')) ||
    existsSync(join(DIST, clean)) ||
    existsSync(join(DIST, `${clean}.html`))
  );
};

const broken = new Set();
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const [, href] of html.matchAll(/href="(\/[^"]*)"/g)) {
    if (href.startsWith('//') || href.startsWith('/_astro') || href.startsWith('/@')) continue;
    if (!resolves(href)) broken.add(`${page.slice(DIST.length + 1)} → ${href}`);
  }
}
if (broken.size) {
  note(
    `${broken.size} internal link(s) point at a page that was not built:\n` +
      [...broken].slice(0, 8).map((b) => `      ${b}`).join('\n')
  );
}

// ── noindex / robots / sitemap must agree ──────────────────────────────────
const home = readFileSync(join(DIST, 'index.html'), 'utf8');
const isPreview = home.includes('noindex');
const robots = existsSync(join(DIST, 'robots.txt'))
  ? readFileSync(join(DIST, 'robots.txt'), 'utf8')
  : '';
const robotsBlocksAll = /^\s*Disallow:\s*\/\s*$/m.test(robots);

if (isPreview !== robotsBlocksAll) {
  note(
    `The pages and robots.txt disagree about whether this is a preview.\n` +
      `      pages say noindex: ${isPreview}; robots.txt blocks everything: ${robotsBlocksAll}`
  );
}
const sitemap = globSync(`${DIST}/sitemap*.xml`)
  .map((f) => readFileSync(f, 'utf8'))
  .join('');
if (sitemap.includes('/admin')) note('The sitemap advertises /admin, which is noindexed.');

/* ── Every page must be reachable from the top bar ──────────────────────────
   A page that exists but is in no menu is a page nobody finds. This happened
   here: Meet Our Pets was built, linked from the footer, and unreachable from
   the navigation — which is exactly how it reads to someone using the site.

   Detail pages (one person, one study, one news item) are excluded: they are
   reached from their index, which is itself in the bar. */
const navMatch = home.match(/<nav aria-label="Primary"[\s\S]*?<\/nav>/);
if (!navMatch) {
  note('The home page has no <nav aria-label="Primary"> — the menu did not render.');
} else {
  const inBar = new Set([...navMatch[0].matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]));
  const isDetail = (url) => /^\/(people|research|news)\/[^/]+$/.test(url) && url !== '/people/alumni';

  const unreachable = pages
    .map((p) => {
      const dir = p.slice(DIST.length + 1).replace(/(^|\/)index\.html$/, '');
      return dir === '' ? '/' : `/${dir}`;
    })
    // 404 is served by the host on a miss and has no business in a menu; the
    // admin is noindexed and deliberately unlinked.
    .filter((url) => url !== '/admin' && !/^\/404(\.html)?$/.test(url) && !isDetail(url))
    .filter((url) => !inBar.has(url));

  if (unreachable.length) {
    note(
      `${unreachable.length} page(s) exist but are in no top-bar menu:\n` +
        unreachable.map((u) => `      ${u}`).join('\n') +
        `\n\n    Give the page a "Which section does this page belong under?" value in the\n` +
        `    admin so it nests in a dropdown, or leave "Show in the menu" ticked.`
    );
  }
}

/* ── Photos with neither a caption nor a description ────────────────────────
   `alt=""` is correct for a photo whose caption already carries its meaning.
   It is NOT correct for a photo with no caption at all — there, the image is
   simply silent for anyone who cannot see it.

   A warning rather than a failure on purpose: these are content gaps only the
   lab can fill, and a build that refuses to run until sixteen pet photos have
   been described is a build the client cannot ship. It is loud, it is counted,
   and it is listed in DOCS/QUESTIONS.md. */
for (const set of ['gallery', 'pets']) {
  const path = `content/${set}.json`;
  if (!existsSync(path)) continue;
  const items = JSON.parse(readFileSync(path, 'utf8')).items ?? [];
  const silent = items.filter((i) => !i.caption?.trim() && !i.alt?.trim());
  if (silent.length) {
    console.warn(
      `\n⚠ ${path}: ${silent.length} of ${items.length} photos have neither a caption\n` +
        `  nor a description, so they are silent for screen-reader users.\n` +
        `  Add a description to each in the admin under "${set === 'pets' ? 'Pet photos' : 'Lab Gallery photos'}".\n`
    );
  }
}

// ── Result ─────────────────────────────────────────────────────────────────
if (problems.length) {
  console.error(`\n✗ dist/ audit failed:\n`);
  for (const p of problems) console.error(`  • ${p}\n`);
  process.exit(1);
}

console.log(
  `✓ dist/ — ${pages.length} pages, ${withAlt} images with alt text, ` +
    `${decorative} marked decorative, 0 missing`
);
console.log(`✓ internal links resolve, robots/noindex/sitemap agree`);
