import nanVideos from './nan-videos.json';

export type MastersMediaKind = 'teaching' | 'interview' | 'memorial' | 'reading' | 'recitation' | 'demonstration';
export type MastersVideo = {
  id: string; person_id: string; title: string; youtube: string; duration: number;
  media_kind?: MastersMediaKind; series_id?: string; series_title?: string;
  attribution?: string; source_institution?: string; source_url?: string;
  requires_native_acceptance?: boolean;
};

export const videos: MastersVideo[] = [
  { id: 'xy-video-W4438geBhss', person_id: 'hsing-yun', title: '金刚经大义（一）· 第 1 段', youtube: 'W4438geBhss', duration: 506 },
  { id: 'xy-video-6J17zQh5tbU', person_id: 'hsing-yun', title: '金刚经大义（一）· 第 2 段', youtube: '6J17zQh5tbU', duration: 459 },
  ...nanVideos as MastersVideo[],
];

export const mediaKindLabels: Record<MastersMediaKind, string> = {
  teaching: '本人讲课', interview: '他人访谈与回忆', memorial: '纪念资料', reading: '他人朗读',
  recitation: '本人诵读', demonstration: '本人示范教程',
};

export function getMastersVideoMetadata(video: MastersVideo) {
  return {
    mediaKind: video.media_kind ?? 'teaching',
    attribution: video.attribution ?? '星云大师本人讲座录像',
    sourceInstitution: video.source_institution ?? 'ibpsradio 佛香数位网路电台',
    sourceUrl: video.source_url ?? `https://www.youtube.com/watch?v=${video.youtube}`,
    seriesId: video.series_id ?? 'hsing-yun-jingang-1993',
    seriesTitle: video.series_title ?? '金刚经大义（一）',
  };
}

export function getMastersVideoSeries(video: MastersVideo) {
  const seriesId = getMastersVideoMetadata(video).seriesId;
  return videos.filter(item => item.person_id === video.person_id && getMastersVideoMetadata(item).seriesId === seriesId);
}

export function getMastersVideoGroups(personId: string) {
  const groups: Array<{ id: string; title: string; kind: MastersMediaKind; videos: MastersVideo[] }> = [];
  for (const video of videos.filter(item => item.person_id === personId)) {
    const metadata = getMastersVideoMetadata(video);
    const group = groups.find(item => item.id === metadata.seriesId && item.kind === metadata.mediaKind);
    if (group) group.videos.push(video);
    else groups.push({ id: metadata.seriesId, title: metadata.seriesTitle, kind: metadata.mediaKind, videos: [video] });
  }
  return groups;
}
