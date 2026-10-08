/** Interleave each visible author's readings without rescanning the full corpus per item. */
export function buildMastersReadingFeed<T extends { person_id: string }>(rows: Iterable<T>, authorIds: readonly string[]): T[] {
  const buckets = new Map(authorIds.map(id => [id, [] as T[]]));
  for (const row of rows) buckets.get(row.person_id)?.push(row);
  let longest = 0;
  buckets.forEach(bucket => { longest = Math.max(longest, bucket.length); });
  const feed: T[] = [];
  for (let index = 0; index < longest; index += 1) {
    for (const id of authorIds) {
      const row = buckets.get(id)?.[index];
      if (row) feed.push(row);
    }
  }
  return feed;
}
