export function peopleForStagingPreview<T extends { id: string; hidden?: boolean; portrait: string }>(people: T[], enabled: string | undefined, supabaseUrl: string | undefined): T[];
