# Ehsan Bagherzadeh · Photography

An image-first Astro portfolio for **https://photos.ehsan.bz**, generated from Ehsan's **public Flickr album feeds** and deployed as static files to Cloudflare Pages. This version does **not** use the Flickr REST API and does **not** require a Flickr Pro account, API key, OAuth token, database, server adapter, or browser-side feed request.

## How this works

The public Flickr NSID `205055790@N08` is set in `src/config/albums.ts`. That file is a deliberate allowlist: only albums with `visible !== false` are built into this site. At build time `src/lib/flickr.ts` requests each album's public `photoset.gne` JSON feed, uses its photo titles, dates, tags, and publicly available media URLs, and renders the static Astro pages. The feed's album title becomes the page title unless a local override is set.

The current selection is **Berlin Streets**, **Berlin Must See**, and **Travel**. **Adventure** and **People & Portraits** are configured with `visible: false`; change this flag if you want to include them.

| File | Purpose |
| --- | --- |
| `src/config/albums.ts` | Flickr ID, album IDs, slugs, visibility, order and optional overrides |
| `src/lib/flickr.ts` | Feed fetch, validation and image URL handling |
| `src/content/essays/*.md` | Optional writing for richer photo stories |
| `src/components/PhotoGrid.astro` | Responsive gallery, filtering and lightbox |
| `src/pages/` | Static pages and album routes |
| `src/styles/global.css` | Responsive editorial design |

### What the feed cannot supply

This is a practical workaround for a Free account, with real constraints:

