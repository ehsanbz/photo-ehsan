# Ehsan Bagherzadeh · Photography

An image-first portfolio at **https://photos.ehsan.bz**. Flickr holds the photos and album metadata; Astro reads a deliberate allowlist of public albums at build time and produces static files for Cloudflare Pages. No database, browser-side Flickr API calls, or server adapter is needed.

**The repository intentionally contains no placeholder photographs or Flickr credentials.** Until you configure a Flickr album, the site shows an understated empty state and is marked `noindex`. The About page is available. A configured album without `FLICKR_API_KEY` and `FLICKR_USER_ID` fails the build so an incomplete deployment cannot silently replace your site.

## First-time setup

1. [Create or sign in to a Flickr account](https://www.flickr.com/). Upload photographs, make the ones you want to publish **public**, and add them to an album. Only public photographs can be fetched by this site without OAuth.
2. [Request a Flickr API key](https://www.flickr.com/services/api/misc.api_keys.html) for your photography site. Describe the intended use accurately; Flickr distinguishes personal/non-commercial and commercial usage. The key is for calling the public API. You do **not** need an OAuth token or Flickr account password.
3. Find your Flickr **user ID (NSID)**. It usually looks like `12345678@N00`. If your photostream URL contains this ID, copy it. If you have a custom URL, use Flickr's [`flickr.urls.lookupUser` API Explorer](https://www.flickr.com/services/api/explore/flickr.urls.lookupUser) with that URL and copy the response's `user.id`. Do not use your screen name unless it actually is an NSID.
4. Open the album in Flickr and copy the numeric ID from its URL: `https://www.flickr.com/photos/YOUR_ID/albums/ALBUM_ID/`. [`flickr.photosets.getList`](https://www.flickr.com/services/api/flickr.photosets.getList.html) can also list your album IDs.
5. Copy `.env.example` to `.env` at the repository root and fill it in:

   ```dotenv
   FLICKR_API_KEY=your_key_here
   FLICKR_USER_ID=12345678@N00
   ```

   `.env` is ignored by Git. Do not put the key in `src/config/albums.ts` or commit it. `FLICKR_USER_ID` is public account information, but it is kept in the same configuration for convenience.
6. Add a real entry in `src/config/albums.ts` and remove the example comment marker:

   ```ts
   export const albums: AlbumConfig[] = [
     { albumId: '72177720312345678', slug: 'berlin-at-night', featured: true },
   ];
   ```

   Set `visible: false` to hide an album without deleting it from Flickr. No other albums are made public by the website. The example ID above is illustrative.
7. Use Node **22.16.0** (specified in `.node-version`), then:

   ```bash
   npm install
   npm run dev
   npm run check
   npm run build
   npm run preview
   ```

   The local URL is printed by Astro. `npm run build` creates static `dist/` output. Build errors identify failing Flickr methods and album/photo IDs without printing the API key. If Flickr is temporarily down, the previous successful Cloudflare deployment stays live; retry the build later.

## Publish on Cloudflare Pages

This is the existing `ehsanbz/photo-ehsan` repository. Keep its existing Cloudflare Pages project and production domain. If you have not connected it yet:

1. In Cloudflare **Workers & Pages**, create/select a **Pages** project with **Git integration**. Connect `ehsanbz/photo-ehsan`, production branch `main`, root directory the repository root.
2. Select Astro (or enter the settings): build command `npm run build`, output directory `dist`. No adapter or runtime bindings. Cloudflare installs from `package-lock.json`. The checked-in `.node-version` requests Node 22.16.0; if your build image ignores it, set `NODE_VERSION=22.16.0` in build environment variables.
3. In **Settings → Environment variables**, set `FLICKR_API_KEY` and `FLICKR_USER_ID` for **Production** and **Preview** if you want preview builds to include photos. Use a secret/encrypted value for the key when the dashboard offers that choice. Build-time variables are never bundled into browser JavaScript by this site.
4. Push to `main` to start a production build. Pull request branches get preview deployments if previews are enabled. If a preview has no configured variables while albums are listed, it will fail intentionally.
5. In the Pages project's **Custom domains**, add or verify `photos.ehsan.bz`. If your `ehsan.bz` zone is at Cloudflare, follow the prompted record creation. If DNS is elsewhere, point a `CNAME` for `photos` to your project's actual `<project>.pages.dev` hostname, then complete validation in Pages. The Pages association is required in addition to DNS. Keep any existing valid setup; the repository alone cannot change Cloudflare account settings.
6. Verify `https://photos.ehsan.bz/`, an album page, `/sitemap-index.xml` and `/robots.txt`. The Astro `site` URL already uses the production domain for canonical links and the sitemap.

Cloudflare's [Astro build settings](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/), [environment settings](https://developers.cloudflare.com/pages/configuration/build-configuration/) and [custom domain steps](https://developers.cloudflare.com/pages/configuration/custom-domains/) describe the dashboard workflow.

### Refresh after a Flickr edit

Photos and metadata are read **at build time**, not on each page visit. Editing Flickr does not update an already built site. In the Pages project's **Settings → Builds**, create a [Deploy Hook](https://developers.cloudflare.com/pages/configuration/deploy-hooks/) targeting `main`; keep its URL private. Send the provided POST request after editing Flickr, or use the dashboard's **Retry deployment** / **Create deployment** control where available. Alternatively, pushing a repository commit rebuilds the site. Flickr does not automatically call a Cloudflare hook in this project.

Flow: upload/edit in Flickr → trigger a Cloudflare build → Astro fetches current public metadata and photos → new static pages go live. A build that fails leaves the last successful deployment intact.

## Everyday changes

| Goal | What to do |
| --- | --- |
| Add a photograph | Upload to Flickr, set public visibility, add it to a configured album, edit title/description, then trigger a rebuild. |
| Create an album | Create it in Flickr, add public photographs, copy the album ID, add one visible entry with a unique slug to `src/config/albums.ts`, commit/push. |
| Remove an album from the site | Set `visible: false` or delete its config entry and rebuild. It remains in Flickr. |
| Change the cover | Change the primary/cover photo in Flickr, or set `coverPhotoId` to the ID of a photo **inside that album** in local config; rebuild. |
| Reorder photos | Reorder the Flickr album and rebuild. The DOM and gallery navigation retain Flickr order. |
| Change captions | Edit the photo title and description in Flickr; rebuild. The title becomes the visible caption and the description appears in the lightbox. |
| Change album text | Edit the Flickr album title/description; rebuild. Local `title`/`description` fields override Flickr only when set. |

Photo dates and tags are fetched with Flickr metadata. Tags are available in the site data layer; album tabs are driven by the explicit album allowlist so a tag alone never publishes an album. Optional EXIF (`showExif: true`) is shown under collapsible **Technical details** in the lightbox when Flickr makes it available. Enabling it adds one API request per photograph.

Full configuration options:

```ts
{
  albumId: '72177720312345678', // required, Flickr album ID
  slug: 'berlin-at-night',       // required, /albums/berlin-at-night/
  visible: true,                 // optional; false hides it
  featured: true,                // optional editorial flag
  sortOrder: 10,                 // optional, ascending album/tab order
  title: 'Berlin After Dark',    // optional Flickr override
  description: '...',            // optional Flickr override
  coverPhotoId: '1234567890',   // optional, photo inside the album
  showExif: false,               // optional
}
```

The homepage displays up to 48 photographs per configured album, with duplicate photo IDs shown once. Individual album pages contain the full public Flickr sequence, including pagination beyond Flickr's first 500 results. The homepage grid uses four columns on wide monitors, three on smaller desktops, and two on tablet and phone. The lightbox supports Escape, arrow keys, touch swipes, a counter and focus return. With JavaScript disabled, clicking a photograph opens its large Flickr image.

## Turn an album into a story

An album needs no local Markdown. For a longer photo essay, create `src/content/essays/berlin-at-night.md` whose filename **exactly matches the configured slug**:

```md
---
subtitle: "A walk after sunset"
location: "Berlin"
date: "2026"
sections:
  - afterPhotoId: "1234567890"
    text: "A short reflection after this photograph."
closingNote: "The city looked different on the way home."
---

Optional introductory paragraphs in Markdown go here. Keep them short so the
photographs still start near the top of the page.
```

The album now appears in **Stories** as well as **Albums**, with one canonical URL under `/albums/slug/`. An optional section is inserted after the matching Flickr photo ID. It must be present in that album. Introductory Markdown and the closing note are local additions; Flickr stays the source for photos, sequence, captions and base album metadata.

## Image and API behavior

- `src/lib/flickr.ts` holds the API calls. `flickr.photosets.getPhotos` fetches the public photo order (500 per page), `getInfo` fetches album/photo descriptions, `getSizes` supplies actual image dimensions and URLs, and `getExif` is optional.
- The site emits responsive `srcset` and `sizes` based on Flickr variants, never uses the Original size, and lazy-loads below the first few photographs. Flickr continues to host the images.
- Missing/private/deleted photos are skipped when Flickr explicitly reports them as unavailable. If an album has nonempty results but no usable photos, or a transient API/network error occurs, the build fails with a useful message instead of silently publishing an incomplete gallery. Truly empty albums show an empty state and are excluded from indexing.
- The Flickr API key identifies your application and tracks usage; it is **not an OAuth secret or a Flickr password**. Some public Flickr API designs put keys in browser requests, but this implementation confines it to the build process. Do not commit it or expose it in client code. The album IDs, user ID and image URLs are public. A Cloudflare deploy-hook URL is a separate bearer secret; do not commit it.

## Troubleshooting

- **Missing variables:** add them to local `.env` or both relevant Cloudflare build environments. Names must be exact.
- **Invalid album/user/key:** confirm the Flickr NSID and album ID, account ownership, public visibility and API key status.
- **No images:** ensure the album has public **photos** (not only videos). An unconfigured site intentionally displays no sample photos.
- **Flickr outage or rate limit:** retry later. API calls have a timeout and limited concurrency; the previous successful deployment remains live.
- **Changes do not appear:** trigger a fresh Cloudflare build after editing Flickr. Browser reload alone does not refetch metadata.
- **Wrong domain:** verify Pages Custom domains and the `photos` CNAME; canonical URL is configured in `astro.config.mjs`.
