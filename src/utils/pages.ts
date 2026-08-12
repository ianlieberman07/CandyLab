import { getCollection, type CollectionEntry } from 'astro:content';
import { nav, NAV_PARENTS, NAV_EXTRA_CHILDREN, type NavParentKey } from '../config';

/**
 * Pages that are rendered *inside* another page and must never get a URL or a
 * navigation item of their own.
 *
 * The lab overview is printed on the home page. Giving it a second address
 * would publish the same copy twice, which is bad for search and worse for
 * anyone trying to work out which one to edit.
 *
 * This is the one place that list lives — the route and the navigation both
 * read it, so they cannot disagree.
 */
export const EMBEDDED_PAGES = ['lab-overview'];

/**
 * Every page that should have its own URL, in navigation order.
 *
 * Drafts are visible while developing and dropped from the build, so she can
 * leave a half-written page saved without it appearing on the site.
 */
export async function getStandalonePages(): Promise<CollectionEntry<'pages'>[]> {
  const all = await getCollection('pages');
  return all
    .filter((page) => !EMBEDDED_PAGES.includes(page.id))
    .filter((page) => !page.data.draft || import.meta.env.DEV)
    .sort((a, b) => a.data.navOrder - b.data.navOrder || a.data.title.localeCompare(b.data.title));
}

export interface NavItem {
  label: string;
  href: string;
  /** Pages nested under this one. Empty for a plain link. */
  children: NavItem[];
}

/**
 * The site navigation.
 *
 * Every page is reachable from the top bar: a page either sits at the top
 * level, or nests under one of NAV_PARENTS via its "Which section does this
 * page belong under?" field in the admin.
 *
 * This exists because the alternative — hiding pages from the menu to keep it
 * short — is how the Meet Our Pets page became unreachable except from the
 * footer. Nesting keeps the bar to seven items *and* keeps everything one
 * hover away.
 */
export async function getNavItems(): Promise<NavItem[]> {
  const pages = await getStandalonePages();
  const parentKeys = new Set<string>(NAV_PARENTS.map((p) => p.key));

  const asItem = (page: CollectionEntry<'pages'>) => ({
    label: page.data.navLabel ?? page.data.title,
    href: `/${page.id}`,
    order: page.data.navOrder,
  });

  // Children, grouped by parent. A page naming a parent that no longer exists
  // falls back to the top level rather than vanishing from the site.
  const children = new Map<NavParentKey, (NavItem & { order: number })[]>();
  const push = (parent: NavParentKey, item: NavItem & { order: number }) => {
    const list = children.get(parent) ?? [];
    list.push(item);
    children.set(parent, list);
  };

  for (const extra of NAV_EXTRA_CHILDREN) {
    push(extra.parent, { label: extra.label, href: extra.href, order: extra.order, children: [] });
  }

  const topLevelPages: (NavItem & { order: number })[] = [];
  for (const page of pages) {
    const parent = page.data.navParent;
    const item = { ...asItem(page), children: [] };
    if (parent && parentKeys.has(parent)) push(parent as NavParentKey, item);
    else if (page.data.showInNav) topLevelPages.push(item);
  }

  // A page nested under a section that is itself a page (Resources, Join) must
  // not also appear as its own top-level entry.
  const sectionHrefs = new Set<string>(NAV_PARENTS.map((p) => p.href));

  const top = [
    ...nav.map((item) => ({ ...item, children: [] as NavItem[] })),
    ...topLevelPages,
  ].sort((a, b) => a.order - b.order);

  return top.map(({ label, href }) => {
    const parent = NAV_PARENTS.find((p) => p.href === href);
    const kids = parent ? (children.get(parent.key) ?? []) : [];
    return {
      label,
      href,
      children: kids
        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
        .map(({ label: l, href: h }) => ({ label: l, href: h, children: [] })),
    };
  }).filter((item, _i, all) => {
    // Drop a top-level entry that is a section with no page of its own AND no
    // children — nothing to point at.
    if (!sectionHrefs.has(item.href)) return true;
    return item.children.length > 0 || all.some((o) => o.href === item.href);
  });
}

/** Flat list of every navigable page — used by the footer. */
export function flattenNav(items: NavItem[]): { label: string; href: string }[] {
  return items.flatMap((item) => [
    { label: item.label, href: item.href },
    ...item.children.map((child) => ({ label: child.label, href: child.href })),
  ]);
}
