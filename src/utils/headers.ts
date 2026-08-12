import type { ImageMetadata } from 'astro';
import data from '../../content/headers.json';

/**
 * Header photographs for the sections that are routes rather than /content
 * pages — Home, Research, Publications, People, Alumni, News.
 *
 * These live in content/headers.json, not in the components, so the client can
 * swap them from the admin. A hero image hardcoded in a template is a
 * maintenance request forever, and heroes are the images most likely to be
 * changed.
 *
 * Vite resolves the files at build time; each is then run through Astro's image
 * pipeline like any other asset.
 */
const files = import.meta.glob<{ default: ImageMetadata }>(
  '../../content/pages/images/**/*.{jpg,jpeg,png,webp}',
  { eager: true }
);

export interface Header {
  image?: ImageMetadata;
  alt: string;
}

export function getHeader(key: string): Header {
  const entry = data.headers.find((h) => h.key === key);
  if (!entry?.image) return { alt: '' };
  const resolved = files[entry.image.replace('./', '../../content/')]?.default;
  // A header whose file has been renamed or removed falls back to no image
  // rather than failing the build — the page still renders, just without the
  // photograph. Reported by scripts/check-build.mjs.
  return { image: resolved, alt: entry.alt ?? '' };
}
