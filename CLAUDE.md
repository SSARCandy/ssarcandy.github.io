# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The source for [ssarcandy.tw](https://ssarcandy.tw/) — a personal blog built with **Hexo 7.3** and a fully custom theme (`themes/ssarcandy`). Content is Markdown; the theme is EJS templates + LESS; page interactivity is vanilla JS bundled by Vite.

## Branch model (important)

- `develop` is the **source branch** and the working branch — make all changes here and open PRs against it.
- `master` is **generated output** (the built `./public`, force-pushed by CI). Never edit `master` by hand.
- Pushing to `develop` triggers GitHub Actions (`.github/workflows/publish.yml`), which builds and deploys to `master` (GitHub Pages). A daily cron also rebuilds so visitor counts / Flickr photos stay fresh.

## Commands

```sh
npm run dev      # vite --watch + hexo server --debug in parallel (live theme dev)
npm start        # hexo server only (no JS rebuild)
npm run build    # full pipeline via npm-run-all build:* (see ordering below)
npm run clean    # hexo clean (clears db.json + public/)
npm run lint     # eslint themes/ssarcandy/js  — SEE WINDOWS NOTE BELOW
```

There are **no automated tests** — `lint` is the only check, and it's the gate CI enforces.

### Build pipeline ordering matters

CI runs these five steps **individually and in order** (not `npm run build`), because `build:pageview` needs a GA credential injected between steps:

1. `build:flickr` — `helper/fetch_flickr_photos.js` → writes `source/flickr_photos.json`
2. `build:pageview` — `helper/ga_pageview.js` → writes `pageview.json` (repo root)
3. `build:images` — `helper/build_images.js` → writes `source/image_meta.json` (`{ w, h, lqip }` per image under `source/img`, via `image-size` + `sharp`)
4. `build:vite` — bundles JS → `themes/ssarcandy/source/js/*.bundle.js`
5. `build:hexo` — `hexo generate` assembles everything into `public/`

`build:hexo` must run **last**: Hexo copies `themes/ssarcandy/source/` (including the Vite bundles) and the data JSON into `public/`. If you change JS, re-run `build:vite` before `build:hexo` or the site serves a stale bundle. Likewise re-run `build:images` after adding/replacing images under `source/img` or content images render with no reservation/placeholder (it degrades gracefully, never failing the build).

## Architecture

### Two toolchains, one output

- **Vite** owns JavaScript only. Source lives in `themes/ssarcandy/js/`; Vite bundles three page-specific entry points into `themes/ssarcandy/source/js/` (`vite.config.js`). That output dir is **gitignored** — it's a build artifact.
  - `app.bundle.js` — loaded on every page (`after-footer.ejs`): nav rail, header, scroll/TOC, share, client-side search.
  - `projectPage.bundle.js` — `/projects` only; `photography.bundle.js` — `/photography` only.
- **Hexo** owns everything else: Markdown rendering, EJS templates (`themes/ssarcandy/layout/`), LESS (`themes/ssarcandy/source/css/`), and copying `source/` → `public/`.

### `scripts/` — the glue between build-time data and templates

`scripts/` is Hexo's auto-loaded init directory (site-level, runs on every `hexo generate`). `scripts/helper.js` registers the EJS helpers that bridge the gitignored data files into templates:

- `visitor_count()` / `post_pv(slug)` ← read `pageview.json`
- `flickr_photos()` ← reads `source/flickr_photos.json` (so `/photography` is static HTML, not a client fetch)
- `project_tags()` ← derived from `source/_data/projects.yml` at render time
- `page_images(page, extra)` ← scrapes `<img>` from content for Open Graph tags

`scripts/image-meta.js` is the single consumer of `source/image_meta.json` (built by `npm run build:images` — see pipeline below; a gitignored artifact keyed by URL path → `{ w, h, lqip }` for every image under `source/img`). It provides:

