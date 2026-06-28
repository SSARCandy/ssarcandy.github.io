/* Build a tiny self-hosted Material Symbols subset — and generate its codepoint map.

   Scans the codebase for the Material Symbols icons actually used — template markup
   (`<i ...>name</i>`), `msIcon('name')` calls in JS, and the nav-rail icons from the
   theme config `menu:` keys — resolves each name to its glyph codepoint from the full
   font, and then:
     1. writes themes/ssarcandy/material-symbols-codepoints.json — the map shared by
        the Hexo filter (scripts/material-symbols.js), the client JS (js/icon.js) and
        this script. GENERATED; don't hand-edit — add an icon in a template/JS and
        re-run `build:font`, no manual codepoint lookup.
     2. subsets the font to just those glyphs -> gitignored woff2 (~20 KB vs Google's
        ~312 KB). The subset is keyed by codepoint, not ligature (a ligature-name
        subset balloons to ~2.8 MB), so icons are referenced as &#xCODE;.

   Runs before build:vite so the bundled JSON is fresh. Degrades gracefully: a missing
   font package or an unresolved name warns, it never fails the build. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const MAP = path.join(root, 'themes/ssarcandy/material-symbols-codepoints.json');
const SRC = path.join(root, 'node_modules/material-symbols/material-symbols-outlined.woff2');
const THEME_CONFIG = path.join(root, 'themes/ssarcandy/_config.yml');
const SCAN_DIRS = ['themes/ssarcandy/layout', 'themes/ssarcandy/js'];
const OUT_DIR = path.join(root, 'themes/ssarcandy/source/css/fonts/material-symbols');
const OUT = path.join(OUT_DIR, 'material-symbols-outlined.woff2');

// Every Material Symbols icon name the site references.
function collectUsedNames() {
  const names = new Set();
  const reMarkup = /material-symbols-outlined[^>]*>([a-z0-9_]+)/g; // <i ...>name</i>
  const reJs = /msIcon\(\s*['"]([a-z0-9_]+)['"]/g; // msIcon('name')
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ejs|js)$/.test(e.name)) {
        const txt = fs.readFileSync(p, 'utf8');
        let m;
        while ((m = reMarkup.exec(txt))) names.add(m[1]);
        while ((m = reJs.exec(txt))) names.add(m[1]);
      }
    }
  };
  SCAN_DIRS.forEach((d) => walk(path.join(root, d)));

  // Nav-rail icons are config-driven: menu.ejs renders each `theme.menu` key as an
  // icon. Pull the 2-space-indented keys out of the config `menu:` block.
  const lines = fs.readFileSync(THEME_CONFIG, 'utf8').split(/\r?\n/);
  const start = lines.findIndex((l) => l.replace(/\s+$/, '') === 'menu:');
  if (start >= 0) {
    for (let i = start + 1; i < lines.length; i++) {
      if (/^\S/.test(lines[i])) break; // next top-level key ends the block
      const m = lines[i].match(/^ {2}([a-z0-9_]+):/);
      if (m) names.add(m[1]);
    }
  }
  return names;
}

(async () => {
  const subsetFont = require('subset-font');
  const fontkit = require('fontkit');

  if (!fs.existsSync(SRC)) {
    console.warn('[build:font] material-symbols package not found — skipping (icons fall back to tofu).');
    return;
  }

  const buf = fs.readFileSync(SRC);
  const font = fontkit.create(buf);

  // glyph id -> codepoint, to map a resolved icon name back to its PUA codepoint.
  const glyphToCp = new Map();
  for (const cp of font.characterSet) {
    try { const g = font.glyphForCodePoint(cp); if (g) glyphToCp.set(g.id, cp); } catch (e) { /* skip */ }
  }

  // Resolve each used name -> codepoint via the font's ligature shaping. Names that
  // aren't real Material Symbols icons (typos, or brand keys handled as inline SVG)
  // simply don't resolve and are skipped with a warning.
  const map = {};
  const unresolved = [];
  for (const name of [...collectUsedNames()].sort()) {
    const glyphs = font.layout(name).glyphs;
    const cp = glyphs.length === 1 ? glyphToCp.get(glyphs[0].id) : undefined;
    if (cp) map[name] = cp.toString(16);
    else unresolved.push(name);
  }
  if (unresolved.length) console.warn(`[build:font] not valid Material Symbols icons, skipped: ${unresolved.join(', ')}`);

  fs.writeFileSync(MAP, JSON.stringify(map, null, 2) + '\n');

  // Subset by the icons' codepoints (PUA chars). Keep the variable axes so the FILL
  // fill/outline toggle still works via CSS font-variation-settings.
  const chars = Object.values(map).map((cp) => String.fromCodePoint(parseInt(cp, 16))).join('');
  const out = await subsetFont(buf, chars, { targetFormat: 'woff2' });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, out);
  console.log(`[build:font] ${Object.keys(map).length} icons -> ${(out.length / 1024).toFixed(1)} KB  ${path.relative(root, OUT)}`);
})().catch((e) => {
  // Never fail the pipeline over the font subset (degrade gracefully like other data).
  console.warn('[build:font] skipped:', e.message);
});
