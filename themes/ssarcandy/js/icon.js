import codepoints from '../material-symbols-codepoints.json';

// Material Symbols icons render from the self-hosted subset (helper/build_font.js),
// which is keyed by codepoint, not ligature — so client-injected icons must use the
// PUA codepoint, not the name. Server-rendered icons get the same treatment via
// scripts/material-symbols.js; both read the one committed codepoint map.
export function msIcon(name) {
  const cp = codepoints[name];
  return `<i class="icon material-symbols-outlined">${cp ? `&#x${cp};` : name}</i>`;
}
