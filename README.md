# CANDY Lab website

The Cognition, Affect, and Neurodevelopment in Youth Lab at UCLA, directed by
Dr. Tiffany Ho.

Replaces the WordPress site at `candylab.psych.ucla.edu`. Content was migrated
from that site — no copy, citation, name or date here was written from scratch.

- **Framework:** Astro 5, static output, zero JavaScript by default
- **Styling:** Tailwind 4 with a custom theme; all tokens in `src/styles/global.css`
- **Editing:** Sveltia CMS at `/admin` — every save is a git commit
- **Hosting:** Cloudflare Pages (not yet deployed — see `DOCS/DEPLOYMENT.md`)

---

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:4321.

| Command | What it does |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production build into `dist/`, with checks before and after |
| `npm run preview` | Serve the built site |
| `npm run check` | Astro type and content-schema check |
| `npm run check:admin` | Parse and validate `public/admin/config.yml` |
| `npm run check:build` | Audit `dist/` for missing alt text and broken links |

`build` runs `check:admin` before and `check:build` after, so both fail the
build rather than printing something nobody reads.

---

## Layout

```
content/            Everything the client edits. Not in src/ on purpose.
  people/           38 current members + 34 alumni, one file each
  research/         8 studies
  news/             25 announcements
  pages/            Join, Participate, Resources, Lab Values, Gallery, Pets…
  papers.json       92 publications
  gallery.json      36 gallery photos
  pets.json         16 pet photos
  site.json         Lab name, director, contact details
src/
  pages/            Routes
  components/       Header, Footer, PageHeader, PersonCard, Notice, Placeholder
  layouts/Base.astro
  styles/global.css Design tokens — change the look here, not in components
  scripts/enhance.ts  Scroll reveal, header state. All of it decoration.
  config.ts         PRODUCTION_HOST and the fixed navigation
scripts/            Build-time checks
DOCS/
  QUESTIONS.md      Open questions and known gaps — read this first
  EDITING-GUIDE.md  Written for Dr. Ho, not for a developer
  DEPLOYMENT.md     How to get it live, and the cutover order
```

---

## Things worth knowing before changing anything

**The publication data is resolved, not transcribed.** All 92 entries were
matched against OpenAlex and Crossref for their registered DOIs and true
open-access status. `openAccess` drives the "Free to read" filter and must
never be set on the basis of what a URL looks like. See DOCS/QUESTIONS.md.

**Preview deployments are noindexed automatically.** Anything served from a
hostname other than `PRODUCTION_HOST` (`src/config.ts`) emits `noindex` and a
`Disallow: /` robots.txt. This is derived from the address rather than a flag
somebody has to remember, so a throwaway URL carrying photographs and
biographies of real students cannot be indexed by being forgotten about.

**Never put a `/* comment */` between a component's attributes.** Astro parses
it as attributes — every word ships as a junk boolean attribute, and the
attribute after it is silently swallowed. It stripped `alt` from 60 images here
and the build stayed green. `scripts/check-build.mjs` now fails the build if it
recurs. Put comments above the element, in `{/* … */}`.

**Use `||`, not `??`, for any optional string from the CMS.** A blank field
arrives as `""`, which `??` passes straight through; `||` falls back properly.
This is the single most repeated bug on CMS-backed sites.

**Images:** originals live beside their content and go through Astro's image
pipeline. Every migrated image was re-encoded to strip metadata — 21 of the 31
headshots carried EXIF, and 6 carried GPS coordinates. Nothing is ever
displayed above its native resolution.

**Motion is decoration.** Only `opacity` and `transform` are animated, the
reading-progress bar and header parallax are CSS scroll-driven animations
rather than a JavaScript library, and `prefers-reduced-motion` removes motion
rather than shortening it. Content starts visible and is hidden only once the
script confirms it is running, so a blocked bundle degrades to a plain,
complete page.
