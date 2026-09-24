/** Flickr NSID is public account information, not a credential. */
export const flickrUserId = '205055790@N08';

/** Explicit allowlist: only visible albums here become public site pages. */
export interface AlbumConfig {
  albumId: string;
  slug: string;
  visible?: boolean;
  featured?: boolean;
  title?: string;
  description?: string;
  coverPhotoId?: string;
  photoOrder?: string[];
  sortOrder?: number;
}

export const albums: AlbumConfig[] = [
  { albumId: '72177720335800873', slug: 'berlin-streets', featured: true, sortOrder: 1 },
  { albumId: '72177720335800878', slug: 'berlin-must-see', featured: true, sortOrder: 2 },
  { albumId: '72177720335800868', slug: 'travel', sortOrder: 3 },
  { albumId: '72177720335800863', slug: 'adventure', visible: false },
  { albumId: '72177720335784530', slug: 'people-and-portraits', visible: false },
];
