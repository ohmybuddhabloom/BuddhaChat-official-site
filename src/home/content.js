// 官网首页的全部文案和图片路径（2026-11-11 起取代编辑器的 scene.json）。
// 改文字、换图片只改这里；位置由 src/home/home.css 的版式决定。
// 图片按显示尺寸出两档，见 scripts/build-home-images.sh。

export const HOME_NAV = {
  "logo": "Buddha Chat",
  "links": [
    {
      "label": "The Path",
      "href": "#path"
    },
    {
      "label": "The App",
      "href": "#sanctuary"
    },
    {
      "label": "Proverb",
      "href": "#vessels"
    },
    {
      "label": "Story",
      "href": "#silence"
    },
    {
      "label": "Videos",
      "href": "/videos"
    },
    {
      "label": "Sutra",
      "href": "/sutra"
    },
    {
      "label": "Download",
      "href": "/download"
    },
    {
      "label": "Sign in",
      "href": "/login"
    },
    {
      "label": "Music",
      "href": "/music"
    }
  ]
}

export const HOME_HERO = {
  "title": "Buddha Chat",
  "subtitle": "Ask the Buddha, hear living masters, and keep a daily practice. One quiet app for the path.",
  "primaryAction": { "label": "Ask the Buddha", "href": "#dialogue" },
  "secondaryAction": { "label": "Download the app", "href": "/download" }
}

// 首屏四个时段（2026-11-11 金箔奶油改版）：只换首屏的光色，不加载任何图片。
// 打开时按访客本地时间自动选（home.html 里的内联脚本，与 timeOfDay.js 同一规则），左下角可切换。
export const HOME_TIMES = {
  "label": "Time of practice",
  "nowLabel": "Now practicing",
  "items": [
    { "key": "dawn", "number": "01", "label": "Dawn", "practice": "Morning chant" },
    { "key": "day", "number": "02", "label": "Day", "practice": "Sutra reading" },
    { "key": "dusk", "number": "03", "label": "Dusk", "practice": "Evening bell" },
    { "key": "night", "number": "04", "label": "Night", "practice": "Lamp meditation" }
  ]
}

export const HOME_DIALOGUE = {
  "kicker": "Quiet Dialogue",
  "title": "Place a question into the hush.",
  "note": "",
  "placeholder": "Ask Buddha a question...",
  "actionLabel": "Offer",
  "responseLabel": "BuddhaChat",
  "responseText": "Your guardian Buddha answers in the BuddhaChat app, with a reply written for your question.",
  "responseLinkLabel": "Continue in the app",
  "responseLinkHref": "/download",
  "responseDelayMs": 420,
  "fadeDurationMs": 320
}

export const HOME_JOURNAL = {
  "actionLabel": "Read Narrative",
  "items": [
    {
      "slug": "a-life-in-thangka",
      "title": "Life in Thangka",
      "tag": "Sacred Art",
      "description": "Prakash Khadgi has devoted his life to Thangka, carrying a sacred artistic tradition into the present with quiet conviction.",
      "card": "/home/journal-thangka-card",
      "background": "/home/journal-thangka-bg",
      "backgroundWide": 1920
    },
    {
      "slug": "journey-of-amethyst",
      "title": "Journey of Amethyst",
      "tag": "Healing Stone",
      "description": "A journey through Nepal reveals amethyst as more than a stone, becoming a vessel for calm, healing, and inward listening.",
      "card": "/home/journal-amethyst-card",
      "background": "/home/journal-amethyst-bg",
      "backgroundWide": 1600
    },
    {
      "slug": "children-of-scripture",
      "title": "Children of Scripture",
      "tag": "Scripture & Childhood",
      "description": "In a quiet courtyard in Kathmandu, children have spent twenty years writing their way toward focus, calm, and a different future.",
      "card": "/home/journal-scripture-card",
      "background": "/home/journal-scripture-bg",
      "backgroundWide": 1920
    }
  ]
}

export const HOME_FEATURES = [
  {
    "number": "01 /  Buddha",
    "title": "Whispers to the Buddha",
    "description": "Share your burdens with the Buddha. Whether it concerns health, career, or wealth, every sigh is embraced by a dedicated guardian deity. We offer no generic platitudes—only compassionate guidance tailored to your unique state of soul."
  },
  {
    "number": "02 / Masters",
    "title": "Guidance from the Masters",
    "description": "Beyond the screen, connect with enlightened masters and sages from the real world. Transcend geographic boundaries to hear insights from decades of practice, gaining profound guidance to navigate the fog of modern life."
  },
  {
    "number": "03 / The Path",
    "title": "The Shared Path",
    "description": "You are never alone on the path. Enter exclusive digital sanctuaries to chant, tap the temple block, and perform daily deeds alongside kindred spirits. Witness the power of shared intention as solitary effort blossoms into collective resonance."
  }
]

export const HOME_SHOWCASE = {
  "kicker": "A Sacred Digital Experience",
  "title": "The Digital Sanctuary.",
  "lead": "Reconnect with your inner stillness. BuddhaChat brings the Buddha’s wisdom, living masters, and daily practice into one calm, beautifully crafted app.",
  "primaryActionLabel": "Download Now",
  "phones": [
    {
      "key": "left",
      "image": "/home/phone-master-updates-480.webp",
      "alt": "BuddhaChat master updates",
      "layout": "left"
    },
    {
      "key": "center",
      "image": "/home/phone-home-480.webp",
      "alt": "BuddhaChat home screen",
      "layout": "center"
    },
    {
      "key": "right",
      "image": "/home/phone-qa-detail-480.webp",
      "alt": "BuddhaChat question and answer detail",
      "layout": "right"
    }
  ]
}

export const HOME_PRESENCE = {
  "ghostLabel": "PRESENCE",
  "imageAlt": "Abstract Light",
  "text": "\"A single seed brings a vast harvest; blessings ripple from every gift.\"",
  "studioLabel": "Eko dānaḥ sahasraphalaṃ dadāti; dānāt puṇyaṃ prajāyate.",
  "studioText": "--- From 《Madhyama Āgama》"
}

export const HOME_FOOTER = {
  "titleLine1": "Seek and it is given",
  "titleLine2": "",
  "ctaLabel": "Download BuddhaChat",
  "copyrightLine1": "© 2026 BuddhaChat.",
  "copyrightLine2": "All rights reserved.",
  "ctaHref": "/download"
}
