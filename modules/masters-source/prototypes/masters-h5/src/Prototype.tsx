import { profileCopy } from '../../../shared/masters/profileCopy';
import { buildMastersAppLink, canonicalMastersContentRoute, h5LegacyRouteForMastersContent } from '../../../shared/masters/shareLinks';
import { createArticleReader, type FetchArticleBody } from '../../../shared/masters/articleReader';
import { buildReadingBlocks, type MastersFigure } from '../../../shared/masters/articleFigures';
import { mastersTextVersion, type MastersArticle } from '../../../shared/masters/catalog';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, BookmarkIcon, ClockIcon, HeartIcon, MagnifyingGlassIcon, PlayIcon, ReaderIcon, ExternalLinkIcon, TrashIcon, Link2Icon, PersonIcon, Share1Icon } from '@radix-ui/react-icons';
import { FlowStack, useFlow, MobileScroll, KeyboardInput, BottomSheet, type FlowScreen } from './mobile';
import { books, chapters, videos, sources, nanItems, itemTitle, itemOwner, clock, readableArticles, legacyArticles, articleSummary, collectionArticles } from './content';
import { uiColors, uiRadius } from '../../../src/ui/tokens';
import { contentUrl, routeFromUrl, downloadUrl, appHomeUrl, appUrlForPage } from './share-link.mjs';
import { people } from './people';
import { catalogLabel } from './display-text.mjs';
import shengyenCatalog from '../../../docs/shengyen-chinese-catalog.json';
import YouTubePlayer from './YouTubePlayer';
import { emptyState, sanitizeState, reduceState } from './library-state.mjs';

type Library = ReturnType<typeof emptyState>;
type Action = Parameters<typeof reduceState>[1];
const State = createContext<{state:Library; dispatch:(a:Action)=>void; warning:string}>({state:emptyState(),dispatch:()=>{},warning:''});
const AppAccess=createContext<(route:string,action:string)=>void>(()=>{});
const useLibrary=()=>useContext(State);
const KEY='buddhachat-masters-prototype-v1';
const publicRoutes=['home','directory','person','nan','yuanhui','shengyen','sources','yuanhui-book',...shengyenCatalog.entries.map(b=>'shengyen-book:'+b.sourceId),...readableArticles.map(c=>'reader:'+c.id),...books.map(b=>'book:'+b.id),...chapters.map(c=>'chapter:'+c.id),...videos.map(v=>'video:'+v.id),...nanItems.map(n=>'external:'+n.id)];
const canonicalRoutes=Object.fromEntries(publicRoutes.map(route=>[canonicalMastersContentRoute(route),h5LegacyRouteForMastersContent(route)]).filter((entry):entry is [string,string]=>Boolean(entry[0]&&entry[1])));
const routes = (id:string):FlowScreen => ({id,headerHeight:94,header:()=> <Header id={id}/>,render:()=> <Screen id={id}/>});
const supabaseUrl = (import.meta.env.VITE_MASTERS_SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_MASTERS_SUPABASE_ANON_KEY || '';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const fetchArticleBody: FetchArticleBody = async (id, version) => {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('reader_config_missing');
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/masters_read_article`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          authorization: `Bearer ${supabaseAnonKey}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ p_content_id: id, p_text_version: version }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`reader_http_${response.status}`);
      const body = await response.json();
      if (!body) throw new Error('reader_body_missing');
      return body;
    } catch (error) {
      lastError = error;
      if (attempt === 0) await delay(250);
    } finally {
      window.clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('reader_fetch_failed');
};
const readArticle = createArticleReader(fetchArticleBody);
function Header({id}:{id:string}) {
 const flow=useFlow();const requestApp=useContext(AppAccess);const[shared,setShared]=useState('');
 const title=id==='directory'?'全部人物':id==='yuanhui'?'源慧师父':id==='shengyen'?'圣严法师':id==='home'?'法师与名家':id==='nan'?'南怀瑾':id==='person'?'星云大师':id==='history'?'浏览记录':id==='following'?'我的关注':id==='favorites'?'我的收藏':id==='sources'?'内容来源':id.startsWith('book:')||id==='yuanhui-book'?'著作':id.startsWith('chapter:')||id.startsWith('reader:')?'阅读':id.startsWith('external:')||id.startsWith('shengyen-book:')?'著作':'影音';
 useEffect(()=>{history.replaceState(history.state,'',contentUrl(location.href,id));setShared('');},[id]);
 async function share(){try{await navigator.clipboard.writeText(contentUrl(location.href,id));setShared('链接已复制');}catch{setShared('可复制浏览器地址分享');}}
 return <div className="header-shell"><header className="toolbar">{flow.canGoBack?<button aria-label="返回" onClick={flow.pop}><ArrowLeftIcon/></button>:id!=='home'?<button aria-label="返回栏目首页" onClick={()=>flow.replace(routes('home'))}><ArrowLeftIcon/></button>:<span className="brand">B</span>}<strong>{title}</strong><button aria-label="分享当前页面" onClick={share}><Share1Icon/></button></header><div className="web-app-bar"><span>{shared||'BuddhaChat · 法师与名家'}</span><button onClick={()=>requestApp(id,'继续浏览')}>打开 App</button></div></div>;
}

