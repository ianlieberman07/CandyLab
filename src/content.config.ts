import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';

/**
 * Content lives as markdown + frontmatter in /content/, deliberately outside
 * /src/. Two reasons:
 *   1. Content and presentation stay separate — no copy hardcoded in components.
 *   2. It is exactly the shape a git-backed CMS (Sveltia) expects, so the admin
 *      UI can be layered on without moving a single file.
 *
 * Every `draft: true` or `needsReview: true` entry is surfaced in the build
 * output rather than silently shipped — see DOCS/QUESTIONS.md.
 */

const people = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/people' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      // Post-nominal shown after the name — "Ph.D.", "B.A.". Kept out of `name`
      // so the name stays a name: it is what alt text, initials and sorting all
      // read.
      credential: z.string().optional(),
      role: z.string(),
      // The heading a current member appears under on the People page. The lab
      // has eight of these and the distinctions matter to them, so the grouping
      // is content rather than something inferred from `role`.
      group: z.string().optional(),
      // Alumni only: what they did here, and when.
      labRole: z.string().optional(),
      years: z.string().optional(),
      // Someone the client has not asked to show. Their entry stays in the repo
      // — the person is not deleted — but the roster skips them, so putting
      // them back is one checkbox rather than a re-transcription.
      listed: z.boolean().default(true),
      // `current` vs `alumni` drives which page the person appears on, so a
      // member can be moved to Alumni by flipping one field in the CMS.
      status: z.enum(['current', 'alumni']).default('current'),
      order: z.number().default(9999),
      // Optional by design: the person card must degrade gracefully to a
      // placeholder when a headshot has not been supplied.
      headshot: image().optional(),
      headshotAlt: z.string().optional(),
      email: z.string().email().optional(),
      links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
      // True when the bio is a placeholder awaiting client copy.
      needsReview: z.boolean().default(false),
    }),
});

// The lab's studies. Each gets its own page off /research.
const research = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/research' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      order: z.number().default(99),
      // Where the study is up to — "Coming soon", "Data analysis stage". The
      // lab prints these after two of its study names; kept as a field so the
      // title reads as a title and the status reads as a status.
      status: z.string().optional(),
      summary: z.string(),
      hero: image().optional(),
      heroAlt: z.string().optional(),
      needsReview: z.boolean().default(false),
    }),
});

/**
 * The publication list, transcribed from the lab's own Publications page and
 * then resolved: every entry was matched against OpenAlex and Crossref to get
 * its registered DOI and its true open-access status.
 *
 * A single JSON list rather than 92 markdown files — it builds faster, keeps the
 * repo tidy, and a CMS list widget is a far nicer thing to edit than a folder of
 * hundreds of entries.
 *
 * Nothing here is guessed. `doi` is the registered identifier; `free` is only
 * ever a verified open-access copy at a *different* address from the DOI, so a
 * paywalled publisher page can never be labelled as free.
 */
const papers = defineCollection({
  // Nested under a `papers` key rather than a bare array so the CMS can bind a
  // list widget to it — a root-level array has nothing to name in the editor.
  loader: file('./content/papers.json', { parser: (text) => JSON.parse(text).papers }),
  schema: z.object({
    id: z.number(),
    title: z.string(),
    // Lab members' names are wrapped in *asterisks*, exactly as they are
    // bolded on the lab's own page. Rendered as emphasis, never flattened.
    authors: z.string(),
    journal: z.string().default(''),
    year: z.number(),
    doi: z.string().default(''),
    // A free copy at an address that is NOT the DOI — a PMC record, a
    // repository deposit. Empty when the publisher's own page is the free one.
    free: z.string().default(''),
    openAccess: z.boolean().default(false),
    // True when the only free copy is a preprint rather than the published
    // article. Labelled as a preprint on the page — never as "the paper".
    preprintOnly: z.boolean().default(false),
    // The link the lab's existing site used, kept so any disagreement with the
    // registered DOI can be reviewed rather than silently overwritten.
    sourceLink: z.string().default(''),
    needsCheck: z.boolean().default(false),
  }),
});

// Announcements. Most are a headline and a date with no body — that is how this
// lab posts news, so a bodyless entry is a complete item and is not flagged.
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
    needsReview: z.boolean().default(false),
  }),
});

/**
 * Prose pages. Two kinds live here:
 *
 *   1. Blocks embedded in another page — currently the lab overview, which
 *      heads the home page. Listed in EMBEDDED_PAGES (src/utils/pages.ts) and
 *      given no URL of its own, so the copy is never published at two
 *      addresses.
 *   2. Standalone pages the client creates in the admin. Each gets its own URL
 *      from its filename and is rendered by src/pages/[page].astro using the
 *      same header and prose components as every other page on the site.
 */
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/pages' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      eyebrow: z.string().default('CANDY Lab'),
      lede: z.string().optional(),
      hero: image().optional(),
      heroAlt: z.string().optional(),
      // Focal point for the header crop, as CSS object-position ("center 22%").
      // A portrait photo in the wide header beheads its subject at the default
      // centre; this keeps the face in frame, and is editable in the admin.
      heroFocus: z.string().optional(),
      // Names a photo set in /content/<name>.json to print under the page's
      // text. Lets the gallery and pets pages be ordinary pages rather than
      // two more bespoke templates.
      gallery: z.enum(['gallery', 'pets']).optional(),
      // Nav placement. New pages appear after the fixed items by default, so
      // adding one never reorders the navigation that already exists.
      showInNav: z.boolean().default(true),
      navLabel: z.string().optional(),
      navOrder: z.number().default(50),
      // Nests this page inside a section's dropdown instead of giving it its
      // own slot in the bar. Keeps the bar short without making pages
      // unreachable, which is what hiding them from the menu did.
      navParent: z.enum(['people', 'research', 'resources', 'join', 'publications', 'contact']).optional(),
      // Lets her build a page over several sittings without it being public.
      draft: z.boolean().default(false),
      needsReview: z.boolean().default(false),
    }),
});

// ENIGMA-consortium papers, from the original site's Publications > ENIGMA
// sub-page. That page carried NO links at all; every DOI here was resolved
// against OpenAlex/Crossref, and unresolved titles keep an empty doi rather
// than a guessed one.
const enigmaPapers = defineCollection({
  loader: file('./content/enigma-papers.json', { parser: (text) => JSON.parse(text).papers }),
  schema: z.object({
    id: z.number(),
    title: z.string(),
    journal: z.string().default(''),
    year: z.number(),
    doi: z.string().default(''),
    free: z.string().default(''),
    openAccess: z.boolean().default(false),
    match: z.number().optional(),
  }),
});

export const collections = { people, research, papers, news, pages, enigmaPapers };
