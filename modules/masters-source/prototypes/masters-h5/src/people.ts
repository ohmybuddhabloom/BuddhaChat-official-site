import { mastersPagePeople as canonicalPeople } from '../../../shared/masters/pageVisibility';
import { peopleForStagingPreview } from './staging-people.mjs';

export const people = peopleForStagingPreview(canonicalPeople, import.meta.env.VITE_MASTERS_YINSHUN_STAGING_VISIBLE, import.meta.env.VITE_MASTERS_SUPABASE_URL);
export const visiblePeople = people.filter(person => !person.hidden);