export default function Prototype(){
 const [state,setState]=useState<Library>(()=>{try{return sanitizeState(JSON.parse(localStorage.getItem(KEY)||'null'));}catch{return emptyState();}});
 const [warning,setWarning]=useState('');
 const [gate,setGate]=useState<{route:string;action:string}|null>(null);
 const [initialRoute]=useState(()=>routeFromUrl(location.href,publicRoutes,canonicalRoutes));
 const appContentUrl=gate&&import.meta.env.VITE_MASTERS_APP_CONTENT_ENABLED==='true'?buildMastersAppLink(gate.route):null;
 useEffect(()=>{Object.entries(uiColors).forEach(([key,value])=>document.documentElement.style.setProperty('--bc-'+key,value));Object.entries(uiRadius).forEach(([key,value])=>document.documentElement.style.setProperty('--bc-radius-'+key,value+'px'));},[]);
 const dispatch=(a:Action)=>setState(s=>reduceState(s,a));
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(state));setWarning('');}catch{setWarning('浏览器未允许保存，本次操作仅在当前页面保留。');}},[state]);
 return <State.Provider value={{state,dispatch,warning}}><AppAccess.Provider value={(route,action)=>{setGate({route,action});}}><FlowStack initial={routes(initialRoute)}/><BottomSheet open={gate!==null} onOpenChange={open=>{if(!open)setGate(null);}} title={gate?.action==='我的关注'?'在 App 中查看关注':gate?.action==='我的收藏'?'在 App 中查看收藏':gate?.action==='关注'?'在 App 中关注这位法师或名家':gate?.action==='收藏'?'在 App 中收藏这份内容':'在 BuddhaChat 中继续'} description={gate?.action?.includes('关注')?'关注功能由 App 承接，网页可继续浏览各位主页。':gate?.action?.includes('收藏')?'收藏功能由 App 承接，网页可继续浏览公开内容。':'网页可继续阅读与播放公开内容。'}>{!appContentUrl&&<p className="notice">此栏目的 App 内容页尚未上线。现在可以继续浏览网页，或打开 App 首页。</p>}<a className="primary wide" href={appUrlForPage(appContentUrl||appHomeUrl,location.href)}>{appContentUrl?'在 App 中继续':'打开 App 首页'}</a><a className="secondary wide" href={downloadUrl} target="_blank" rel="noopener noreferrer">尚未安装？前往下载</a><button className="text-button" onClick={()=>setGate(null)}>继续在网页浏览 <ArrowRightIcon/></button></BottomSheet></AppAccess.Provider></State.Provider>;
}
function Screen({id}:{id:string}) { const flow=useFlow(); return <MobileScroll className="app-screen"><main className="content" inert={flow.current.id!==id}>{id==='home'?<Home/>:id==='directory'?<Directory/>:id==='yuanhui-book'?<YuanhuiBook/>:people.some(p=>p.route===id)?<Profile route={id}/>:id.startsWith('shengyen-book:')?<ShengyenBook id={id.slice(14)}/>:id.startsWith('reader:')?<InlineReading id={id.slice(7)}/>:id.startsWith('external:')?<ExternalReading id={id.slice(9)}/>:['history','following','favorites'].includes(id)?<LibraryPage kind={id}/>:id==='sources'?<Sources/>:id.startsWith('book:')?<Book id={id.slice(5)}/>:id.startsWith('chapter:')?<Reading id={id.slice(8)}/>:flow.current.id===id?<Video id={id.slice(6)}/>:null}<StorageNote/></main></MobileScroll> }
function StorageNote(){const{warning}=useLibrary();const flow=useFlow();return <p className={warning?'warning':'footnote'} role={warning?'alert':undefined}>{warning&&<>{warning} · </>}<button onClick={()=>flow.push(routes('sources'))}>内容来源</button></p>}
function Section({title,children,action}:{title:string;children:ReactNode;action?:ReactNode}){return <section className="section"><div className="section-title"><h2>{title}</h2>{action}</div>{children}</section>}
function OpenItem({id,children}:{id:string;children?:ReactNode}){const flow=useFlow();const path=articleSummary(id)&&!chapters.some(c=>c.id===id)?'reader:':nanItems.some(n=>n.id===id)?'external:':books.some(b=>b.id===id)?'book:':videos.some(v=>v.id===id)?'video:':'chapter:';return <button className="text-button" onClick={()=>flow.push(routes(path+id))}>{children||itemTitle(id)}<ArrowRightIcon/></button>}
function Save({id}:{id:string}){const requestApp=useContext(AppAccess);const route=nanItems.some(n=>n.id===id)?'external:'+id:books.some(b=>b.id===id)?'book:'+id:videos.some(v=>v.id===id)?'video:'+id:'chapter:'+id;return <button className="save" aria-label="在App中收藏" onClick={()=>requestApp(route,'收藏')}><BookmarkIcon/>收藏</button>}
function Follow({id="hsing-yun"}:{id?:string}){const requestApp=useContext(AppAccess);return <button className="primary" onClick={()=>requestApp(people.find(p=>p.id===id)?.route||'home','关注')}>＋ 关注</button>}

