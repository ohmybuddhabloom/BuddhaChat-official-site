import { people } from './people';
import { itemOwner, resolveMastersRoute, type MastersRoute } from './catalog';

const pageHome = { kind: 'home' } as const;

// Page visibility is separate from canonical content and stored personal records.
export const mastersPagePeople = people.filter(person => person.id !== 'yuanhui');
export function isMastersPageItemVisible(id: string): boolean {
  return itemOwner(id) !== 'yuanhui';
}
export function isMastersPageLegacyRouteVisible(route: string): boolean {
  const resolved = resolveMastersRoute(route);
  return !resolved || resolved.kind === 'home' || isMastersPageItemVisible(resolved.id);
}
export function mastersPageRoute<T extends MastersRoute>(route: T): T | { kind: 'home' } {
  return route.kind === 'home' || isMastersPageItemVisible(route.id) ? route : pageHome;
}