- Flickr [currently permits new API keys only for Pro subscribers](https://www.flickrhelp.com/hc/en-us/articles/4404070036884-Flickr-API). The public feed requires no key.
- The publicly documented [photostream feed](https://www.flickr.com/services/feeds/docs/photos_public/) supports a user ID and tags. Flickr's album-specific `photoset.gne?set=...&nsid=...` endpoint also worked for this account when verified on 24 September 2026, but it is **not listed among the currently documented feeds**. A future Flickr change could break album builds.
- Feeds have **no documented pagination**. Larger albums may show only their most recent feed items; the site warns when an album returns 20 items. There is no reliable way here to guarantee the full album or Flickr's manual photo order.
- The album feed provides the album title and each item's title, date, tags and medium image URL. Album descriptions and photo descriptions may be empty; the HTML feed description often contains only Flickr's attribution/image wrapper. EXIF is unavailable. Album text, a preferred cover and longer story writing can be supplied locally.
- Flickr's image URL convention supports sizes through 1024 px using the medium photo secret. The site requests 320/640/800 px responsive variants and a 1024 px lightbox image, with the feed's 240 px image as a fallback. Sizes above 1024 px are not used; Flickr [restricts larger sizes from Free accounts via its API](https://www.flickrhelp.com/hc/en-us/articles/4404070036884-Flickr-API). If a variant does not exist for a small source image, the viewer falls back to the feed image.

These limits mean the feed works well for a curated set of smaller albums and recent photographs, but it cannot provide all the features of `flickr.photosets.getPhotos`.

## Run locally

Install Node **22.16.0** (specified in `.node-version`):

```bash
npm install
npm run dev
npm run check
npm run build
npm run preview
```

The build makes live HTTPS requests to Flickr. If the feed is unavailable or malformed, the build fails rather than publishing broken pages. A failed Cloudflare build leaves the previous successful deployment live. No `.env` file is required.

## Cloudflare Pages

Keep the existing `ehsanbz/photo-ehsan` GitHub repository and Pages project:

1. In **Workers & Pages**, confirm this repository is connected with `main` as the production branch.
2. Build command: `npm run build`; output directory: `dist`; root directory: repository root. `.node-version` selects Node 22.16.0. No Flickr environment variables or runtime secrets are needed.
3. Confirm **Custom domains** includes `photos.ehsan.bz`. If DNS is external, the `photos` CNAME must target your actual `<project>.pages.dev` hostname and the domain must also be associated inside Pages. Keep an already working DNS record.
4. Push to `main` to deploy. Preview branches build separately if your project has previews enabled. Check the live homepage, an album page, `/sitemap-index.xml` and `/robots.txt`.

The repository's `astro.config.mjs` already sets `https://photos.ehsan.bz` for canonical and sitemap URLs. See Cloudflare's [Astro Pages guide](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/) and [custom domain guide](https://developers.cloudflare.com/pages/configuration/custom-domains/).

### Refresh after changing Flickr

This is a **build-time** integration. New Flickr photos do not appear on an existing deployment until Cloudflare rebuilds it. After editing Flickr, trigger a new deployment in the Pages dashboard or create a [Deploy Hook](https://developers.cloudflare.com/pages/configuration/deploy-hooks/) under **Settings → Builds**, targeting `main`. Send the provided POST request to the private hook URL. Keep the hook URL out of the repository. Flickr itself is not configured to trigger this hook.

## Everyday workflow

| Goal | Steps |
| --- | --- |
| Add a photo | Upload it to Flickr, make it public, add it to a visible album, give it a meaningful title, then rebuild. |
| Edit a caption | Edit the Flickr photo title, then rebuild. Flickr feed descriptions may not contain the extended description. |
| Add an album | Create it in Flickr; copy the album ID from its URL; add a config entry with a unique slug; commit/push and rebuild. |
| Hide an album | Set `visible: false` or remove its config entry. The Flickr album stays untouched. |
| Choose a cover | Set `coverPhotoId` to the ID of a photo **present in the returned feed**. Otherwise the first feed photo is used. |
| Adjust album text | Edit the Flickr title, or set local `title` and `description` overrides in the config. |
| Adjust ordering | Set `sortOrder` for album/tab order. The feed's photo order may differ from Flickr's manual album order; optionally list feed photo IDs in `photoOrder` for a local override. |

Config example:

```ts
{
  albumId: '72177720335800873',
  slug: 'berlin-streets',
  visible: true,
  featured: true,
  sortOrder: 1,
  title: 'Berlin Streets',      // optional override
  description: '...',          // optional local album introduction
  coverPhotoId: '55548046991', // optional; must be in the returned feed
  photoOrder: ['55548046991'] // optional; listed IDs come first
}
```

The homepage shows up to 48 photos per visible album, de-duplicated by Flickr photo ID. The album page displays every photo **returned by its feed**. The grid is four columns on wide desktop screens, three on smaller desktop screens and two on tablets and phones. The lightbox supports arrow keys, Escape, touch swipes and focus return. Without JavaScript, selecting a photograph opens its 1024 px Flickr image.

## Optional photo story

An album needs no Markdown. To add an introduction and short sections, create `src/content/essays/berlin-streets.md` with a filename matching its configured slug:

```md
---
subtitle: "An afternoon on foot"
location: "Berlin"
date: "2026"
sections:
  - afterPhotoId: "55548046991"
    text: "A short observation after this image."
closingNote: "The walk continued."
---

A brief introductory paragraph goes here.
```

The album then appears in **Stories** as well as **Albums**, with one canonical URL under `/albums/slug/`. A section appears after the matching photo ID if that photo is in the current feed. Longer story text is local; Flickr remains the photo source.

## Troubleshooting

- **Feed error:** open the album feed URL using the album ID and NSID shown above. Retry later if Flickr is temporarily unavailable. The previous successful site remains live.
- **Missing images:** check that the photograph is public and in the configured album. A 1024 px variant may be unavailable for a very small original; the site falls back to the feed's medium image.
- **Older photos missing:** Flickr feeds have no documented pagination. For complete large albums, an API key or another photo source is needed.
- **Raw filenames as captions:** change the title in Flickr. The site suppresses common camera filename patterns until they are renamed.
- **Flickr edit not visible:** run a new Cloudflare deployment. Reloading the existing static page does not refresh feed data.
