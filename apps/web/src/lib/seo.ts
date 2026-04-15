import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

export interface SiteConfig {
  siteName: string;
  siteUrl: string;
  defaultDescription: string;
  ogImage: string;
  twitterHandle: string;
}

export interface PageMeta {
  title: string;
  description?: string;
  canonical: string;
  ogImage?: string;
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown>;
  noindex?: boolean;
}

let _site: SiteConfig | null = null;

function getSite(): SiteConfig {
  if (_site) return _site;
  // Read YAML at runtime — works in both dev (vite) and node production
  const filePath = resolve(process.cwd(), '../../content/seo/site.yaml');
  const raw = readFileSync(filePath, 'utf-8');
  _site = parseYaml(raw) as SiteConfig;
  return _site;
}

export function buildMeta(
  input: Omit<PageMeta, 'canonical'> & { path: string },
): PageMeta {
  const site = getSite();
  return {
    title: `${input.title} | ${site.siteName}`,
    description: input.description ?? site.defaultDescription,
    canonical: `${site.siteUrl}${input.path}`,
    ogImage: input.ogImage ?? `${site.siteUrl}${site.ogImage}`,
    type: input.type ?? 'website',
    jsonLd: input.jsonLd,
    noindex: input.noindex ?? false,
  };
}
