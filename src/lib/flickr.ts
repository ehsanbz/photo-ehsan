import { albums, type AlbumConfig } from '../config/albums';

type Text = string | { _content?: string } | undefined;
const asText = (value: Text) => typeof value === 'string' ? value : value?._content ?? '';
const asPlainText = (value: Text) => asText(value)
  .replace(/<br\s*\/?\s*>|<\/(?:p|div|li)>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, entity => ({
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ', '&#39;': "'",
  })[entity] ?? entity).trim();
const asNumber = (value: number | string | undefined, fallback = 0) => Number(value) || fallback;

interface ApiReply { stat: 'ok' | 'fail'; code?: number; message?: string }
interface PhotosetInfoReply extends ApiReply {
  photoset: { id: string; primary: string; title: Text; description: Text };
}
interface RawPhoto {
  id: string; title: string; secret: string; server: string; ispublic?: number | string;
  datetaken?: string; tags?: string;
}
interface PhotosReply extends ApiReply {
  photoset: { photo: RawPhoto[]; page: number | string; pages: number | string; total: number | string };
}
interface InfoReply extends ApiReply {
  photo: { title: Text; description: Text; dates?: { taken?: string }; tags?: { tag?: Array<{ raw?: string }> } };
}
interface SizesReply extends ApiReply {
  sizes: { size: Array<{ label: string; width: string; height: string; source: string }> };
}
interface ExifReply extends ApiReply {
  photo: { exif?: Array<{ tag: string; label?: string; clean?: Text; raw?: Text }> };
}
export interface Photo {
  id: string; title: string; description: string; date?: string; tags: string[];
  width: number; height: number; src: string; srcset: string; full: string; flickrUrl: string;
  exif?: string;
}
export interface PublishedAlbum {
  id: string; slug: string; title: string; description: string; featured: boolean;
  cover?: Photo; photos: Photo[]; showExif: boolean;
}

const endpoint = 'https://www.flickr.com/services/rest/';
const userId = () => import.meta.env.FLICKR_USER_ID || process.env.FLICKR_USER_ID;
const apiKey = () => import.meta.env.FLICKR_API_KEY || process.env.FLICKR_API_KEY;

async function call<T extends ApiReply>(method: string, params: Record<string, string>): Promise<T> {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({ method, api_key: apiKey(), format: 'json', nojsoncallback: '1', ...params }).toString();
  let lastError: Error = new Error('Unknown Flickr response');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'ehsan-photography/2.0 (photos.ehsan.bz)' }, signal: AbortSignal.timeout(20000) });
      if (!response.ok) {
        lastError = new Error(`${method}: HTTP ${response.status}`);
        if (response.status === 429 || response.status >= 500) throw lastError;
        break;
      }
      const data = await response.json() as T;
      if (data.stat === 'ok') return data;
      lastError = new Error(`${method}: Flickr error ${data.code ?? '?'} — ${data.message ?? 'unknown error'}`);
      if (data.code !== 105 && data.code !== 106) break;
    } catch (error) { lastError = error instanceof Error ? error : new Error(String(error)); }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 800));
  }
  // Never print the URL: it contains the API key.
  throw new Error(`Flickr request failed: ${lastError.message}`);
}

async function mapLimited<T, R>(list: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(list.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (cursor < list.length) { const index = cursor++; output[index] = await fn(list[index]); }
  }));
  return output;
}

export async function getPhotoset(id: string) {
  return (await call<PhotosetInfoReply>('flickr.photosets.getInfo', { photoset_id: id, user_id: userId() })).photoset;
}

export async function getPhotosetPhotos(id: string): Promise<RawPhoto[]> {
  const all: RawPhoto[] = [];
  let page = 1;
  do {
    const { photoset } = await call<PhotosReply>('flickr.photosets.getPhotos', {
      photoset_id: id, user_id: userId(), media: 'photos', per_page: '500', page: String(page),
      extras: 'date_taken,tags,o_dims',
    });
    all.push(...(photoset.photo ?? []));
    if (page >= asNumber(photoset.pages, 1)) break;
    if (page >= 100) throw new Error(`Flickr album ${id} has over 100 pages; refusing to silently truncate it.`);
    page++;
  } while (true);
  return all;
}

export async function getPhotoInfo(id: string) {
  return (await call<InfoReply>('flickr.photos.getInfo', { photo_id: id })).photo;
}

