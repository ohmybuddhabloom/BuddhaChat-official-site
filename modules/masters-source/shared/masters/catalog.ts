import historical from './historical-masters.json';
import historicalExpansion from './historical-expansion-20261008.json';
import nextTextLibrary from './next-text-library-20261008.json';
import nextTextLibraryRound2 from './next-text-library-20261009.json';
import additionalArticles from './article-index.json';
import additionalCollections from './collection-index.json';
import readingContent from './reading-content.json';
import { people } from './people';
import { videos } from './videoCatalog';
export { videos, mediaKindLabels, getMastersVideoMetadata, getMastersVideoGroups, getMastersVideoSeries } from './videoCatalog';
export type { MastersVideo, MastersMediaKind } from './videoCatalog';

export const authors = people;
export const articles = readingContent.chapters;
export type MastersArticleSummary = {
  id: string; book_id: string; person_id: string; title: string; author: string;
  source_sha256: string; text_version?: string; source_order: number; paragraph_count: number;
};
export const articleSummaries: MastersArticleSummary[] = [
  ...articles.map(({ id, book_id, person_id, title, author, source_sha256, source_order, paragraphs }) =>
    ({ id, book_id, person_id, title, author, source_sha256, source_order, paragraph_count: paragraphs.length })),
  ...additionalArticles,
];
export function mastersTextVersion(article: { source_sha256: string; text_version?: string }) { return article.text_version ?? article.source_sha256; }
const summariesById = new Map<string, MastersArticleSummary>();
const summariesByCollection = new Map<string, MastersArticleSummary[]>();
for (const article of articleSummaries) {
  if (!summariesById.has(article.id)) summariesById.set(article.id, article);
  const rows = summariesByCollection.get(article.book_id) ?? [];
  rows.push(article);
  summariesByCollection.set(article.book_id, rows);
}
for (const rows of summariesByCollection.values()) rows.sort((a, b) => a.source_order - b.source_order);
export function getArticleSummary(id: string) { return summariesById.get(id); }
export function getCollectionArticleSummaries(id: string) {
  return summariesByCollection.get(id)?.slice() ?? [];
}
export const collections = [
  { id: 'yh-dayi-001', title: '答疑解惑 · 第一期', person_id: 'yuanhui' },
  { id: 'sy-05-02', title: '正信的佛教', person_id: 'sheng-yen' },
  { id: 'sy-05-03', title: '學佛群疑', person_id: 'sheng-yen' },
  { id: 'xy-miwuzhijian', title: '迷悟之间', person_id: 'hsing-yun' },
  { id: 'xy-pinseng', title: '贫僧有话要说', person_id: 'hsing-yun' },
  { id: 'xy-renjianfojiao', title: '人间佛教佛陀本怀', person_id: 'hsing-yun' },
  { id: 'nhj-lunyu-biecai', title: '论语别裁', person_id: 'nan-huaijin' },
  { id: 'nhj-laozi-tashuo', title: '老子他说', person_id: 'nan-huaijin' },
  { id: 'nhj-jingangjing-shuoshenme', title: '金刚经说什么', person_id: 'nan-huaijin' },
  ...additionalCollections,
  ...historical.collections,
  ...historicalExpansion.collections,
  ...nextTextLibrary.collections,
  ...nextTextLibraryRound2.collections,
];

export type MastersArticle = typeof articles[number];
export type MastersAuthor = typeof authors[number];
export type MastersCollection = typeof collections[number];
export type MastersRoute =
  | { kind: 'home' }
  | { kind: 'person'; id: string }
  | { kind: 'collection'; id: string }
  | { kind: 'article'; id: string }
  | { kind: 'video'; id: string };

export function getArticle(id: string) { return articles.find(article => article.id === id); }
export function getCollection(id: string) { return collections.find(collection => collection.id === id); }
export function getAuthor(id: string) { return authors.find(author => author.id === id); }
export function getCollectionArticles(id: string) {
  return articles.filter(article => article.book_id === id).sort((a, b) => a.source_order - b.source_order);
}
export function itemOwner(id: string): string | undefined {
  return getAuthor(id)?.id ?? getArticleSummary(id)?.person_id ?? getCollection(id)?.person_id ?? videos.find(video => video.id === id)?.person_id;
}

/** Resolve only known content. Route aliases never manufacture author or article identities. */
export function resolveMastersRoute(route: string): MastersRoute | null {
  if (route === 'home') return { kind: 'home' };
  const alias = authors.find(author => author.route === route);
  if (alias) return { kind: 'person', id: alias.id };
  if (route === 'yuanhui-book') return { kind: 'collection', id: 'yh-dayi-001' };
  const separator = route.indexOf(':');
  if (separator < 1) return null;
  const prefix = route.slice(0, separator);
  const id = route.slice(separator + 1);
  if (prefix === 'person' && getAuthor(id)) return { kind: 'person', id };
  if (prefix === 'shengyen-book') {
    const collectionId = `sy-${id}`;
    return getCollection(collectionId) ? { kind: 'collection', id: collectionId } : null;
  }
  if (['collection', 'book', 'external'].includes(prefix) && getCollection(id)) return { kind: 'collection', id };
  if (['article', 'chapter', 'reader'].includes(prefix) && getArticleSummary(id)) return { kind: 'article', id };
  if (prefix === 'video' && videos.some(video => video.id === id)) return { kind: 'video', id };
  return null;
}
