export function emptyState() {
  return { following: [], favorites: [], history: [] }
}

const validId = (id) => typeof id === 'string' && id.trim().length > 0
const validSeconds = (seconds) => typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0
const validTime = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0

function historyEntry(value) {
  if (!value || !validId(value.id) || !['chapter', 'video'].includes(value.kind) || !validTime(value.visitedAt)) return null
  const entry = { id: value.id, kind: value.kind, visitedAt: value.visitedAt }
  if (entry.kind === 'video' && validSeconds(value.seconds)) entry.seconds = value.seconds
  if (entry.kind === 'chapter' && validId(value.textVersion)) {
    entry.textVersion = value.textVersion
    if (Number.isSafeInteger(value.paragraph) && value.paragraph >= 0) entry.paragraph = value.paragraph
  }
  return entry
}

export function sanitizeState(raw) {
  const state = emptyState()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return state
  for (const field of ['following', 'favorites']) {
    if (Array.isArray(raw[field])) state[field] = [...new Set(raw[field].filter(validId))]
  }
  if (Array.isArray(raw.history)) {
    const entries = raw.history.map(historyEntry).filter(Boolean).sort((a, b) => b.visitedAt - a.visitedAt)
    const seen = new Set()
    state.history = entries.filter((entry) => {
      if (seen.has(entry.id)) return false
      seen.add(entry.id)
      return true
    }).slice(0, 100)
  }
  return state
}

export function reduceState(raw, action) {
  const state = sanitizeState(raw)
  if (!action || typeof action !== 'object') return state
  if (action.type === 'clear-history') return { ...state, history: [] }
  if (!validId(action.id)) return state
  if (action.type === 'toggle-follow' || action.type === 'toggle-favorite') {
    const field = action.type === 'toggle-follow' ? 'following' : 'favorites'
    return { ...state, [field]: state[field].includes(action.id) ? state[field].filter((id) => id !== action.id) : [...state[field], action.id] }
  }
  if (action.type === 'remove-history') return { ...state, history: state.history.filter((entry) => entry.id !== action.id) }
  if (action.type === 'visit') {
    const entry = historyEntry(action)
    if (!entry) return state
    const previous = state.history.find((item) => item.id === entry.id && item.kind === entry.kind)
    if (entry.kind === 'video' && entry.seconds === undefined && previous?.seconds !== undefined) entry.seconds = previous.seconds
    if (entry.kind === 'chapter' && entry.paragraph === undefined && entry.textVersion && entry.textVersion === previous?.textVersion && previous.paragraph !== undefined) entry.paragraph = previous.paragraph
    return { ...state, history: [entry, ...state.history.filter((item) => item.id !== entry.id)].slice(0, 100) }
  }
  return state
}
