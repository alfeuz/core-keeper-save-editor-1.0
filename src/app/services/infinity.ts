/**
 * The game writes an infinite duration as a bare `Infinity` token, which JSON.parse rejects, so
 * such a save cannot be read at all. To load it we swap those tokens for a placeholder string
 * while the file is in memory, and swap them back on export.
 *
 * Two things matter for correctness:
 *
 *  1. Only a real JSON number token may be replaced. A value that merely contains the word, such
 *     as an item named "Infinity Staff", has to survive untouched. The regex below matches either
 *     a complete string literal or a bare Infinity token, so anything inside quotes is matched as
 *     a string first and never rewritten.
 *
 *  2. The placeholder must be something no save value can contain, otherwise exporting would turn
 *     a real string into a bare Infinity. The token is deliberately not a word a game value would
 *     plausibly hold, and the negative form gets a separate marker.
 */
export const INFINITY_PLACEHOLDER = 'GkSE_INF_b3f9c1d2_PLACEHOLDER';

const NEGATIVE_PLACEHOLDER = INFINITY_PLACEHOLDER + '-NEG';

// Either a whole string literal (copied through) or a bare Infinity token, anchored to the JSON
// punctuation that can precede and follow a number.
const TOKEN = /"(?:[^"\\]|\\.)*"|-?Infinity(?=\s*[,}\]])/g;

/** Replaces bare Infinity tokens with the placeholder so the text can be parsed. */
export function escapeInfinity(json: string): string {
  return json.replace(TOKEN, match => {
    if (match.startsWith('"')) {
      return match; // a string literal, leave it exactly as it is
    }
    return '"' + (match.startsWith('-') ? NEGATIVE_PLACEHOLDER : INFINITY_PLACEHOLDER) + '"';
  });
}

/** Restores the bare Infinity tokens the game expects. */
export function unescapeInfinity(json: string): string {
  return json
    .replace(new RegExp('"' + NEGATIVE_PLACEHOLDER + '"', 'g'), '-Infinity')
    .replace(new RegExp('"' + INFINITY_PLACEHOLDER + '"', 'g'), 'Infinity');
}
