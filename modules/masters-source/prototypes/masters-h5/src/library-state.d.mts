export type HistoryEntry = { id: string; kind: 'chapter'; visitedAt: number; paragraph?: number; textVersion?: string } | { id: string; kind: 'video'; visitedAt: number; seconds?: number }
export interface LibraryState { following: string[]; favorites: string[]; history: HistoryEntry[] }
export type LibraryAction =
  | { type: 'toggle-follow' | 'toggle-favorite' | 'remove-history'; id: string }
  | ({ type: 'visit' } & HistoryEntry)
  | { type: 'clear-history' }
export function emptyState(): LibraryState
export function sanitizeState(raw: unknown): LibraryState
export function reduceState(state: LibraryState, action: LibraryAction): LibraryState
