const privateRoutePattern = /^(history|following|favorites|library|account|progress)(:|$)/;

function publicRoute(route) {
  return typeof route === 'string' && route.length > 0 && !privateRoutePattern.test(route);
}

export function contentUrl(base, route) {
  const url = new URL(base);
  url.search = '';
  url.hash = '';
  url.searchParams.set('content', publicRoute(route) ? route : 'home');
  return url.toString();
}
export function routeFromUrl(raw, allowedRoutes, canonicalRoutes = {}) {
  try {
    const route = new URL(raw).searchParams.get('content');
    const resolved = publicRoute(route) ? (canonicalRoutes[route] || route) : null;
    return resolved && publicRoute(resolved) && allowedRoutes.includes(resolved) ? resolved : 'home';
  } catch { return 'home'; }
}
export const downloadUrl = 'https://www.buddhachat.online/download';
export const appHomeUrl = 'buddhachat://l/home';
