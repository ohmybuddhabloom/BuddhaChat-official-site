// Inline figures and data tables of a reviewed masters article.
//
// The batches publish an ordered `figures` array beside `paragraphs`. Both travel inside the versioned
// body (the database keeps them in the article metadata), so this module is the single place that
// validates their shape and turns them into a render order for the reader.
//
// Product contract: docs/product-plans/masters-figure-inline-contract.md.

export type MastersTableCell = {
  text: string;
  header: boolean;
  colspan: number;
  rowspan: number;
};

export type MastersImageFigure =
  | {
    after_paragraph: number;
    kind: 'image';
    available: true;
    src: string;
    caption: string;
    bytes: number;
    sha256: string;
    width?: number;
    height?: number;
  }
  | {
    after_paragraph: number;
    kind: 'image';
    available: false;
    src: null;
    caption: string;
  };

export type MastersTableFigure = {
  after_paragraph: number;
  kind: 'table';
  available: true;
  rows: MastersTableCell[][];
};

export type MastersFigure = MastersImageFigure | MastersTableFigure;

export type MastersReadingBlock =
  | { type: 'paragraph'; index: number; text: string; role?: string }
  | { type: 'figure'; key: string; figure: MastersFigure };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSpan(value: unknown) {
  return Number.isInteger(value) && (value as number) >= 1;
}

function parseTableRows(value: unknown): MastersTableCell[][] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Invalid figure rows');
  return value.map(row => {
    if (!Array.isArray(row) || row.length === 0) throw new Error('Invalid figure row');
    return row.map(cell => {
      if (!isObject(cell) || typeof cell.text !== 'string' || typeof cell.header !== 'boolean' ||
          !isSpan(cell.colspan) || !isSpan(cell.rowspan)) throw new Error('Invalid figure cell');
      return { text: cell.text, header: cell.header, colspan: cell.colspan as number, rowspan: cell.rowspan as number };
    });
  });
}

/**
 * Validate the published `figures` of one article. Absent figures are an empty list; a present but
 * malformed list is rejected rather than rendered, because a figure described wrongly is worse than a
 * figure that is visibly missing.
 */
export function parseArticleFigures(value: unknown, paragraphCount: number): MastersFigure[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error('Invalid figures');
  return value.map(entry => {
    if (!isObject(entry)) throw new Error('Invalid figure');
    const after = entry.after_paragraph;
    if (!Number.isInteger(after) || (after as number) < 0 || (after as number) > paragraphCount) {
      throw new Error('Invalid figure position');
    }
    if (entry.kind === 'table') {
      if (entry.available !== true) throw new Error('Invalid table availability');
      return { after_paragraph: after as number, kind: 'table' as const, available: true as const, rows: parseTableRows(entry.rows) };
    }
    if (entry.kind !== 'image') throw new Error('Invalid figure kind');
    if (typeof entry.available !== 'boolean' || typeof entry.caption !== 'string') throw new Error('Invalid figure');
    if (!entry.available) {
      if (entry.src !== null) throw new Error('Invalid unavailable figure');
      return { after_paragraph: after as number, kind: 'image' as const, available: false as const, src: null, caption: entry.caption };
    }
    if (typeof entry.src !== 'string' || !entry.src.startsWith('https://')) throw new Error('Invalid figure source');
    if (!Number.isInteger(entry.bytes) || (entry.bytes as number) <= 0) throw new Error('Invalid figure size');
    if (typeof entry.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(entry.sha256)) throw new Error('Invalid figure digest');
    const hasDimensions = entry.width !== undefined || entry.height !== undefined;
    if (hasDimensions && (!Number.isInteger(entry.width) || (entry.width as number) <= 0 ||
        !Number.isInteger(entry.height) || (entry.height as number) <= 0)) throw new Error('Invalid figure dimensions');
    return {
      ...(hasDimensions ? { width: entry.width as number, height: entry.height as number } : {}),
      after_paragraph: after as number, kind: 'image' as const, available: true as const, src: entry.src,
      caption: entry.caption, bytes: entry.bytes as number, sha256: entry.sha256,
    };
  });
}

