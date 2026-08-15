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

/**
 * Sections that can hold a dropdown.
 *
 * A page nests under one of these by setting `navParent` to the matching key,
 * which is a plain select in the admin — so the menu can be restructured
 * without a developer. Anything with no parent stays top-level.
 *
 * `Alumni` is listed here rather than in `nav` because it is a route, not a
 * page in /content, and it belongs under People.
 */
export const NAV_PARENTS = [
  { key: 'people', label: 'People', href: '/people' },
  { key: 'research', label: 'Research', href: '/research' },
  { key: 'resources', label: 'Resources', href: '/resources' },
  { key: 'join', label: 'Join', href: '/join' },
  // Mirrors the original candylab site: Publications carried ENIGMA in a
  // dropdown, and Contact carried Participate.
  { key: 'publications', label: 'Publications', href: '/publications' },
  { key: 'contact', label: 'Contact', href: '/contact' },
] as const;

export type NavParentKey = (typeof NAV_PARENTS)[number]['key'];

/** Fixed routes that live inside a dropdown but have no /content page. */
export const NAV_EXTRA_CHILDREN: {
  parent: NavParentKey;
  label: string;
  href: string;
  order: number;
}[] = [
  { parent: 'people', label: 'Lab Alumni', href: '/people/alumni', order: 10 },
];
