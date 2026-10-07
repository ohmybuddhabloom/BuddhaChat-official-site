export type HistoricalResource = {
  id: string;
  person_id: string;
  kind: 'artwork' | 'modern_video';
  title: string;
  attribution: string;
  institution: string;
  source_url: string;
  year: string;
  duration_seconds?: number;
};

export function resourcesForPerson(resources: HistoricalResource[], personId: string, kind: HistoricalResource['kind']) {
  return resources.filter(resource => resource.person_id === personId && resource.kind === kind);
}