/**
 * Reading order for the rendered article. A figure with `after_paragraph === n` follows paragraph
 * `n - 1`, so an index of `0` places it before the first paragraph and an index equal to the paragraph
 * count places it after the last one. Paragraph indices stay their review/summary indices, which is what
 * the reading-position anchors are keyed by.
 */
export function buildReadingBlocks(
  paragraphs: readonly string[],
  figures: readonly MastersFigure[],
  roles?: readonly string[],
  groups?: readonly number[][],
): MastersReadingBlock[] {
  if (groups) return buildGroupedReadingBlocks(paragraphs, figures, groups);
  const blocks: MastersReadingBlock[] = [];
  for (let index = 0; index <= paragraphs.length; index += 1) {
    figures.forEach((figure, order) => {
      if (figure.after_paragraph !== index) return;
      blocks.push({ type: 'figure', key: `f${index}:${order}`, figure });
    });
    if (index < paragraphs.length) {
      const role = roles?.[index];
      blocks.push({ type: 'paragraph', index, text: paragraphs[index], ...(role ? { role } : {}) });
    }
  }
  return blocks;
}

/**
 * Same reading order when source lines are regrouped into paragraphs (see sourceLines.ts). A block's
 * `index` is the first source line of its group, so reading positions stay in source-line space. A
 * figure anchored before the group's first line comes before the group; one anchored inside the
 * group follows the whole group, so a paragraph is never split. `paragraphs` may be a partial
 * translation: only groups whose first line has text are shown.
 */
function buildGroupedReadingBlocks(
  paragraphs: readonly string[],
  figures: readonly MastersFigure[],
  groups: readonly number[][],
): MastersReadingBlock[] {
  const blocks: MastersReadingBlock[] = [];
  const pushFigures = (test: (after: number) => boolean) => figures.forEach((figure, order) => {
    if (figure.after_paragraph <= paragraphs.length && test(figure.after_paragraph)) {
      blocks.push({ type: 'figure', key: `f${figure.after_paragraph}:${order}`, figure });
    }
  });
  for (const group of groups) {
    const first = group[0];
    const last = group[group.length - 1];
    if (first >= paragraphs.length) break;
    pushFigures(after => after === first);
    const pieces = group.filter(line => line < paragraphs.length).map(line => paragraphs[line]);
    blocks.push({ type: 'paragraph', index: first, text: joinSourceLines(pieces) });
    pushFigures(after => after > first && after <= last);
  }
  const covered = groups.length ? groups[groups.length - 1][groups[groups.length - 1].length - 1] + 1 : 0;
  pushFigures(after => after >= covered && after === paragraphs.length);
  return blocks;
}

/** True when the article needs the reader's figure rendering to be complete. */
export function hasFigures(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

/** Reviewed pixel dimensions preserve tall plates at their natural aspect ratio. */
export function figureImageAspectStyle(figure: MastersImageFigure) {
  return figure.available && figure.width && figure.height
    ? { height: undefined, aspectRatio: figure.width / figure.height }
    : undefined;
}

// ---- Source-line regrouping ----

/**
 * Yin Shun's texts are stored one printed source line per paragraph (the import keeps the original
 * line breaks as review evidence), so a sentence can be split across several "paragraphs". This
 * module groups those lines back into reading paragraphs for display only: stored text, text
 * versions, paragraph indices in history and figure anchors all stay in source-line space.
 *
 * Rules, judged against the usual full line width of the nearby lines:
 * - a full line, or the first line of a paragraph (printed with a two-character indent that the
 *   import stripped, so it is up to two characters shorter), continues into the next line;
 * - a line ending in a comma, enumeration comma or an opening bracket always continues, and so
 *   does a line longer than 60% of the full width that stops without any punctuation;
 * - a non-first line up to two characters short ends the paragraph only after terminal punctuation;
 * - shorter lines (headings, paragraph ends) end the paragraph;
 * - a short unpunctuated line after a finished sentence is a heading and starts a new paragraph;
 * - verse lines (columns separated by ideographic spaces) stand alone, and every original or
 *   editorial note line starts its own paragraph.
 */
const terminal = ['。', '！', '？', '」', '』', '）', '；', '：', '…'];
const continuing = ['，', '、', '（', '「', '『'];
const verse = (line: string) => line.includes('\u3000\u3000');
// Trailing reviewer markers such as 〔官方電子版編校注3〕 say nothing about where the sentence ends.
const bare = (line: string) => line.replace(/(〔[^〔〕]*〕)+$/, '');
const punctuated = (line: string) => /[。！？」』）；：…，、（「『〕\].!?:;,)]$/.test(bare(line));
const noteStart = (line: string) => /^〔(原刊注|編校注|官方電子版編校注)/.test(line);

