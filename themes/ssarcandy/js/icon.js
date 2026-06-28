import codepoints from '../material-symbols-codepoints.json';

// Material Symbols icons render from the self-hosted subset (helper/build_font.js),
// which is keyed by codepoint, not ligature — so icons set/injected from JS must use
// the PUA codepoint, not the name. Server-rendered icons get the same treatment via
// scripts/material-symbols.js; all read the one (generated) codepoint map.

// The PUA codepoint character for an icon name — for setting an existing element's
// textContent. Falls back to the name if it's unmapped.
export function msChar(name) {
  const cp = codepoints[name];
  return cp ? String.fromCodePoint(parseInt(cp, 16)) : name;
}

// A full <i> element string for an icon name, for innerHTML injection.
export function msIcon(name) {
  return `<i class="icon material-symbols-outlined">${msChar(name)}</i>`;
}
