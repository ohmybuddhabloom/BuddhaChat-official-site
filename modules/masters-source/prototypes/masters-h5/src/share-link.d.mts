export function contentUrl(base:string, route:string):string;
export function syncContentUrl(history: Pick<History, 'state' | 'replaceState'>, location: Pick<Location, 'href'>, route: string): void;
export function routeFromUrl(raw:string, allowedRoutes:string[], canonicalRoutes?:Record<string,string>):string;
export const downloadUrl: string;
export const appHomeUrl: string;
export function appUrlForPage(appUrl:string, pageUrl:string):string;
