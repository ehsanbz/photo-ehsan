import { albums, flickrUserId, type AlbumConfig } from '../config/albums';

interface FeedItem {
  title?: string;
  link?: string;
  media?: { m?: string };
  date_taken?: string;
  description?: string;
  published?: string;
  author_id?: string;
  tags?: string;
}
interface AlbumFeed {
  title?: string;
  description?: string;
  items?: FeedItem[];
}
export interface Photo {
  id: string;
  title: string;
  description: string;
  date?: string;
  tags: string[];
  width: number;
  height: number;
  src: string;
  srcset: string;
  full: string;
  fallback: string;
  flickrUrl: string;
}
export interface PublishedAlbum {
  id: string;
  slug: string;
  title: string;
  description: string;
  featured: boolean;
  cover?: Photo;
  photos: Photo[];
}

function plainText(html = ''): string {
  const entities: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&apos;': "'", '&#39;': "'", '&nbsp;': ' ',
  };
  return html.replace(/<br\s*\/?\s*>|<\/(?:p|div|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, entity => entities[entity] ?? entity)
    .replace(/\n\s*\n\s*\n/g, '\n\n').trim();
}

function photoDescription(html = ''): string {
  // Flickr's feed always prepends two attribution/image paragraphs.
  const withoutWrapper = html
    .replace(/^\s*<p>.*?posted a photo:<\/p>/is, '')
    .replace(/^\s*<p>\s*<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>\s*<\/p>/is, '');
  return plainText(withoutWrapper);
}

async function getAlbumFeed(albumId: string): Promise<AlbumFeed> {
  const url = new URL('https://api.flickr.com/services/feeds/photoset.gne');
  url.search = new URLSearchParams({
    set: albumId,
    nsid: flickrUserId,
    format: 'json',
    nojsoncallback: '1',
  }).toString();
  let lastError: Error = new Error('Unknown feed error');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ehsan-photography/2.1 (photos.ehsan.bz)' },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
        if (response.status !== 429 && response.status < 500) break;
      } else {
        const feed = await response.json() as AlbumFeed;
        if (typeof feed.title !== 'string' || !Array.isArray(feed.items)) {
          throw new Error('Unexpected feed response');
        }
        return feed;
      }
    } catch (error) { lastError = error instanceof Error ? error : new Error(String(error)); }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 900 * (attempt + 1)));
  }
  throw new Error(`Flickr album feed ${albumId} failed: ${lastError.message}`);
}

function variant(source: string, suffix: 'n' | 'z' | 'c' | 'b'): string {
  // Flickr documents that all sizes up to 1024px use the same photo secret.
  return source.replace(/_m\.(jpe?g|png|gif)$/i, `_${suffix}.$1`);
}

function photoFromFeed(item: FeedItem): Photo | undefined {
  if (item.author_id !== flickrUserId || !item.media?.m || !item.link) return undefined;
  const media = new URL(item.media.m);
  const link = new URL(item.link);
  if (media.protocol !== 'https:' || media.hostname !== 'live.staticflickr.com' ||
    link.protocol !== 'https:' || link.hostname !== 'www.flickr.com') return undefined;
  const id = link.pathname.match(/^\/photos\/[^/]+\/(\d+)(?:\/|$)/)?.[1];
  if (!id || !/_m\.(jpe?g|png|gif)$/i.test(media.pathname)) return undefined;
  const size = item.description?.match(/<img\b[^>]*\bwidth="(\d+)"[^>]*\bheight="(\d+)"/i);
  const width = Number(size?.[1]) || 240;
  const height = Number(size?.[2]) || 160;
  const title = /^(_?MG_|IMG_|PXL_|DSC_|DSCF|\d{8}_)/i.test(item.title || '') ? '' : plainText(item.title);
  const src = variant(media.href, 'c');
  const displayWidth = (longEdge: number) => Math.round(longEdge * Math.min(1, width / height));
  return {
    id, title: title || '', description: photoDescription(item.description),
    date: item.date_taken, tags: item.tags?.split(/\s+/).filter(Boolean) ?? [],
    width, height, src, fallback: media.href, full: variant(media.href, 'b'),
    srcset: [
      `${variant(media.href, 'n')} ${displayWidth(320)}w`,
      `${variant(media.href, 'z')} ${displayWidth(640)}w`,
      `${src} ${displayWidth(800)}w`,
    ].join(', '),
    flickrUrl: link.href,
  };
}

async function loadAlbum(config: AlbumConfig): Promise<PublishedAlbum> {
  const feed = await getAlbumFeed(config.albumId);
  const photos = (feed.items ?? []).map(photoFromFeed)
    .filter((photo): photo is Photo => !!photo);
  if (feed.items?.length && !photos.length) {
    throw new Error(`Album ${config.slug} has feed items but no valid public photographs.`);
  }
  if (config.coverPhotoId && !photos.some(photo => photo.id === config.coverPhotoId)) {
    throw new Error(`Cover photo ${config.coverPhotoId} is absent from the limited public feed for ${config.slug}.`);
  }
  if (feed.items?.length === 20) {
    console.warn(`Album ${config.slug} returned 20 feed items. Flickr feeds have no documented pagination; older photos may be absent.`);
  }
  if (config.photoOrder?.length) {
    const missing = config.photoOrder.filter(id => !photos.some(photo => photo.id === id));
    if (missing.length) console.warn(`Album ${config.slug}: ordered photo IDs absent from the feed: ${missing.join(', ')}`);
    const position = new Map(config.photoOrder.map((id, index) => [id, index]));
    photos.sort((a, b) => (position.get(a.id) ?? Infinity) - (position.get(b.id) ?? Infinity));
  }
  const feedTitle = feed.title?.replace(/^Content from\s+/i, '').trim();
  return {
    id: config.albumId, slug: config.slug, featured: !!config.featured,
    title: config.title || plainText(feedTitle) || config.slug,
    description: config.description ?? plainText(feed.description),
    cover: photos.find(photo => photo.id === config.coverPhotoId) ?? photos[0],
    photos,
  };
}

let pending: Promise<PublishedAlbum[]> | undefined;
export function getPublishedAlbums(): Promise<PublishedAlbum[]> {
  return pending ??= (async () => {
    const visible = albums.filter(album => album.visible !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const slugs = new Set<string>();
    const ids = new Set<string>();
    for (const album of visible) {
      if (!/^\d+$/.test(album.albumId) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(album.slug) ||
        slugs.has(album.slug) || ids.has(album.albumId)) {
        throw new Error(`Invalid or duplicate Flickr album configuration: ${album.slug}`);
      }
      slugs.add(album.slug);
      ids.add(album.albumId);
    }
    // Keep feed traffic light. If Flickr is unavailable the build fails and the
    // last successful Cloudflare deployment stays live.
    const results: PublishedAlbum[] = [];
    for (const album of visible) results.push(await loadAlbum(album));
    return results;
  })();
}