function Portrait({id}:{id:string}){const person=people.find(p=>p.id===id);const[failed,setFailed]=useState(false);return <span className="person-symbol" data-person={id} title={id==='nan-huaijin'?'南怀瑾 · 晚年肖像':undefined}>{person?.portrait&&!failed?<img src={person.portrait} alt={id==='nan-huaijin'?'南怀瑾晚年肖像':person.name} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<PersonIcon aria-hidden="true"/>}</span>;}
function Home() {
  const flow = useFlow();
  const [query, setQuery] = useState('');
  const requestApp=useContext(AppAccess);
  return <>
    <label className="search home-search"><MagnifyingGlassIcon/><KeyboardInput value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜索姓名或著作"/></label>
    <div className="utilities">
      {[
        {id:'following', label:'我的关注', icon:<HeartIcon/>},
        {id:'history', label:'浏览记录', icon:<ClockIcon/>},
        {id:'favorites', label:'我的收藏', icon:<BookmarkIcon/>},
      ].map(item=><button key={item.id} onClick={()=>item.id==='history'?flow.push(routes('history')):requestApp('home',item.label)}>{item.icon}<span>{item.label}</span>{item.id!=='history'&&<small>App 内查看</small>}</button>)}
    </div>
    {query ? <SearchResults query={query}/> : <>
      <Section title="法师与名家" action={<button className="all-people" onClick={()=>flow.push(routes('directory'))}>查看全部 <ArrowRightIcon/></button>}>
        <div className="people-grid">
          {people.map(person=><button key={person.id} onClick={()=>flow.push(routes(person.route))} aria-label={'进入'+person.name+'主页'}>
            <Portrait id={person.id}/>
            <strong>{person.name}</strong><span>{person.type}</span>
          </button>)}
        </div>
      </Section>
      <Resume compact/>
      <RecommendationFeed/>
    </>}
  </>;
}
function RecommendationFeed(){
 const flow=useFlow();const[limit,setLimit]=useState(3);const sentinel=useRef<HTMLDivElement>(null);
 const items=[
  {id:'shengyen',title:'圣严法师中文著作',meta:'圣严法师 · 专题',description:'循着法鼓全集，系统阅读。',source:'来源：法鼓全集',action:'进入专题'},
  {id:'external:nhj-lunyu-biecai',title:'论语别裁',meta:'南怀瑾 · 著作／讲述整理',description:'从《论语》出发，阅读南怀瑾的讲述。',source:'来源：劝学网整理版',action:'查看著作'},
  {id:'video:'+videos[0].id,title:videos[0].title,meta:'星云大师 · 本人开示 · '+clock(videos[0].duration),description:'1993 年香港讲座录像，首段从这里开始。',source:'来源：ibpsradio 佛香数位网路电台',action:'观看讲经'},
  {id:'external:'+nanItems[1].id,title:nanItems[1].title,meta:'南怀瑾 · 著作／讲述整理',description:'从精选篇目开始，在这里阅读。',source:'来源：劝学网整理版',action:'查看著作'},
  {id:'chapter:'+books[0].sample,title:itemTitle(books[0].sample),meta:'星云大师 · '+books[0].title,description:'从日常生活中的时间安排，进入佛法的思考。',source:'来源：星云大师全集',action:'阅读篇目'},
  {id:'external:'+nanItems[2].id,title:nanItems[2].title,meta:'南怀瑾 · 著作／讲述整理',description:'从著作目录进入，了解对《金刚经》的讲述。',source:'来源：劝学网整理版',action:'查看著作'},
  {id:'book:'+books[1].id,title:books[1].title,meta:'星云大师 · 自述与回望',description:books[1].intro,source:'来源：星云大师全集',action:'查看著作'},
 ];
 const hasMore=limit<items.length;
 useEffect(()=>{if(!hasMore||!sentinel.current)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))setLimit(n=>Math.min(n+3,items.length));},{threshold:0.1});observer.observe(sentinel.current);return()=>observer.disconnect();},[limit,hasMore]);
 return <Section title="推荐内容"><div className="recommendation-feed">{items.slice(0,limit).map(item=><button className={item.id.startsWith('video:')?'feed-card feed-video':'feed-card'} key={item.id} onClick={()=>flow.push(routes(item.id))}><span className="feed-author">{item.meta.split(' · ')[0]}</span><span className="eyebrow">{item.meta.split(' · ').slice(1).join(' · ')}</span><strong>{item.title}</strong><p>{item.description}</p><span className="feed-source">{item.source}</span><span className="feed-action">{item.action}<ArrowRightIcon/></span>{item.id.startsWith('video:')&&<span className="feed-preview"><img src={'https://i.ytimg.com/vi/'+videos[0].youtube+'/hqdefault.jpg'} alt="星云大师金刚经大义讲座录像" loading="lazy"/><PlayIcon/></span>}</button>)}</div>{hasMore?<div ref={sentinel} className="feed-more"><p className="feed-end" role="status">继续向下浏览</p></div>:<p className="feed-end" role="status">已浏览全部 · 更多内容陆续整理中</p>}</Section>;
}
function Directory() {
  const [filter, setFilter] = useState('全部');
  const flow = useFlow();
  return <>
    <div className="tabs" role="tablist" aria-label="人物分类">{['全部','法师','名家'].map(item=><button key={item} role="tab" aria-selected={filter===item} onClick={()=>setFilter(item)}>{item}</button>)}</div>
    {people.filter(person=>filter==='全部'||person.type===filter).map(person=><div className="follow-row" key={person.id}>
      <button className="directory-person" onClick={()=>flow.push(routes(person.route))}><Portrait id={person.id}/><span><strong>{person.name}</strong><span>{person.label}</span></span></button><Follow id={person.id}/>
    </div>)}
  </>;
}
function Profile({route}:{route:string}){
 const person=people.find(p=>p.route===route)!;
 const [tab,setTab]=useState('精选');
 const copy=profileCopy[person.id];
 return <div className="unified-profile" data-person-id={person.id}>
  <div className="profile"><Portrait id={person.id}/><div><span className="eyebrow">{person.type}</span><h1>{person.name}</h1></div><Follow id={person.id}/></div>
  <p className="intro profile-intro">{copy.intro}</p>
  <div className="tabs profile-tabs" role="tablist" aria-label={person.name+'栏目'}>{['精选','著作','影音','生平'].map(t=><button id={'tab-'+person.id+'-'+t} role="tab" aria-controls={'panel-'+person.id} aria-selected={t===tab} key={t} onClick={()=>setTab(t)}>{t}</button>)}</div>
  <div id={'panel-'+person.id} role="tabpanel" aria-labelledby={'tab-'+person.id+'-'+tab}>
   {tab==='精选'?<><Resume personId={person.id} compact/><Section title="精选著作" action={<button className="all-people" onClick={()=>setTab('著作')}>全部著作 <ArrowRightIcon/></button>}><ProfileWorks personId={person.id} featured/></Section><Section title="精选影音" action={<button className="all-people" onClick={()=>setTab('影音')}>全部影音 <ArrowRightIcon/></button>}><ProfileVideos personId={person.id}/></Section></>:tab==='著作'?<ProfileWorks personId={person.id}/>:tab==='影音'?<ProfileVideos personId={person.id}/>:<><h2 className="profile-panel-title">生平简介</h2><p className="reading-copy">{copy.bio}</p></>}
  </div>
  <details className="source-details"><summary>资料来源</summary><p>{person.id==='nan-huaijin'?'著作样例来自劝学网整理版，非基金会官方出版版本。':person.id==='sheng-yen'?'书目以法鼓全集为依据；正文收录状态按篇目显示。':person.id==='hsing-yun'?'著作以佛光山《星云大师全集》为文字主源；讲座录像为本人开示。':'源慧师父公开主页 · 答疑解惑。'}</p><SourceLink url={person.url||(person.id==='hsing-yun'?'https://books.masterhsingyun.org/intro/master':'https://www.nhjcf.org/')}>查看资料出处</SourceLink></details>
 </div>;
}
function PendingContent({kind}:{kind:string}){return <div className="pending-content"><ReaderIcon/><strong>{kind}暂未开放</strong><p>更多内容陆续更新。</p></div>}
function ProfileWorks({personId,featured=false}:{personId:string;featured?:boolean}){
 const flow=useFlow();
 if(personId==='yuanhui')return <div className="book-list"><div className="book-row"><span className="book-index">01</span><div><span className="eyebrow">开示 · 问答</span><button className="text-button" onClick={()=>flow.push(routes('yuanhui-book'))}><strong>答疑解惑 · 第一期</strong><ArrowRightIcon/></button><p>从日常疑问中，体会师父的教导。</p></div></div></div>;
 if(personId==='hsing-yun')return <BookRows/>;
 if(personId==='nan-huaijin')return <div className="book-list">{nanItems.filter(n=>n.kind==='book').map((n,i)=><div className="book-row" key={n.id}><span className="book-index">0{i+1}</span><div><span className="eyebrow">著作 · 讲述整理</span><OpenItem id={n.id}><strong>{n.title}</strong></OpenItem><p>精选篇目</p></div></div>)}</div>;
 if(personId==='sheng-yen')return <ShengyenWorks featured={featured}/>;
 return <PendingContent kind="著作"/>;
}
function ProfileVideos({personId}:{personId:string}){
 if(personId==='hsing-yun')return <VideoRows/>;
 if(personId==='nan-huaijin')return <div className="video-list">{nanItems.filter(n=>n.kind==='video_series').map(n=><div className="chapter-row" key={n.id}><span className="eyebrow">讲课系列</span><OpenItem id={n.id}><strong>{n.title}</strong></OpenItem></div>)}</div>;
 return <PendingContent kind="影音"/>;
}
function ShengyenWorks({featured=false}:{featured?:boolean}){
 const flow=useFlow();const[category,setCategory]=useState('全部');const[query,setQuery]=useState('');const[limit,setLimit]=useState(12);
 const entries=shengyenCatalog.entries.filter(b=>(category==='全部'||b.category===category)&&(!query||b.title.includes(query)));
 const selected=featured?entries.filter(b=>['正信的佛教','學佛群疑','禪的體驗'].includes(b.title)):entries.slice(0,limit);
 return <>{!featured&&<><label className="search"><MagnifyingGlassIcon/><KeyboardInput placeholder="搜索原目录书名（繁体）" value={query} onChange={e=>{setQuery(e.target.value);setLimit(12);}}/></label><label className="select-label">著作分类<select value={category} onChange={e=>{setCategory(e.target.value);setLimit(12);}}>{['全部',...new Set(shengyenCatalog.entries.map(b=>b.category))].map(c=><option key={c}>{c}</option>)}</select></label><p className="small">{entries.length} 部著作</p></>}
 <div className="book-list">{selected.map((book,i)=>{const count=collectionArticles('sy-'+book.sourceId).length;return <div className="book-row" key={book.sourceId}><span className="book-index">{String(i+1).padStart(2,'0')}</span><div><span className="eyebrow">{book.category}</span><button className="text-button" onClick={()=>flow.push(routes('shengyen-book:'+book.sourceId))}><strong>{book.title}</strong><ArrowRightIcon/></button><p>{count?`${count} 篇可阅读`:'暂未开放阅读'}</p></div></div>;})}</div>
 {!featured&&entries.length>limit&&<button className="secondary wide" onClick={()=>setLimit(n=>n+12)}>加载更多著作</button>}{!selected.length&&<p className="empty">没有匹配的著作。</p>}</>;
}
function ShengyenBook({id}:{id:string}){
 const book=shengyenCatalog.entries.find(b=>b.sourceId===id);const flow=useFlow();if(!book)return <p>著作暂不可用</p>;
 const available=collectionArticles('sy-'+id);
 return <><span className="eyebrow">圣严法师 · {book.category}</span><h1>{book.title}</h1>
 {available.length?<><p className="small">{available.length} 篇可阅读</p><button className="primary wide" onClick={()=>flow.push(routes('reader:'+available[0].id))}>开始阅读 <ReaderIcon/></button><Section title="篇目">{available.map(c=><div className="chapter-row" key={c.id}><span className="small">第 {c.source_order} 篇 · {c.paragraph_count} 段</span><OpenItem id={c.id}/></div>)}</Section></>:<PendingContent kind="本书正文"/>}
 <details className="source-details"><summary>版本与来源</summary><p>法鼓全集 · 聖嚴法師著作</p><SourceLink url={book.catalogSourceUrl}>法鼓全集</SourceLink></details></>;
}

