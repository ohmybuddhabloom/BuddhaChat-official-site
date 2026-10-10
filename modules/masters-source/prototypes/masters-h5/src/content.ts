import louYulieReading from '../../../shared/masters/lou-yulie-reading.json';
import type { HistoricalResource } from '../../../shared/masters/historicalResources';
import historicalData from '../../../shared/masters/historical-masters.json';
import historicalExpansion from '../../../shared/masters/historical-expansion-20261008.json';
export const historical = { ...historicalData, collections: [...historicalData.collections, ...historicalExpansion.collections] } as { resources: HistoricalResource[]; profiles: { id: string; source_note: string; sources: {url: string; title: string; institution: string}[]; timeline: {year: string; text: string}[]; media_note: string }[]; collections: {id: string; title: string; person_id: string; category: string; attribution: string; source_url: string}[] };
import shengyenCatalog from '../../../docs/shengyen-chinese-catalog.json';
import readingContent from '../../../shared/masters/reading-content.json';
import {
  articleSummaries,
  collections as sharedCollections,
  getArticleSummary,
  getCollectionArticleSummaries,
  videos,
  getMastersVideoMetadata,
  getMastersVideoGroups,
  getMastersVideoSeries,
  type MastersArticleSummary,
  type MastersVideo,
} from '../../../shared/masters/catalog';
import { getBibliographicGuide as findBibliographicGuide } from '../../../shared/masters/bibliographicGuides';
export { videos, getMastersVideoMetadata, getMastersVideoGroups, getMastersVideoSeries };
export type { MastersVideo };
import nan from './nan-huaijin-candidates.json';
export const nanItems = nan.first_batch_candidates;
import catalog from './hsingyun-catalog.json';
export const books = catalog.books.map((b, i) => ({ ...b, title: ['迷悟之间', '贫僧有话要说', '人间佛教佛陀本怀', '人间万事'][i], label: ['生活随笔', '自述与回望', '佛法入门', '人间生活'][i], intro: ['从日常处境进入佛法的思考。先读一篇，再慢慢走进全书。', '从大师自己的讲述中，了解其生命经历与弘法理念。', '从佛陀的教化与现实生活，理解人间佛教的立场。', '从生活中的人和事，阅读大师对人间的观察与思考。'][i], sample: catalog.first_batch_chapter_ids[i] }));
export const chapters = catalog.chapters;
export type Chapter = typeof chapters[number];
export type ArticleSummary = MastersArticleSummary;
export type LibraryCollection = { id: string; title: string; person_id: string; category?: string; attribution?: string; source_url?: string; source_institution?: string; readable_count?: number; catalog_count?: number; deferred_count?: number };
export const libraryCollections = sharedCollections as LibraryCollection[];
export const readableArticles = articleSummaries;
export const legacyArticles = [...readingContent.chapters, ...louYulieReading.chapters];
export const sources = [
 ['《星云大师全集》','https://books.masterhsingyun.org/article/articlelist','文字主源 · 佛光山'],
 ['全集版本与收录范围','https://books.masterhsingyun.org/intro/intro','增订版 395 册；附录含他人研究资料'],
 ['官方影音分类','https://books.masterhsingyun.org/intro/medialink','影音弘法 → 大师佛经讲座 / 佛学讲座'],
 ['佛光山文化书城 · 历史沿革','https://www.fgsbooks.com.tw/about/history','1993 年香港讲座的主讲与活动佐证'],
 ['香港佛光道场 · 机构介绍','https://fgshk.org.hk/page-about-us/page-hkfgs/','佛香数位网路电台归属说明'],
 ['大师略传','https://books.masterhsingyun.org/intro/master','官方传记资料 · 机构编写'],
 ['佛光山人间佛教研究院','https://www.fgsihb.org/','研究资料 · 作者逐篇标注'],
];
export function articleSummary(id:string) { return getArticleSummary(id); }
export function collectionArticles(id:string) { return getCollectionArticleSummaries(id); }
export function getBibliographicGuide(id:string) { return findBibliographicGuide(id); }
export function isLegacyCollectionId(id:string){return id==='yh-dayi-001'||id.startsWith('sy-')||historical.collections.some(b=>b.id===id)||nanItems.some(n=>n.id===id)||books.some(b=>b.id===id);}
export function genericCollection(id:string){return libraryCollections.find(b=>b.id===id&&!isLegacyCollectionId(id));}
export function genericCollectionsForPerson(personId:string){return libraryCollections.filter(b=>b.person_id===personId&&!isLegacyCollectionId(b.id));}
export function collectionReadabilityLabel(id:string){if(getBibliographicGuide(id))return '书目介绍 · 正文暂未开放';const meta=libraryCollections.find(b=>b.id===id);const readable=collectionArticles(id).length||meta?.readable_count||0;const catalog=meta?.catalog_count;return catalog&&readable<catalog?`${readable} / ${catalog} 篇已收录`:`${readable} 篇可阅读`;}
export function collectionRoute(id:string){return id==='yh-dayi-001'?'yuanhui-book':id.startsWith('sy-')?'shengyen-book:'+id.slice(3):nanItems.some(n=>n.id===id)?'external:'+id:'book:'+id;}
export function itemTitle(id:string) { return historical.collections.find(b=>b.id===id)?.title || (id==='yh-dayi-001'?'答疑解惑 · 第一期':undefined) || shengyenCatalog.entries.find(b=>'sy-'+b.sourceId===id)?.title || getArticleSummary(id)?.title || nanItems.find(n=>n.id===id)?.title || books.find(b=>b.id===id)?.title || genericCollection(id)?.title || libraryCollections.find(b=>b.id===id)?.title || chapters.find(c=>c.id===id)?.title_display || videos.find(v=>v.id===id)?.title || id; }
export const clock = (seconds:number) => `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;

export function itemOwner(id:string){return getArticleSummary(id)?.person_id || historical.collections.find(b=>b.id===id)?.person_id || nanItems.find(n=>n.id===id)?.person_id || genericCollection(id)?.person_id || libraryCollections.find(b=>b.id===id)?.person_id || videos.find(v=>v.id===id)?.person_id || (id.startsWith('xy-')?'hsing-yun':id.startsWith('sy-')?'sheng-yen':undefined);}
