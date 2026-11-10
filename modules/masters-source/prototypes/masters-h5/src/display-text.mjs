// Display-only formatting; original catalog values remain untouched for filtering and provenance.
export function catalogLabel(value) {
  const text=String(value||'').trim();
  const volume=text.match(/^(\d{3})([^\d]+?)(\d+)$/u);
  if(volume)return `${volume[2]} · 第 ${Number(volume[3])} 册（全集第 ${Number(volume[1])} 册）`;
  const page=text.match(/^p(\d+)\s+(.+)$/u);
  return page?`${page[2]} · 第 ${Number(page[1])} 页`:text;
}