function SearchResults({query}:{query:string}) {
  const q=query.trim().toLowerCase();
  const matches=people.filter(p=>(p.name+p.aliases).includes(q));
  const bs=books.filter(b=>[b.title,b.title_original,b.label].join('').includes(q));
  const cs=readableArticles.filter(c=>c.title.includes(q)).slice(0,30);
  const ns=nanItems.filter(n=>n.title.includes(q));
  const flow=useFlow();
  return <Section title="搜索结果">
    {matches.map(p=><button className="row search-person" key={p.id} onClick={()=>flow.push(routes(p.route))}><strong>{p.name}</strong><span>{p.label} →</span></button>)}
    {[...bs,...ns,...cs].map(item=><div className="row" key={item.id}><OpenItem id={item.id}/></div>)}
    {!matches.length&&!bs.length&&!cs.length&&!ns.length&&<p className="empty">暂未找到，试试人物姓名或书名。篇目支持原目录繁体题名。</p>}
  </Section>;
}

function Resume({personId,compact=false}:{personId?:string;compact?:boolean}){const {state}=useLibrary();const flow=useFlow();const history=state.history.filter(h=>!personId||itemOwner(h.id)===personId);if(!history.length)return null;if(compact){const h=history[0];const chapter=chapters.find(c=>c.id===h.id);const article=articleSummary(h.id);const book=books.find(b=>b.id===(article?.book_id||chapter?.book_id||h.id));const nan=nanItems.find(n=>n.id===h.id||n.id===article?.book_id);const isVideo=videos.some(v=>v.id===h.id);const author=people.find(p=>p.id===itemOwner(h.id))?.name||'';return <section className="resume-detail" aria-label="继续浏览"><div className="resume-heading"><span><ClockIcon/>继续浏览</span><button aria-label="查看全部浏览记录" onClick={()=>flow.push(routes('history'))}>全部记录</button></div><strong className="resume-title">{itemTitle(h.id)}</strong><p className="small">{author} · {article?itemTitle(article.book_id):book?.title||(isVideo?'金刚经大义（一）':nan?.title||'著作')}</p><div className="resume-bottom"><span className="small">{isVideo?(h.kind==='video'&&h.seconds?'上次播放至 '+clock(h.seconds):'已访问 · 尚无播放进度'):(h.kind==='chapter'&&h.paragraph!==undefined?'读到第 '+(h.paragraph+1)+' 段':'最近阅读')}</span><OpenItem id={h.id}>{isVideo?'继续播放':h.kind==='chapter'&&h.paragraph!==undefined?'继续阅读':'再读本篇'}</OpenItem></div></section>;}return <Section title="继续浏览">{history.slice(0,2).map(h=><div className="resume" key={h.id}><span className="small">{h.kind==='video'&&h.seconds?'上次播放至 '+clock(h.seconds):'paragraph' in h&&typeof h.paragraph==='number'?'读到第 '+(h.paragraph+1)+' 段':'最近阅读'}</span><OpenItem id={h.id}/></div>)}</Section>}

