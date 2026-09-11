import { mergeVisit, type Visit } from './libraryPolicy';

type PendingVisit = { entry: Visit; revision: number };
type Options = {
  persist: (entry: Visit) => Promise<void>;
  onSaved?: (entry: Visit) => void;
  onError?: (error: unknown, entry: Visit) => void;
  now?: () => number;
};

/** Serializes writes while retaining only the newest queued position per content. */
export function createVisitQueue({ persist, onSaved, onError, now = Date.now }: Options) {
  const pending = new Map<string, PendingVisit>();
  const latest = new Map<string, PendingVisit>();
  let disposed = false;
  let running = false;
  let revision = 0;
  const isCurrent = (key: string, value: PendingVisit) => !disposed && latest.get(key)?.revision === value.revision;

  async function drain() {
    if (running || disposed) return;
    running = true;
    try {
      while (!disposed && pending.size) {
        const [key, value] = pending.entries().next().value!;
        pending.delete(key);
        let failed = false;
        let error: unknown;
        try { await persist(value.entry); }
        catch (reason) { failed = true; error = reason; }
        if (isCurrent(key, value)) {
          // Callback exceptions must not strand unrelated pending visits.
          try {
            if (failed) onError?.(error, value.entry);
            else onSaved?.(value.entry);
          } catch { /* Persistence result remains independent of UI callback failures. */ }
        }
      }
    } finally { running = false; }
  }

  return {
    enqueue(input: Omit<Visit, 'visitedAt'> & { visitedAt?: number }) {
      if (disposed) return;
      const entry: Visit = { ...input, visitedAt: input.visitedAt ?? now() };
      const key = `${entry.kind}:${entry.contentId}`;
      const previous = latest.get(key);
      const merged = mergeVisit(previous?.entry, entry);
      if (previous && entry.visitedAt < previous.entry.visitedAt) return;
      const value = { entry: merged, revision: ++revision };
      latest.set(key, value);
      pending.set(key, value);
      void drain();
    },
    dispose() {
      disposed = true;
      pending.clear();
      latest.clear();
    },
  };
}