- `project_image_aspect(name, ext)` / `project_lqip(name, ext)` ← the `/projects` card's intrinsic dimensions as a CSS `aspect-ratio` (so the Masonry grid reserves each card's height and lays out with no reflow) and its inlined blurred base64 placeholder (blur-up).
- an `after_render:html` filter that rewrites **post content images** (dated `/img/YYYY-MM-DD/…` paths): adds `loading=lazy`/`decoding=async`, the inlined LQIP as the image's own `background-image` (blur-up), and an inline `width`+`aspect-ratio` that reserves the box with no layout shift. The width reproduces the `.article img { max-height: 600px }` cap (article.less) with the ratio preserved, computed from the build-time dimensions — keep `MAX_IMG_HEIGHT` in `image-meta.js` in sync with that LESS value. Deliberately **no wrapper element**: the click-to-zoom (`hexo-tag-photozoom` + `zoom.js`) transforms the `<img>` in place and must not be boxed.

`image_meta.json` degrades gracefully to `{}` when missing (no reservation / no placeholder), like the other build-time data files, so a local `hexo generate` without a prior `build:images` never fails. `sharp` is optional: if its native binary is unavailable the `lqip` fields are just empty. `scripts/related-posts.js` registers the related-posts logic.

### Structured content vs. posts

- Blog posts are Markdown in `source/_posts/`.
- `/projects` and the About-page experience timeline are **data-driven** from `source/_data/projects.yml` and `experiences.yml` (not Markdown).
- Search is client-side (`themes/ssarcandy/js/Search.js`): fetches `/content.json` (generated by `hexo-generator-json-content`) and regex-matches title/tags/text. The `/projects` tag filter (`ProjectTags.js`) is exact `data-tags` set-membership — no client-side search engine. `lunr` is only used at build time, in `scripts/related-posts.js`, for the post "related posts" list.

### CSS / LESS

- Single entry `themes/ssarcandy/source/css/style.less` `@import`s every partial in `_partial/`.
- `_partial/variable.less` holds the Material palette (`@primaryColor: #673AB7`) and LESS mixins (`.transition()`, `.boxShadow()`, `.tagChip()`, etc.). Theme color is also mirrored in `themes/ssarcandy/_config.yml` (`color:`) and `source/web-app-manifest.json`.
- **Gotcha:** editing an `@import`'d partial does not always recompile `style.css` on an incremental build. Run `hexo clean && hexo generate` (or `npm run clean`) before trusting the compiled output.
- The nav is an **MD3-style navigation rail** (`_partial/layout.less`): collapsed 96px (icons) ↔ expanded 220px (icon+label), modal on every screen size. By design there is **no scrim/dim** behind the expanded rail — a dark overlay made iOS Safari's translucent bottom toolbar turn grey. The `.mask` element is an invisible tap-outside-to-close catcher only; don't add a background to it.

### Theme config

`themes/ssarcandy/_config.yml` drives the nav menu (Material Icons ligature → label/url), social links, AdSense slots, and feature flags (`search`, `share`, etc.). Site-wide config (title, permalink, deploy target) is the root `_config.yml`.

## Conventions & gotchas

- **Windows lint:** `npm run lint` fails on a Windows checkout because `.eslintrc` enforces `linebreak-style: unix` against CRLF files. Use `npx eslint themes/ssarcandy/js --rule 'linebreak-style: 0'` locally; CI (Linux) runs the unmodified `npm run lint`.
- **No caching service worker.** `hexo-pwa` was removed (it caused permanent post-deploy staleness). `source/sw.js` is now a **self-destruct tombstone** that clears caches and unregisters itself on existing visitors' browsers — it must keep being served at `/sw.js`. Do not re-introduce a caching SW without content-hashed asset names.
- **Secrets:** the GA service-account key `hexo-pv-c7938b2e210b.json` is gitignored and injected by CI from a secret; `pageview.json`, `source/flickr_photos.json` and `source/image_meta.json` are gitignored build artifacts. Keep them out of commits.
- **Cross-platform helpers:** build helpers must run on Windows and Linux. `ga_pageview.js` passes the key via `{ keyFilename }` (no bash-only env prefix) and falls back to Application Default Credentials on CI. When writing build scripts, avoid `lessc <in> /dev/null`-style redirects — on Windows that leaves a stray `nul` file.
