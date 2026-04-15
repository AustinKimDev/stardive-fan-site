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

// Loaded via @rollup/plugin-yaml at build time
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _site: SiteConfig | null = null;

async function getSite(): Promise<SiteConfig> {
  if (_site) return _site;
  // Dynamic import of YAML file via rollup/plugin-yaml
  const mod = await import('../../../../content/seo/site.yaml');
  _site = mod.default as SiteConfig;
  return _site;
}

export async function buildMeta(
  input: Omit<PageMeta, 'canonical'> & { path: string },
): Promise<PageMeta> {
  const site = await getSite();
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
