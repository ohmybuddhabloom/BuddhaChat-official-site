import {
  authors,
  getArticleSummary,
  getCollection,
  resolveMastersRoute,
  type MastersRoute,
} from './catalog';

export type EnvLike = {
  EXPO_PUBLIC_MASTERS_H5_BASE_URL?: string;
} & Record<string, string | undefined>;

declare const process: { env?: EnvLike } | undefined;

export type MastersShareLinks = {
  route: MastersRoute;
  contentRoute: string;
  appUrl: string;
  h5Url: string;
};

export const MASTERS_PUBLIC_H5_BASE_URL_ENV = 'EXPO_PUBLIC_MASTERS_H5_BASE_URL';
export const MASTERS_APP_LINK_BASE = 'buddhachat://masters';

function currentEnv(): EnvLike {
  if (typeof process === 'undefined' || !process.env) return {};
  return { EXPO_PUBLIC_MASTERS_H5_BASE_URL: process.env.EXPO_PUBLIC_MASTERS_H5_BASE_URL };
}

function routeToCanonicalContent(route: MastersRoute): string {
  if (route.kind === 'home') return 'home';
  if (route.kind === 'person') return `person:${route.id}`;
  if (route.kind === 'collection') return `collection:${route.id}`;
  if (route.kind === 'article') return `article:${route.id}`;
  return `video:${route.id}`;
}

function isNonEmptyId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isMastersRouteObject(input: unknown): input is MastersRoute {
  if (!input || typeof input !== 'object') return false;
  const route = input as { kind?: unknown; id?: unknown };
  if (route.kind === 'home') return route.id === undefined;
  return (
    (route.kind === 'person' ||
      route.kind === 'collection' ||
      route.kind === 'article' ||
      route.kind === 'video') &&
    isNonEmptyId(route.id)
  );
}

export function resolveMastersShareRoute(input: string | MastersRoute | null | undefined): MastersRoute | null {
  if (!input) return null;
  if (typeof input === 'string') return resolveMastersRoute(input);
  if (!isMastersRouteObject(input)) return null;
  return resolveMastersRoute(routeToCanonicalContent(input));
}

export function canonicalMastersContentRoute(input: string | MastersRoute | null | undefined): string | null {
  const route = resolveMastersShareRoute(input);
  return route ? routeToCanonicalContent(route) : null;
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '[::1]' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    /^127(?:\.\d{1,3}){3}$/.test(host)
  );
}

function isPrivateIpHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const parts = v4.slice(1).map(Number);
    if (parts.some(part => part < 0 || part > 255)) return false;
    const [a, b] = parts;
    return (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  return host.includes(':') && (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:'));
}

export function normalizeMastersPublicBaseUrl(rawBaseUrl: string | null | undefined): string | null {
  if (!rawBaseUrl || typeof rawBaseUrl !== 'string') return null;
  try {
    const parsed = new URL(rawBaseUrl.trim());
    if (parsed.protocol !== 'https:') return null;
    if (
      !parsed.hostname ||
      parsed.username ||
      parsed.password ||
      isLoopbackHost(parsed.hostname) ||
      isPrivateIpHost(parsed.hostname)
    ) return null;
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

export function configuredMastersPublicBaseUrl(env: EnvLike = currentEnv()): string | null {
  return normalizeMastersPublicBaseUrl(env.EXPO_PUBLIC_MASTERS_H5_BASE_URL);
}

export function h5LegacyRouteForMastersContent(input: string | MastersRoute | null | undefined): string | null {
  const route = resolveMastersShareRoute(input);
  if (!route) return null;
  if (route.kind === 'home') return 'home';
  if (route.kind === 'person') return authors.find(author => author.id === route.id)?.route ?? null;
  if (route.kind === 'article') return getArticleSummary(route.id) ? `reader:${route.id}` : null;
  if (route.kind === 'video') return `video:${route.id}`;

  const collection = getCollection(route.id);
  if (!collection) return null;
  if (collection.id === 'yh-dayi-001') return 'yuanhui-book';
  if (collection.id.startsWith('sy-')) return `shengyen-book:${collection.id.slice(3)}`;
  if (collection.id.startsWith('nhj-')) return `external:${collection.id}`;
  return `book:${collection.id}`;
}

export function buildMastersAppLink(input: string | MastersRoute | null | undefined): string | null {
  const contentRoute = canonicalMastersContentRoute(input);
  if (!contentRoute) return null;
  const url = new URL(MASTERS_APP_LINK_BASE);
  url.searchParams.set('content', contentRoute);
  return url.toString();
}

export function buildMastersH5Url(
  input: string | MastersRoute | null | undefined,
  publicBaseUrl: string | null | undefined = configuredMastersPublicBaseUrl(),
): string | null {
  const contentRoute = canonicalMastersContentRoute(input);
  const baseUrl = normalizeMastersPublicBaseUrl(publicBaseUrl);
  if (!contentRoute || !baseUrl) return null;
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = '';
  url.searchParams.set('content', contentRoute);
  return url.toString();
}

export function buildMastersShareLinks(
  input: string | MastersRoute | null | undefined,
  options: { publicBaseUrl?: string | null; env?: EnvLike } = {},
): MastersShareLinks | null {
  const route = resolveMastersShareRoute(input);
  if (!route) return null;
  const publicBaseUrl = options.publicBaseUrl ?? configuredMastersPublicBaseUrl(options.env);
  const contentRoute = routeToCanonicalContent(route);
  const appUrl = buildMastersAppLink(route);
  const h5Url = buildMastersH5Url(route, publicBaseUrl);
  if (!appUrl || !h5Url) return null;
  return { route, contentRoute, appUrl, h5Url };
}
