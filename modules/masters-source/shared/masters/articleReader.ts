import { getArticle, getArticleSummary, mastersTextVersion, type MastersArticle } from './catalog';

export type FetchArticleBody = (id: string, version: string) => Promise<unknown>;

/** Each runtime owns a bounded public-text cache; account state never enters it. */
export function createArticleReader(fetchBody: FetchArticleBody) {
  const cache = new Map<string, MastersArticle>();
  const pending = new Map<string, Promise<MastersArticle>>();
  return async function readArticle(id: string): Promise<MastersArticle> {
    const summary = getArticleSummary(id);
    if (!summary) throw new Error('Unknown article');
    const legacy = getArticle(id);
    if (legacy) return legacy;
    const version = mastersTextVersion(summary);
    const cacheKey = `${id}:${version}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const running = pending.get(cacheKey);
    if (running) return running;
    const request = (async () => {
      const value = await fetchBody(id, version);
      if (!value || typeof value !== 'object') throw new Error('Article unavailable');
      const row = value as Record<string, unknown>;
      if (row.id !== id || row.book_id !== summary.book_id || row.person_id !== summary.person_id ||
          row.source_sha256 !== summary.source_sha256 || row.text_version !== version ||
          row.title !== summary.title || row.author !== summary.author ||
          !Array.isArray(row.paragraphs) || row.paragraphs.length !== summary.paragraph_count ||
          row.paragraphs.some(text => typeof text !== 'string' || !text.trim()) ||
          typeof row.source_url !== 'string' || !row.source_url.startsWith('https://') ||
          typeof row.attribution !== 'string' || typeof row.source_institution !== 'string') {
        throw new Error('Article identity or body does not match reviewed index');
      }
      if (row.paragraph_roles !== undefined && (!Array.isArray(row.paragraph_roles) ||
          row.paragraph_roles.length !== row.paragraphs.length ||
          row.paragraph_roles.some(role => !['paragraph', 'question', 'answer'].includes(role)))) {
        throw new Error('Invalid paragraph roles');
      }
      const article = row as unknown as MastersArticle;
      cache.set(cacheKey, article);
      if (cache.size > 12) cache.delete(cache.keys().next().value!);
      return article;
    })();
    pending.set(cacheKey, request);
    try { return await request; } finally { pending.delete(cacheKey); }
  };
}