function BookRows(){return <div className="book-list">{books.map((b,i)=><div className="book-row" key={b.id}><span className="book-index">0{i+1}</span><div><span className="eyebrow">{b.label} · 全集第 {b.volume_numbers} 册</span><OpenItem id={b.id}><strong>{b.title}</strong></OpenItem><p>{b.intro}</p></div></div>)}</div>}
function Book({id}:{id:string}){const book=books.find(b=>b.id===id);const [q,setQ]=useState('');const[volume,setVolume]=useState('');const[limit,setLimit]=useState(60);const[onlyReadable,setOnlyReadable]=useState(true);if(!book)return <p>该著作暂不可用</p>;const all=chapters.filter(c=>c.book_id===id);const readableIds=new Set(collectionArticles(id).map(a=>a.id));const groups=[...new Set(all.map(c=>c.hierarchy_original[0]||'本书目录'))];const shown=all.filter(c=>(!onlyReadable||readableIds.has(c.id))&&(!volume||(c.hierarchy_original[0]||'本书目录')===volume)&&(!q||c.title_display.includes(q)));return <><span className="eyebrow">星云大师全集 · 第 {book.volume_numbers} 册</span><h1>{book.title}</h1><p className="intro">{book.intro}</p><div className="actions"><OpenItem id={book.sample}>阅读精选篇目</OpenItem><Save id={id}/></div><label className="search"><MagnifyingGlassIcon/><KeyboardInput placeholder="搜索本书原目录" value={q} onChange={e=>setQ(e.target.value)}/></label><label className="select-label">选择册别<select value={volume} onChange={e=>setVolume(e.target.value)}><option value="">全部册别</option>{groups.map(g=><option key={g} value={g}>{catalogLabel(g)}</option>)}</select></label><div className="tabs" role="tablist" aria-label="目录范围"><button role="tab" aria-selected={onlyReadable} onClick={()=>{setOnlyReadable(true);setLimit(60);}}>可阅读</button><button role="tab" aria-selected={!onlyReadable} onClick={()=>{setOnlyReadable(false);setLimit(60);}}>全部目录</button></div><Section title="目录"><p className="small">显示 {Math.min(limit,shown.length)} / {shown.length} 项</p>{shown.slice(0,limit).map(c=><div className="chapter-row" key={c.id}><span className="small">{c.hierarchy_original.map(catalogLabel).join(' › ')||'本书'} · {c.title_original.match(/p\d+/)?.[0]}</span><OpenItem id={c.id}/><span className="small">{readableIds.has(c.id)?'可阅读':'暂未开放阅读'}</span>{c.attribution_status==='contributor_review_required'&&<span className="attribution">序文 / 编者资料</span>}</div>)}{shown.length>limit&&<button className="secondary wide" onClick={()=>setLimit(n=>n+60)}>加载更多目录（还有 {shown.length-limit} 项）</button>}{shown.length===0&&<p className="empty">没有匹配的篇目。</p>}</Section></>}
function Reading({id}:{id:string}){return <InlineReading id={id}/>;}
function InlineReading({id}:{id:string}){
 const summary=articleSummary(id);const entry=chapters.find(c=>c.id===id);
 const summaryVersion=summary?mastersTextVersion(summary):undefined;
 const flow=useFlow();const{state,dispatch}=useLibrary();const[size,setSize]=useState(18);
 const legacy=legacyArticles.find(c=>c.id===id) as MastersArticle|undefined;
 const[loaded,setLoaded]=useState<{id:string;article:MastersArticle|null;error:string}>({id,article:legacy||null,error:''});
 const[retry,setRetry]=useState(0);
 const bodyRef=useRef<HTMLDivElement>(null);const latest=useRef({state,dispatch});latest.current={state,dispatch};
 const active=flow.current.id==='chapter:'+id||flow.current.id==='reader:'+id;
 useEffect(()=>{
  if(!active||!summary)return;
  let stale=false;
  const local=legacyArticles.find(c=>c.id===id) as MastersArticle|undefined;
  if(local){setLoaded({id,article:local,error:''});return()=>{stale=true;};}
  setLoaded({id,article:null,error:''});
  readArticle(id).then(article=>{if(!stale)setLoaded({id,article,error:''});}).catch(error=>{if(!stale)setLoaded({id,article:null,error:error instanceof Error?error.message:'reader_failed'});});
  return()=>{stale=true;};
 },[id,active,retry,summaryVersion]);
 const loadedArticle=loaded.id===id?loaded.article:null;
 const article=legacy&&mastersTextVersion(legacy)===summaryVersion?legacy:loadedArticle&&mastersTextVersion(loadedArticle)===summaryVersion?loadedArticle:null;
 const textVersion=article?mastersTextVersion(article):undefined;
 useEffect(()=>{
  if(!active||!article||!bodyRef.current)return;
  const container=bodyRef.current.closest<HTMLElement>('[data-testid="mobile-scroll"]');
  const paragraphs=Array.from(bodyRef.current.querySelectorAll<HTMLElement>('article p'));
  if(!container||!paragraphs.length)return;
  const saved=latest.current.state.history.find(h=>h.id===id&&h.kind==='chapter');
  const restored=saved?.kind==='chapter'&&saved.textVersion===textVersion?Math.min(saved.paragraph??0,paragraphs.length-1):0;
  let current=restored;let frame=0;
  const save=(paragraph:number)=>latest.current.dispatch({type:'visit',id,kind:'chapter',visitedAt:Date.now(),paragraph,textVersion});
  const onScroll=()=>{
   const bounds=container.getBoundingClientRect();
   const next=paragraphs.findIndex(p=>p.getBoundingClientRect().bottom>bounds.top+12);
   const paragraph=next<0?paragraphs.length-1:next;
   if(paragraph!==current){current=paragraph;save(paragraph);}
  };
  save(restored);
  frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{
   if(restored>0){const scale=container.getBoundingClientRect().height/container.clientHeight;container.scrollTop+=(paragraphs[restored].getBoundingClientRect().top-container.getBoundingClientRect().top)/scale;}
   container.addEventListener('scroll',onScroll,{passive:true});
  });});
  return()=>{cancelAnimationFrame(frame);container.removeEventListener('scroll',onScroll);};
 },[id,active,textVersion]);
 const bookId=article?.book_id||summary?.book_id||entry?.book_id;
 const siblings=bookId?collectionArticles(bookId):[];const index=siblings.findIndex(c=>c.id===id);
 const bookRoute=bookId==='yh-dayi-001'?'yuanhui-book':bookId?.startsWith('sy-')?'shengyen-book:'+bookId.slice(3):bookId?.startsWith('nhj-')?'external:'+bookId:'book:'+bookId;
 if(!summary)return <><span className="eyebrow">{bookId?itemTitle(bookId):'著作'}</span><h1>{entry?.title_display||'篇目暂不可用'}</h1><PendingContent kind="本篇正文"/>{siblings.length>0&&<button className="primary wide" onClick={()=>flow.replace(routes('reader:'+siblings[0].id))}>阅读可读篇目</button>}<button className="secondary wide" onClick={()=>flow.push(routes(bookRoute))}>返回本书目录</button></>;
 if(!article&&loaded.error)return <><span className="eyebrow">{itemTitle(summary.book_id)}</span><h1>{summary.title}</h1><div className="pending-content" role="alert"><ReaderIcon/><strong>正文暂时无法打开</strong><p>请检查网络后重试。</p><button className="primary wide" onClick={()=>setRetry(n=>n+1)}>重试</button></div><button className="secondary wide" onClick={()=>flow.push(routes(bookRoute))}>返回本书目录</button></>;
 if(!article)return <><span className="eyebrow">{itemTitle(summary.book_id)}</span><h1>{summary.title}</h1><div className="pending-content" aria-live="polite"><ReaderIcon/><strong>正在打开正文</strong></div><button className="secondary wide" onClick={()=>flow.push(routes(bookRoute))}>返回本书目录</button></>;
 return <div ref={bodyRef} className="inline-reader" data-article-id={id}><span className="eyebrow">{itemTitle(article.book_id)}</span><h1>{article.title}</h1><p className="subtitle">{article.author} · {article.person_id==='yuanhui'?'答疑解惑':article.person_id==='nan-huaijin'?'讲述整理':'著述'}</p>
 <div className="reader-tools"><button onClick={()=>flow.push(routes(bookRoute))}><ReaderIcon/>目录</button><div role="group" aria-label="阅读字号">{[16,18,20].map(n=><button key={n} aria-label={'字号 '+n} aria-pressed={size===n} onClick={()=>setSize(n)}>{n===16?'小':n===18?'中':'大'}</button>)}</div><Save id={id}/></div>
 <article aria-label="正文" style={{fontSize:size}}>{buildReadingBlocks(article.paragraphs,(article as {figures?:MastersFigure[]}).figures??[],(article as {paragraph_roles?:string[]}).paragraph_roles).map(block=>block.type==='figure'?<ArticleFigure key={block.key} figure={block.figure}/>:<p key={'p'+block.index} data-role={block.role}>{article.person_id==='yuanhui'&&block.role&&(block.index===0||(article as {paragraph_roles?:string[]}).paragraph_roles?.[block.index-1] !== block.role)&&<span className="reader-speaker">{block.role==='question'?'读者问':'师父答'}</span>}{block.text}</p>)}</article>
 <p className="reader-finish">本篇已读完</p><div className="prev-next"><button disabled={index<=0} onClick={()=>flow.replace(routes('reader:'+siblings[index-1].id))}>上一篇</button><button onClick={()=>flow.push(routes(bookRoute))}>本书目录</button><button disabled={index<0||index>=siblings.length-1} onClick={()=>flow.replace(routes('reader:'+siblings[index+1].id))}>下一篇</button></div>
 <details className="source-details"><summary>版本与来源</summary><p>{article.attribution}</p><p>{article.source_institution}。{article.person_id==='nan-huaijin'?'此为转载整理版，非官方出版版本。':''}</p><SourceLink url={article.source_url}>资料出处</SourceLink></details>
 </div>;
}
function VideoRows(){const flow=useFlow();return <div className="video-list">{videos.map(v=><button className="video-row" key={v.id} onClick={()=>flow.current.id.startsWith('video:')?flow.replace(routes('video:'+v.id)):flow.push(routes('video:'+v.id))}><img src={'https://i.ytimg.com/vi/'+v.youtube+'/hqdefault.jpg'} alt="金刚经大义讲座录像缩略图"/><div><span className="eyebrow">本人开示 · 星云大师</span><strong>{v.title}</strong><span className="small"><PlayIcon/> {clock(v.duration)} · 讲座录像</span></div></button>)}</div>}
function Video({id}:{id:string}){const v=videos.find(x=>x.id===id);const {state,dispatch}=useLibrary();const initial=useRef((state.history.find(h=>h.id===id&&h.kind==='video') as {seconds?:number}|undefined)?.seconds||0);const [started,setStarted]=useState(false);const[status,setStatus]=useState('点击载入播放器');const [position,setPosition]=useState(initial.current);
 if(!v)return <p>视频暂不可用</p>;return <><span className="eyebrow">本人开示 · 星云大师主讲</span><h1 className="video-title">{v.title}</h1><div className="player" data-scroll-drag="ignore">{started?<YouTubePlayer videoId={v.youtube} title={v.title} startSeconds={initial.current} onStatus={setStatus} onProgress={seconds=>{setPosition(seconds);dispatch({type:'visit',id,kind:'video',visitedAt:Date.now(),seconds});}}/>:<button className="load-video" onClick={()=>{setStarted(true);setStatus('正在连接 YouTube');dispatch({type:'visit',id,kind:'video',visitedAt:Date.now()});}}><img src={`https://i.ytimg.com/vi/${v.youtube}/hqdefault.jpg`} alt="星云大师讲座视频"/><span><PlayIcon/>{initial.current>0?'从 '+clock(initial.current)+' 继续':'载入讲座视频'}</span></button>}</div><p className="play-status" aria-live="polite">{status}{position>0?' · 已记录 '+clock(position):''}</p><div className="actions"><Save id={id}/></div><p className="reading-copy">1993 年香港红馆佛学讲座 · 金刚经大义（一）</p><details className="source-details"><summary>影音来源</summary><p>ibpsradio 佛香数位网路电台 · 星云大师本人讲座录像</p><SourceLink url={`https://www.youtube.com/watch?v=${v.youtube}`}>查看来源</SourceLink></details><Section title="本场讲座"><VideoRows/></Section></>}
