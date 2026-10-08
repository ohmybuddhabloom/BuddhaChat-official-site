export const people = [
  { id: 'yuanhui', hidden: true, name: '源慧师父', portrait: 'https://yuanhui.buddhachat.online/assets/images/topics/yuanhui/hero-mobile-v3.avif', aliases: '源慧法师源慧法師', type: '法师', label: '个人主页', route: 'yuanhui', url: 'https://yuanhui.buddhachat.online/' },
  { id: 'sheng-yen', name: '圣严法师', portrait: 'https://www.shengyen.org/images/bio/bio-1.png', aliases: '聖嚴法師', type: '法师', label: '中文著作典藏', route: 'shengyen', url: 'https://ddc.shengyen.org/' },
  { id: 'hsing-yun', name: '星云大师', portrait: 'https://books.masterhsingyun.org/images/banner/HsingYun.png', aliases: '星雲大師', type: '法师', label: '著作与影音典藏', route: 'person', url: '' },
  { id: 'nan-huaijin', name: '南怀瑾', portrait: 'https://www.chinanews.com.cn/cul/2012/10-23/U397P4T8D4269724F107DT20121023144005.jpg', aliases: '南懷瑾', type: '名家', label: '名家典藏', route: 'nan', url: '' },
  {"id": "xu-yun", "name": "虚云老和尚", "portrait": "https://www.bfnn.org/hsuyun/images/photo01.jpg", "aliases": "虚云和尚虛雲老和尚德清", "type": "法师", "label": "禅修与法汇", "route": "xuyun", "url": "https://yjsfj.pusa123.com/pusa/ldzs/6249.shtml"},
  {"id": "hong-yi", "name": "弘一法师", "portrait": "https://www.bfnn.org/hungyi/images/photo01.jpg", "aliases": "弘一大师弘一大師李叔同李息霜演音", "type": "法师", "label": "律学与著述", "route": "hongyi", "url": "https://www.bfnn.org/hungyi/article.htm"},
  // Keep discovery disabled until reviewed text, portrait and media pass staging acceptance.
  {"id": "yin-shun", "name": "印顺老和尚", "aliases": "印顺导师 印顺法师 印順導師 印順法師 印順老和尚 張鹿芹 张鹿芹 盛正", "type": "法师", "label": "佛学著作与生平", "route": "yinshun", "url": "https://www.yinshun.org.tw/", "portrait": "", "hidden": true},
];

// Temporary public discovery visibility; canonical content and personal records remain intact.
export const visiblePeople = people.filter(person => !person.hidden);