export async function getPhotoExif(id: string): Promise<string | undefined> {
  try {
    const data = (await call<ExifReply>('flickr.photos.getExif', { photo_id: id })).photo.exif ?? [];
    const value = (tag: string) => {
      const entry = data.find(item => item.tag === tag);
      return entry ? asText(entry.clean) || asText(entry.raw) : '';
    };
    const camera = [value('Make'), value('Model')].filter(Boolean).join(' ');
    return [camera, value('FocalLength'), value('FNumber'), value('ExposureTime'), value('ISO') && `ISO ${value('ISO')}`].filter(Boolean).join(' · ') || undefined;
  } catch (error) {
    console.warn(`EXIF unavailable for photo ${id}: ${error instanceof Error ? error.message : error}`);
    return undefined;
  }
}

async function hydratePhoto(raw: RawPhoto, showExif: boolean): Promise<Photo | undefined> {
  try {
    const [info, sizes, exif] = await Promise.all([
      getPhotoInfo(raw.id),
      call<SizesReply>('flickr.photos.getSizes', { photo_id: raw.id }),
      showExif ? getPhotoExif(raw.id) : Promise.resolve(undefined),
    ]);
    const candidates = (sizes.sizes.size ?? [])
      .filter(size => !/Original|Square/i.test(size.label) && size.source.startsWith('https://') && asNumber(size.width) > 0 && asNumber(size.height) > 0)
      .sort((a, b) => asNumber(a.width) - asNumber(b.width));
    if (!candidates.length) { console.warn(`No displayable size for Flickr photo ${raw.id}; skipped.`); return undefined; }
    const usable = candidates.filter(size => asNumber(size.width) <= 2048);
    const variants = [...new Map((usable.length ? usable : candidates.slice(0, 1)).map(size => [size.width, size])).values()]
      .sort((a, b) => asNumber(a.width) - asNumber(b.width));
    const thumb = variants.find(size => asNumber(size.width) >= 800) ?? variants.at(-1)!;
    const full = variants.at(-1)!;
    const title = asPlainText(info.title) || raw.title || '';
    return {
      id: raw.id, title, description: asPlainText(info.description), date: info.dates?.taken || raw.datetaken,
      tags: info.tags?.tag?.map(tag => tag.raw || '').filter(Boolean) ?? raw.tags?.split(' ').filter(Boolean) ?? [],
      width: asNumber(thumb.width), height: asNumber(thumb.height), src: thumb.source,
      srcset: variants.map(size => `${size.source} ${size.width}w`).join(', '), full: full.source,
      flickrUrl: `https://www.flickr.com/photos/${encodeURIComponent(userId())}/${encodeURIComponent(raw.id)}/`, exif,
    };
  } catch (error) {
    // A photo might have become private or been deleted between the album and detail calls.
    const message = error instanceof Error ? error.message : String(error);
    if (/Flickr error (1|2|3|4)\b|HTTP 404\b/.test(message)) {
      console.warn(`Skipping unavailable Flickr photo ${raw.id}: ${message}`);
      return undefined;
    }
    throw new Error(`Photo ${raw.id} in Flickr album could not be loaded: ${message}`);
  }
}

async function loadAlbum(config: AlbumConfig): Promise<PublishedAlbum> {
  const [info, rawPhotos] = await Promise.all([getPhotoset(config.albumId), getPhotosetPhotos(config.albumId)]);
  const mapped = await mapLimited(rawPhotos.filter(raw => String(raw.ispublic ?? 1) === '1'), 5, photo => hydratePhoto(photo, !!config.showExif));
  const photos = mapped.filter((photo): photo is Photo => !!photo);
  if (rawPhotos.length > 0 && photos.length === 0) throw new Error(`Album ${config.slug} contains photos, but none could be loaded. Refusing to publish an empty page.`);
  if (config.coverPhotoId && !photos.some(photo => photo.id === config.coverPhotoId)) throw new Error(`Cover photo ${config.coverPhotoId} is not a public photo in album ${config.slug}.`);
  const primaryId = config.coverPhotoId || info.primary;
  return {
    id: config.albumId, slug: config.slug, featured: !!config.featured,
    title: config.title || asPlainText(info.title) || config.slug,
    description: config.description ?? asPlainText(info.description),
    showExif: !!config.showExif, cover: photos.find(photo => photo.id === primaryId) ?? photos[0], photos,
  };
}

let pending: Promise<PublishedAlbum[]> | undefined;
export function getPublishedAlbums(): Promise<PublishedAlbum[]> {
  return pending ??= (async () => {
    const visible = albums.filter(album => album.visible !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    if (!visible.length) return [];
    if (!apiKey() || !userId()) throw new Error('Set FLICKR_API_KEY and FLICKR_USER_ID for configured Flickr albums.');
    const slugs = new Set<string>();
    for (const album of visible) {
      if (!album.albumId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(album.slug) || slugs.has(album.slug)) throw new Error(`Invalid or duplicate Flickr album slug: ${album.slug}`);
      slugs.add(album.slug);
    }
    return mapLimited(visible, 2, loadAlbum);
  })();
}
