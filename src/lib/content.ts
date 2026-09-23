import { getCollection } from 'astro:content';

export async function getPublished(collection: 'stories' | 'journal') {
  const entries = await getCollection(collection, ({ data }) => !data.draft);
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getGallery() {
  const [stories, journal] = await Promise.all([getPublished('stories'), getPublished('journal')]);
  return [...stories, ...journal].flatMap((entry) => entry.data.photos
    .filter((photo) => photo.showInGallery)
    .map((photo, index) => ({ ...photo, id: `${entry.collection}-${entry.id}-${index}`, title: entry.data.title,
      url: `/${entry.collection}/${entry.id}/`, sample: entry.data.sample,
      sortDate: entry.data.date, category: photo.category ?? 'Urban' })))
    .sort((a, b) => b.sortDate.valueOf() - a.sortDate.valueOf());
}

export const formatDate = (date: Date) => new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
