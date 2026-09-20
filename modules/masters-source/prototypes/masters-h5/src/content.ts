import shengyenCatalog from '../../../docs/shengyen-chinese-catalog.json';
import readingContent from '../../../shared/masters/reading-content.json';
import {
  articleSummaries,
  getArticleSummary,
  getCollectionArticleSummaries,
  type MastersArticleSummary,
} from '../../../shared/masters/catalog';
import nan from './nan-huaijin-candidates.json';
export const nanItems = nan.first_batch_candidates;
import catalog from './hsingyun-catalog.json';
export const books = catalog.books.map((b, i) => ({ ...b, title: ['迷悟之间', '贫僧有话要说', '人间佛教佛陀本怀'][i], label: ['生活随笔', '自述与回望', '佛法入门'][i], intro: ['从日常处境进入佛法的思考。先读一篇，再慢慢走进全书。', '从大师自己的讲述中，了解其生命经历与弘法理念。', '从佛陀的教化与现实生活，理解人间佛教的立场。'][i], sample: catalog.first_batch_chapter_ids[i] }));
export const chapters = catalog.chapters;
export type Chapter = typeof chapters[number];
export type ArticleSummary = MastersArticleSummary;
export const readableArticles = articleSummaries;
export const legacyArticles = readingContent.chapters;
export const videos = [
 {id:'xy-video-W4438geBhss', youtube:'W4438geBhss', title:'金刚经大义（一）· 第 1 段', duration:506},
 {id:'xy-video-6J17zQh5tbU', youtube:'6J17zQh5tbU', title:'金刚经大义（一）· 第 2 段', duration:459},
];
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
export function itemTitle(id:string) { return (id==='yh-dayi-001'?'答疑解惑 · 第一期':undefined) || shengyenCatalog.entries.find(b=>'sy-'+b.sourceId===id)?.title || getArticleSummary(id)?.title || nanItems.find(n=>n.id===id)?.title || books.find(b=>b.id===id)?.title || chapters.find(c=>c.id===id)?.title_display || videos.find(v=>v.id===id)?.title || id; }
export const clock = (seconds:number) => `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;

export function itemOwner(id:string){return getArticleSummary(id)?.person_id || nanItems.find(n=>n.id===id)?.person_id || (id.startsWith('xy-')?'hsing-yun':id.startsWith('sy-')?'sheng-yen':undefined);}
