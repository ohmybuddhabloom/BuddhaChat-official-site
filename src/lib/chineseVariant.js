// Site-wide Simplified -> Traditional Chinese conversion with a persisted
// user preference. Source content is Simplified; "hans" mode simply restores
// the original text nodes/attributes, so no lossy round-trip conversion is
// ever needed.

const STORAGE_KEY = 'buddhachat:chinese-variant'
const DEFAULT_VARIANT = 'hant'
const CJK_RE = /[\u4e00-\u9fff]/
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'IFRAME'])
const TEXT_ATTRIBUTES = ['placeholder', 'title', 'alt', 'aria-label']
const ATTRIBUTE_SELECTOR = TEXT_ATTRIBUTES.map((attr) => `[${attr}]`).join(',')
const NO_CONVERT_SELECTOR = '[data-no-convert]'

let convertToTraditional = null
let converterPromise = null
let observer = null
let activeVariant = null

const originalTextByNode = new WeakMap()
const originalAttrsByElement = new WeakMap()
const pendingWrites = new Map()

function isValidVariant(variant) {
  return variant === 'hant' || variant === 'hans'
}

export function getChineseVariant() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isValidVariant(stored)) return stored
  } catch {
    // localStorage may be unavailable (private mode); fall through to default.
  }
  return DEFAULT_VARIANT
}

function loadConverter() {
  if (convertToTraditional) return Promise.resolve(convertToTraditional)
  if (!converterPromise) {
    converterPromise = import('opencc-js/cn2t')
      .then((mod) => {
        convertToTraditional = mod.Converter({ from: 'cn', to: 't' })
        return convertToTraditional
      })
      .catch((error) => {
        converterPromise = null
        throw error
      })
  }
  return converterPromise
}

function isSkipped(node) {
  const parent = node.parentElement
  if (!parent || SKIP_TAGS.has(parent.tagName)) return true
  return Boolean(parent.closest(NO_CONVERT_SELECTOR))
}

function collectTextNodes(root) {
  const nodes = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !CJK_RE.test(node.nodeValue)) {
        return NodeFilter.FILTER_REJECT
      }
      if (isSkipped(node)) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  while (walker.nextNode()) nodes.push(walker.currentNode)
  return nodes
}

function writeNodeValue(node, value) {
  if (node.nodeValue === value) return
  pendingWrites.set(node, value)
  node.nodeValue = value
}

function applyToTextNode(node, variant, refreshOriginal = false) {
  if (refreshOriginal || !originalTextByNode.has(node)) {
    originalTextByNode.set(node, node.nodeValue)
  }
  const original = originalTextByNode.get(node)
  const next =
    variant === 'hant' && convertToTraditional ? convertToTraditional(original) : original
  writeNodeValue(node, next)
}

function applyToAttributes(element, variant) {
  for (const attr of TEXT_ATTRIBUTES) {
    const value = element.getAttribute(attr)
    if (!value || !CJK_RE.test(value)) continue
    let record = originalAttrsByElement.get(element)
    if (!record) {
      record = {}
      originalAttrsByElement.set(element, record)
    }
    if (!(attr in record)) record[attr] = value
    const next =
      variant === 'hant' && convertToTraditional ? convertToTraditional(record[attr]) : record[attr]
    if (value !== next) element.setAttribute(attr, next)
  }
}

function applyToRoot(root, variant) {
  for (const node of collectTextNodes(root)) {
    applyToTextNode(node, variant)
  }
  if (root.nodeType === Node.ELEMENT_NODE && !root.closest(NO_CONVERT_SELECTOR)) {
    applyToAttributes(root, variant)
    for (const el of root.querySelectorAll(ATTRIBUTE_SELECTOR)) {
      if (!el.closest(NO_CONVERT_SELECTOR)) applyToAttributes(el, variant)
    }
  }
}

function handleMutations(mutations) {
  if (activeVariant !== 'hant' || !convertToTraditional) return
  for (const mutation of mutations) {
    if (mutation.type === 'characterData') {
      const node = mutation.target
      const expected = pendingWrites.get(node)
      if (expected !== undefined) {
        pendingWrites.delete(node)
        if (node.nodeValue === expected) continue
      }
      // External update (e.g. React re-render): adopt the new text as the
      // original, then convert it.
      if (node.nodeValue && CJK_RE.test(node.nodeValue) && !isSkipped(node)) {
        applyToTextNode(node, 'hant', true)
      } else {
        originalTextByNode.delete(node)
      }
      continue
    }
    for (const added of mutation.addedNodes) {
      if (added.nodeType === Node.TEXT_NODE) {
        if (added.nodeValue && CJK_RE.test(added.nodeValue) && !isSkipped(added)) {
          applyToTextNode(added, 'hant', true)
        }
      } else if (added.nodeType === Node.ELEMENT_NODE) {
        applyToRoot(added, 'hant')
      }
    }
  }
}

function startObserver() {
  if (observer || typeof MutationObserver === 'undefined') return
  observer = new MutationObserver(handleMutations)
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  })
}

function stopObserver() {
  observer?.disconnect()
  observer = null
}

function setDocumentLanguage(variant) {
  document.documentElement.setAttribute('lang', variant === 'hant' ? 'zh-Hant' : 'zh-Hans')
}

// Applies the variant to the whole document and keeps it applied to future
// DOM changes while traditional mode is active.
export async function setChineseVariant(variant) {
  if (!isValidVariant(variant)) return getChineseVariant()
  try {
    window.localStorage.setItem(STORAGE_KEY, variant)
  } catch {
    // Non-persistent environments still get the in-memory switch.
  }
  setDocumentLanguage(variant)

  if (variant === 'hant') {
    await loadConverter()
    applyToRoot(document.body, 'hant')
    activeVariant = 'hant'
    startObserver()
  } else {
    stopObserver()
    activeVariant = 'hans'
    applyToRoot(document.body, 'hans')
  }
  return variant
}

// Called once on app startup; applies the stored preference (default 繁体).
export function initChineseVariant() {
  return setChineseVariant(getChineseVariant())
}
