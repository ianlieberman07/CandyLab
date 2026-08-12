import site from '../content/site.json';

export { site };

/**
 * The address the finished site will live at.
 *
 * Anything served from a different hostname — the temporary pages.dev URL, a
 * branch preview, someone's laptop — is treated as not-the-real-site and tells
 * search engines to stay away, in both the page head and robots.txt.
 *
 * This is deliberately a comparison against the address rather than a flag
 * somebody has to remember to set. A throwaway URL carrying a full copy of the
 * lab's pages and the photographs and biographies of thirty-eight students
 * should not be one forgotten checkbox away from being indexed, and cleaning
 * that up after launch is far more work than preventing it.
 */
export const PRODUCTION_HOST = 'candylab.psych.ucla.edu';

/**
 * The fixed sections, mirroring the structure of the site this replaces.
 *
 * `order` leaves gaps so a page created in the admin (which defaults to 50)
 * lands after these rather than in among them — adding a page never rearranges
 * the navigation that is already there. Pages created in the admin are merged
 * in by `getNavItems` in utils/pages.ts; that is what the header and footer
 * actually render.
 */
export const nav = [
  // The wordmark links home too, but an explicit Home item is what people
  // actually look for — relying on the logo alone is a small usability tax.
  { label: 'Home', href: '/', order: 10 },
  { label: 'Research', href: '/research', order: 20 },
  { label: 'Publications', href: '/publications', order: 30 },
  { label: 'People', href: '/people', order: 40 },
  { label: 'News', href: '/news', order: 45 },
];
