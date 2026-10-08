import data from './bibliographic-guides-20261009.json';

export const bibliographicGuides = data.entries;
const guidesById = new Map(bibliographicGuides.map(guide => [guide.id, guide]));
export function getBibliographicGuide(id: string) { return guidesById.get(id); }
export const bibliographicCollections = bibliographicGuides.map(guide => ({
  id: guide.id, person_id: guide.person_id, title: guide.title, category: guide.category,
  attribution: guide.original_description, readable_count: 0,
}));