function modeWidth(lines: readonly string[], from: number, to: number, minimum: number) {
  const counts = new Map<number, number>();
  for (let i = Math.max(0, from); i <= Math.min(lines.length - 1, to); i += 1) {
    const length = Array.from(lines[i]).length;
    if (length >= 10 && !verse(lines[i])) counts.set(length, (counts.get(length) ?? 0) + 1);
  }
  let best = 0;
  let bestCount = 0;
  counts.forEach((count, length) => {
    if (count > bestCount || (count === bestCount && length > best)) { best = length; bestCount = count; }
  });
  return bestCount >= minimum ? best : 0;
}

/** Groups of consecutive source-line indices; every index appears exactly once, in order. */
export function sourceLineGroups(lines: readonly string[]): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  // Usual full width nearby (indented quotations are narrower); the whole text decides when the
  // neighbourhood is too sparse to tell.
  const overall = modeWidth(lines, 0, lines.length - 1, 1);
  const fullAt = (index: number) => modeWidth(lines, index - 6, index + 6, 3) || overall;
  const close = () => { if (current.length) groups.push(current); current = []; };
  lines.forEach((line, index) => {
    if (verse(line) || noteStart(line)) close();
    if (verse(line)) { groups.push([index]); return; }
    const start = current.length === 0;
    current.push(index);
    const next = lines[index + 1];
    if (next === undefined || verse(next) || noteStart(next)) { close(); return; }
    const length = Array.from(line).length;
    const full = fullAt(index);
    // A short unpunctuated line after a finished sentence is a heading, not the paragraph's tail.
    if (terminal.some(mark => bare(line).endsWith(mark)) && full && Array.from(next).length < full - 2 && !punctuated(next)) { close(); return; }
    if (continuing.some(mark => bare(line).endsWith(mark))) return;
    // A long line that stops mid-sentence (no punctuation at all) is never a paragraph end.
    if (full && !punctuated(line) && length >= full * 0.6) return;
    if (full && length >= full) return;
    if (full && length >= full - 2 && (start || !terminal.some(mark => bare(line).endsWith(mark)))) return;
    close();
  });
  close();
  return groups;
}

const cjk = (char: string | undefined) => !!char && char.codePointAt(0)! >= 0x2e80;

/** Joins pieces of one paragraph: no space between CJK text, one space between Latin words. */
export function joinSourceLines(pieces: readonly string[]): string {
  return pieces.reduce((text, piece) => {
    if (!text) return piece;
    const before = text.slice(-1);
    const after = Array.from(piece)[0];
    return text + (!cjk(before) && !cjk(after) && /\S/.test(before) && /\S/.test(after ?? '') ? ' ' : '') + piece;
  }, '');
}

/** Only Yin Shun's line-preserving corpus is regrouped; every other article keeps its paragraphs. */
export function readingLineGroups(article: { person_id?: string; paragraphs: readonly string[] }) {
  return article.person_id === 'yin-shun' ? sourceLineGroups(article.paragraphs) : undefined;
}

/** The first source line of the group that holds `line`, for restoring a saved reading position. */
export function groupStartForLine(groups: readonly number[][] | undefined, line: number) {
  if (!groups) return line;
  for (const group of groups) if (line >= group[0] && line <= group[group.length - 1]) return group[0];
  return line;
}