function LibraryPage({kind}:{kind:string}){const {state,dispatch}=useLibrary();const flow=useFlow();const[confirm,setConfirm]=useState(false);const[filter,setFilter]=useState('全部');const [q,setQ]=useState('');if(kind==='following')return <><label className="search"><MagnifyingGlassIcon/><KeyboardInput value={q} onChange={e=>setQ(e.target.value)} placeholder="搜索关注的人物"/></label>{people.filter(p=>state.following.includes(p.id)&&(!q||p.name.includes(q))).map(p=><div className="follow-row" key={p.id}><button onClick={()=>flow.push(routes(p.route))}><strong>{p.name}</strong><span>著作与影音典藏</span></button><Follow id={p.id}/></div>)}{!state.following.length&&<p className="empty">还没有关注的人物。关注后，可以从这里回到他的主页。</p>}<button className="secondary wide" onClick={()=>flow.push(routes('directory'))}>发现更多人物 <ArrowRightIcon/></button></>;
 const items=kind==='favorites'?state.favorites.map(id=>({id,kind:(videos.some(v=>v.id===id)||nanItems.some(n=>n.id===id&&n.kind==='video_series'))?'video':'chapter',visitedAt:0,seconds:undefined})):state.history;const shown=items.filter(h=>filter==='全部'||(filter==='著作'?!(h.id.startsWith('xy-video')||nanItems.some(n=>n.id===h.id&&n.kind==='video_series')):(h.id.startsWith('xy-video')||nanItems.some(n=>n.id===h.id&&n.kind==='video_series'))));return <><div className="tabs" role="tablist" aria-label="内容筛选">{['全部','著作','影音'].map(f=><button role="tab" aria-selected={filter===f} onClick={()=>setFilter(f)} key={f}>{f}</button>)}</div>{shown.length?shown.map(h=><div className="history-row" key={h.id}><div><span className="small">{h.kind==='video'?'影音':'文字'}{h.visitedAt?' · '+new Date(h.visitedAt).toLocaleDateString('zh-CN'):''}</span><OpenItem id={h.id}/>{kind==='history'&&<p className="small">{'seconds' in h&&h.seconds?'上次播放至 '+clock(h.seconds):'paragraph' in h&&typeof h.paragraph==='number'?'读到第 '+(h.paragraph+1)+' 段':'最近阅读'}</p>}</div>{kind==='history'?<button aria-label={'删除记录 '+itemTitle(h.id)} onClick={()=>dispatch({type:'remove-history',id:h.id})}><TrashIcon/></button>:<Save id={h.id}/>}</div>):<p className="empty">{kind==='favorites'?'这里还没有收藏，遇见想重读的内容时，点一下收藏。':'还没有浏览记录，读一篇文章或听一段开示吧。'}</p>}{kind==='history'&&state.history.length>0&&<button className="secondary wide" onClick={()=>setConfirm(true)}><TrashIcon/>清空浏览记录</button>}<p className="footnote">清除历史不影响关注与收藏；取消关注不影响内容收藏。</p><BottomSheet open={confirm} onOpenChange={setConfirm} title="清空浏览记录？" description="最近篇目与已保存的播放位置将被清除。关注和收藏会保留。"><button className="primary wide" onClick={()=>{dispatch({type:'clear-history'});setConfirm(false);}}>确认清空</button><button className="secondary wide" onClick={()=>setConfirm(false)}>保留记录</button></BottomSheet></>}
