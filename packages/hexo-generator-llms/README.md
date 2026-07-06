# hexo-generator-llms

**GEO (Generative Engine Optimization) for Hexo.**

Generate a clean **Markdown (`.md`) copy of every Hexo page** for AI/LLM crawlers, advertise it
with `<link rel="alternate" type="text/markdown">`, and emit an **`llms.txt`** index — the
static-site equivalent of Cloudflare's "serve Markdown to AI" content-negotiation, done at
build time (works on GitHub Pages and any static host).

Why: LLMs pay per token, and a page of `<div>`/`class`/`script` HTML costs ~4–5× the tokens of
the same content in Markdown. Serving a clean `.md` saves the crawler tokens and helps it read
your content hierarchy (headings, lists, tables) without visual-markup noise.

## Install

```sh
npm install hexo-generator-llms
```

The plugin auto-loads (its name starts with `hexo-`). On the next `hexo generate` it emits, for
each page, an `index.md` next to the `index.html`:

```
public/2016/12/25/my-post/index.html
public/2016/12/25/my-post/index.md   ← new
public/llms.txt                       ← new
```

and injects into each page's `<head>`:

```html
<link rel="alternate" type="text/markdown" href="https://example.com/2016/12/25/my-post/index.md">
```

## How it works

- Converts the **rendered** page HTML (`post.content`) to Markdown with
  [Turndown](https://github.com/mixmark-io/turndown) + `turndown-plugin-gfm` (tables, fenced
  code, strikethrough). Using rendered HTML means any templating tags in your source Markdown
  are already expanded — nothing leaks into the `.md`.
- Rewrites image/link URLs to absolute so a fetched `.md` is self-contained.
- Records which pages got a `.md` and injects the `alternate` link only on those, by reading
  each page's own `<link rel="canonical">` inside an `after_render:html` filter — **no theme
  edits required**.

### Themes without a canonical link

The `alternate` link injection keys off `<link rel="canonical">`. If your theme doesn't emit
one, add this one line to your `<head>` instead:

```ejs
<%- md_alternate_link() %>
```

## Configuration

All optional — sensible defaults, works with no config:

```yaml
# _config.yml
llms:
  enable: true
  types: [post, page]     # which sources to emit a .md for
  exclude: []             # paths to skip, e.g. [projects, photography]
  llms_txt: true          # /llms.txt index
  llms_full_txt: false    # /llms-full.txt (all bodies concatenated)
  alternate_link: true    # inject <link rel="alternate"> into <head>
  front_matter: true       # YAML header (title/source/date/tags) in each .md
  absolute_urls: true      # rewrite links/images to absolute URLs
```

Data-driven pages (e.g. a portfolio or gallery whose content is rendered from a template/data
file rather than a Markdown body) have no meaningful body to convert — list their paths in
`exclude` to skip them.

## Note on GitHub Pages

GitHub Pages can't set a custom `Content-Type` on `.md` files, but AI crawlers discover the
Markdown via the `rel="alternate"` hint, the `.md` extension, and `llms.txt` — not the response
MIME type — so it works regardless.

## License

MIT
