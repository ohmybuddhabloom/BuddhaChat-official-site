import { getArticle, getCollection, getAuthor, videos } from './catalog';
export type BookmarkKind = 'article' | 'collection' | 'video';
export type Visit = { contentId: string; kind: 'article' | 'video'; paragraph?: number; textVersion?: string; seconds?: number; visitedAt: number };
export function validateAuthor(id: string) { if (!getAuthor(id)) throw new Error('Unknown author'); }
export function validateContent(id: string, kind: BookmarkKind) {
  const found = kind === 'article' ? getArticle(id) : kind === 'collection' ? getCollection(id) : kind === 'video' ? videos.find(v => v.id === id) : undefined;
  if (!found) throw new Error('Unknown content or content kind');
}
export function validateVisit(entry: Visit) {
  if (!['article', 'video'].includes(entry.kind)) throw new Error('Invalid visit kind');
  validateContent(entry.contentId, entry.kind);
  if (!Number.isFinite(entry.visitedAt) || entry.visitedAt < 0 || entry.visitedAt > 8640000000000000) throw new Error('Invalid visit time');
  if (entry.kind === 'article') {
    if (entry.seconds !== undefined) throw new Error('Article cannot have playback progress');
    const article = getArticle(entry.contentId)!;
    if (entry.paragraph !== undefined && (!Number.isInteger(entry.paragraph) || entry.paragraph < 0 || entry.paragraph >= article.paragraphs.length)) throw new Error('Invalid paragraph');
    if (entry.textVersion !== undefined && !/^[a-f0-9]{64}$/.test(entry.textVersion)) throw new Error('Invalid text version');
    if (entry.paragraph !== undefined && entry.textVersion === undefined) throw new Error('Paragraph needs text version');
  } else {
    if (entry.paragraph !== undefined || entry.textVersion !== undefined) throw new Error('Video cannot have text progress');
    if (entry.seconds !== undefined && (!Number.isFinite(entry.seconds) || entry.seconds < 0)) throw new Error('Invalid playback progress');
  }
}
/** Mirrors database merge semantics for behavioral regression checks. */
export function mergeVisit(previous: Visit | undefined, next: Visit): Visit {
  validateVisit(next);
  if (!previous || previous.contentId !== next.contentId || previous.kind !== next.kind) return { ...next };
  if (next.visitedAt < previous.visitedAt) return { ...previous };
  if (next.kind === 'video') return { ...next, seconds: next.seconds ?? previous.seconds };
  const changed = next.textVersion !== undefined && next.textVersion !== previous.textVersion;
  return { ...next, textVersion: next.textVersion ?? previous.textVersion, paragraph: next.paragraph ?? (changed ? undefined : previous.paragraph) };
}