function ArticleFigure({figure}:{figure:MastersFigure}){
 // A figure the collector could not restore is already annotated in the text, so it renders nothing here.
 if(figure.kind==='image'){
  if(!figure.available)return null;
  return <figure className="article-figure"><img src={figure.src} alt={figure.caption||'原文插图'} loading="lazy" decoding="async"/>{figure.caption&&<figcaption>{figure.caption}</figcaption>}</figure>;
 }
 return <div className="article-table" role="group" aria-label={'资料表，共 '+figure.rows.length+' 列'}><table>{figure.rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,cellIndex)=>cell.header
  ?<th key={cellIndex} colSpan={cell.colspan} rowSpan={cell.rowspan}>{cell.text}</th>
  :<td key={cellIndex} colSpan={cell.colspan} rowSpan={cell.rowspan}>{cell.text}</td>)}</tr>)}</table></div>;
}
function SourceLink({url,children}:{url:string;children:ReactNode}){return <a className="source-link" href={url} target="_blank" rel="noopener noreferrer">{children}<ExternalLinkIcon/></a>}
function Sources(){return <><h1>每一份内容，<br/>都有来处。</h1><p className="intro">各位法师与名家的资料分别注明出处。导读由平台整理，原文及影音以所标注的来源为准。</p><Section title="人物主页来源">{people.filter(p=>p.url).map(p=><div className="source-row" key={p.id}><SourceLink url={p.url}>{p.name}</SourceLink></div>)}</Section>{sources.map(([name,url,note])=><div className="source-row" key={url}><SourceLink url={url}>{name}</SourceLink><p className="small">{note}</p></div>)}<Section title="人物图像来源"><p className="small">源慧师父、圣严法师图像来自各自官网；星云大师使用全集官网插画。南怀瑾晚年肖像来自中新网报道。</p><SourceLink url="https://www.chinanews.com.cn/cul/2012/10-23/4269724.shtml">南怀瑾肖像来源</SourceLink></Section><Section title="内容归属"><p className="reading-copy">本人著述：按作品实际作者署名。<br/>本人开示：注明实际讲者。<br/>他人朗读：作者与朗读者分别标注。<br/>研究资料：按研究者或机构署名。问答中的提问与回答分别标示。</p></Section></>}

