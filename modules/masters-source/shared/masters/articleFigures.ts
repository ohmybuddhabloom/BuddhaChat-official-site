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
    return {
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
): MastersReadingBlock[] {
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

/** True when the article needs the reader's figure rendering to be complete. */
export function hasFigures(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}
