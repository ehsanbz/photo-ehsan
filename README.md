# Ehsan Bagherzadeh · Photography

An image-first, static photography portfolio and journal for **photos.ehsan.bz**. Built with Astro, Markdown content collections, and no database or CMS. The sample images in `src/assets/sample/` are generated design previews, **not Ehsan's photographs**. Replace the sample content and images before presenting the site as a finished photographic portfolio.

## Run locally

Use Node **22.12 or later**.

```bash
npm ci
npm run dev
```

Open the local URL Astro prints. For a production check:

```bash
npm run check
npm run build
npm run preview
```

The build is a static `dist/` folder. No server adapter or database is needed.

## Where things live

| Path | Purpose |
| --- | --- |
| `src/content/stories/*.md` | Longer photo essays |
| `src/content/journal/*.md` | Short chronological notes |
| `src/assets/photos/` | Your exported photographs; create this folder when adding your first story |
| `src/assets/sample/` | Replaceable preview images, isolated from your own photographs |
| `src/content.config.ts` | Fields and validation for entries and individual images |
| `src/pages/` | Static pages, story routes and gallery |
| `src/styles/global.css` | Typography and responsive layout |

The Gallery automatically gathers images from published Stories and Journal entries. Set `showInGallery: false` on an image to omit it. Use `category` for filtering; valid values are `Street`, `Architecture`, `Urban`, `Travel`, `People`, and `Details`.

## Add your first Story

1. Export web-sized JPEG or WebP images into a new folder, for example `src/assets/photos/berlin-evening/`.
2. Copy `src/content/stories/berlin-in-motion.md` to `src/content/stories/berlin-evening.md`.
3. Replace the sample title, date, description, cover, cover alt text, body paragraphs, and every entry under `photos`. Remove `sample: true` or set it to `false`. The filename becomes the URL: `/stories/berlin-evening/`.
4. Use a relative path from the Markdown file to each image, such as `../../assets/photos/berlin-evening/platform.webp`.
5. Run `npm run check && npm run build`, then commit your Markdown and images. Your published Story and selected Gallery images appear automatically after deployment.

Minimal example:

```md
---
title: "An evening walk"
subtitle: "Along the platforms"
description: "A short photo essay through Berlin after sunset."
date: 2026-09-23
location: Berlin, Germany
cover: ../../assets/photos/berlin-evening/platform.webp
coverAlt: "Passengers waiting beside an evening train"
tags: [Urban, Public transport]
photos:
  - image: ../../assets/photos/berlin-evening/platform.webp
    alt: "Passengers waiting beside an evening train"
    caption: "The last light at the platform."
    location: Berlin
    date: 2026-09
    category: Urban
    textAfter: "A brief paragraph can appear after this photograph."
  - image: ../../assets/photos/berlin-evening/stairs.webp
    alt: "Stairs descending toward an underground station"
    category: Architecture
---

Start your introductory text here. Ordinary Markdown paragraphs, links, and headings work.
```

`caption`, `location`, `date`, `camera`, `lens`, `category`, `showInGallery`, and `textAfter` are optional **per photo**. `alt` is required: describe what the image shows rather than repeating the caption. Optional camera and lens fields appear quietly near the caption. The cover can be the first image; when it is, the Story displays it once, with its caption beneath the opening image. `textAfter` is plain text intended for a short paragraph between photographs; use the Markdown body for formatted introductory writing. Set `draft: true` to remove an entry from public pages, Gallery, and the sitemap until it is ready.

## Add a Journal entry

Copy `src/content/journal/stockholm-waterfront.md` to a new `.md` file. Use the same metadata and `photos` format. Write a short note in the Markdown body. The journal index sorts entries by date, newest first. A one-image entry is fine; the cover image is shown once with its caption.

## Prepare photographs

- Keep camera originals outside the public repository. Export at about **2200–2500 px on the long edge** for normal web use; 2500–3000 px is sensible for a particularly wide hero.
- Use sRGB. Export JPEG around quality 75–85 or WebP around quality 80–85; inspect the result for detail and banding. Aim for roughly **200–700 KB** per image where practical, allowing more for complex hero images. Do not commit 20–40 MB originals.
- Rename files descriptively and remove private GPS data if it should not be public.
- Put exports under `src/assets/photos/`, **not** `public/`. Astro then builds responsive WebP variants and selects sizes according to viewport width. Photos below the first screen load lazily; the opening image loads eagerly. The Gallery provides a larger optimized file in a keyboard-accessible viewer.
- Edit a photo's `caption` later in its Markdown entry; no layout changes are necessary.

When you have your own images, replace the `src/assets/sample/` imports used on the Home (`src/pages/index.astro` fallback), About (`src/pages/about.astro`) and default sharing image (`src/layouts/SiteLayout.astro`), then remove preview labels and sample entries. The Home hero otherwise uses the first published Story cover automatically. The sharing image on pages without their own cover currently uses the preview image.

## Cloudflare Pages deployment

1. Create a **new GitHub repository** (for example `ehsanbz/photo-ehsan`), add this project at the repository root, and push the `main` branch. Do not put it inside the existing `ehsanbz/blog` repository.

   If you downloaded the ZIP, extract it, open a terminal inside `photo-ehsan/`, then run:

   ```bash
   git init
   git branch -M main
   git add .
   git commit -m "Initial photography site"
   git remote add origin https://github.com/ehsanbz/photo-ehsan.git
   git push -u origin main
   ```

   Change the remote URL if you chose a different repository name. Create the GitHub repository without starter files to avoid an unrelated initial commit.
2. In Cloudflare **Workers & Pages**, create a **Pages** project with Git integration, select the repository and `main` branch.
3. Set the build command to `npm run build` and output directory to `dist`. Set `NODE_VERSION` to a supported Node 22 release (at least 22.12) if Cloudflare's default is older. No framework adapter, environment secrets, database or paid CMS are required.
4. After the first deployment succeeds at the assigned `*.pages.dev` address, open the Pages project's **Custom domains** and add `photos.ehsan.bz` there **before** editing DNS.
5. If the DNS zone for `ehsan.bz` is in Cloudflare, follow its prompted DNS setup. If DNS is elsewhere, add a `CNAME` for `photos` pointing to **your actual Pages project's** `<project>.pages.dev` hostname. Let Cloudflare validate the hostname and issue its certificate. A manually created CNAME by itself does not complete Pages domain association.
6. Verify `https://photos.ehsan.bz`, the generated sitemap at `/sitemap-index.xml`, and sharing previews. Subsequent pushes to `main` deploy automatically.

The Astro `site` setting already uses `https://photos.ehsan.bz` for canonical URLs and the sitemap. `public/robots.txt` points crawlers to that sitemap. Story and Journal pages use their covers as Open Graph images; general pages currently use the sample hero until replaced.

Sample entries carry `noindex` so search engines do not mistake previews for finished photo essays. Home, Stories, Journal and Gallery also carry `noindex` while they contain only sample entries; that flag clears automatically once you publish a real entry. Remove the samples when you are ready to launch.

## Design and accessibility

The layout uses semantic landmarks, a skip link, visible keyboard focus, responsive images with descriptive alt text, and native `<dialog>` for the Gallery's large view. In the Gallery, Tab reaches each photograph, Enter opens it, Left/Right changes images, Escape closes it, and focus returns to the opened photograph. Images remain linked to their optimized larger versions if JavaScript is unavailable.

The site uses only a small Gallery script. Google Fonts are optional: local serif and sans-serif fallbacks remain usable if external fonts are unavailable. For maximum privacy and offline reliability, self-host the chosen fonts later.