function ExternalReading({id}:{id:string}){
 const item=nanItems.find(n=>n.id===id);const flow=useFlow();const[limit,setLimit]=useState(60);useEffect(()=>setLimit(60),[id]);if(!item)return <p>资料尚未准备</p>;
 const available=collectionArticles(id);const expanded=available.length>=60;
 return <><span className="eyebrow">南怀瑾 · {item.kind==='book'?'著作':'影音'}</span><h1>{item.title}</h1><p className="intro">{item.attribution}</p>
 {item.kind==='book'?<><p className="small">{available.length} 篇{expanded?'可阅读':'选读'}</p>{available.length>0?<><button className="primary wide" onClick={()=>flow.push(routes('reader:'+available[0].id))}>开始阅读 <ReaderIcon/></button><Section title="篇目"><p className="small">显示 {Math.min(limit,available.length)} / {available.length} 项</p>{available.slice(0,limit).map(c=><div className="chapter-row" key={c.id}><button className="text-button" onClick={()=>flow.push(routes('reader:'+c.id))}>{c.title}<ArrowRightIcon/></button></div>)}{available.length>limit&&<button className="secondary wide" onClick={()=>setLimit(n=>n+60)}>加载更多目录（还有 {available.length-limit} 项）</button>}</Section>{!expanded&&<p className="small">当前为精选篇目，非全书。</p>}</>:<PendingContent kind="本书正文"/>}</>:<PendingContent kind="本系列影音"/>}
 <Save id={id}/><details className="source-details"><summary>版本与来源</summary><p>{item.kind==='book'?'劝学网整理版，可能与纸本版本存在差异。':'系列资料来自南怀瑾文教基金会，尚未取得可在站内播放的媒体。'}</p><SourceLink url={item.source_url}>资料出处</SourceLink></details></>;
}

function YuanhuiBook(){const flow=useFlow();const available=collectionArticles('yh-dayi-001');return <><span className="eyebrow">源慧师父 · 答疑解惑</span><h1>答疑解惑 · 第一期</h1><p className="intro">从读者的提问出发，聆听师父的回答。</p><p className="small">{available.length} 篇选读</p>{available.length>0&&<button className="primary wide" onClick={()=>flow.push(routes('reader:'+available[0].id))}>开始阅读 <ReaderIcon/></button>}<Section title="篇目">{available.map(c=><div className="chapter-row" key={c.id}><OpenItem id={c.id}/></div>)}</Section><p className="small">当前为精选问答。</p></>;}
