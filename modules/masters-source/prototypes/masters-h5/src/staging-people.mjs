const stagingOrigin = 'https://bjswjgadnariutxibsfh.supabase.co';
const portrait = '/masters/figures/yinshun/portrait-daa9cb6721dba867e28f22e2663b981e4c006d2c10ae5dec4a77e7ce365ff8dd.jpg';

export function peopleForStagingPreview(people, enabled, supabaseUrl) {
  if (enabled !== 'true') return people;
  try {
    const url = new URL(supabaseUrl);
    if (url.origin !== stagingOrigin || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return people;
  } catch {
    return people;
  }
  return people.map(person => person.id === 'yin-shun' ? { ...person, hidden: false, portrait } : person);
}
