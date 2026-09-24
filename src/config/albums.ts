/** Explicit allowlist: only visible albums here become public site pages. */
export interface AlbumConfig {
  albumId: string;
  slug: string;
  visible?: boolean;
  featured?: boolean;
  title?: string;
  description?: string;
  coverPhotoId?: string;
  sortOrder?: number;
  showExif?: boolean;
}

export const albums: AlbumConfig[] = [
  // { albumId: '72177720300000000', slug: 'berlin-after-dark', featured: true, showExif: false },
];
