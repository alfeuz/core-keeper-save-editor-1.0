/**
 * The save file stores the character's body, skin, hair and eye colours as 64 bit
 * m_low / m_high pairs, for example -633635439416787485. A JavaScript number is a double and
 * holds at most 15 to 17 significant digits, so JSON.parse already loses the low bits of those
 * values and JSON.stringify writes a different number back. The character comes out of the game
 * with its appearance changed, even when the user only edited an item count.
 *
 * The fix is to keep the text the game wrote for the values the editor never touches and to put
 * that text back verbatim on export. Only the members the user can actually change are taken from
 * the parsed object. The name is stored as a byte array and the role and gender are small
 * integers, so rewriting those is safe.
 *
 * Working on the text rather than on a parsed value avoids needing a JSON parser that copes with
 * the bare Infinity tokens the file contains.
 */

const MARKER = '"characterCustomizationNew"';

/** Members of characterCustomizationNew that the editor is allowed to rewrite. */
const EDITABLE = ['name', 'gender', 'role'];

interface Member {
  key: string;
  start: number;
  end: number;
}

/** The raw text of one member, keyed by property name. */
export interface RawMembers {
  [key: string]: string;
}

/**
 * Reads the raw text of every member of the characterCustomizationNew object straight out of the
 * file text, so the exact numbers the game wrote can be reused.
 *
 * Returns null when the layout is not recognised. The caller then falls back to a plain
 * stringify, which is what the editor did before this existed.
 */
export function readAppearanceMembers(json: string): RawMembers | null {
  const markerAt = json.indexOf(MARKER);
  if (markerAt < 0) {
    return null;
  }
  const openAt = json.indexOf('{', markerAt + MARKER.length);
  if (openAt < 0) {
    return null;
  }

  const members: Member[] = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let key: string | null = null;
  let valueStart = -1;

  for (let i = openAt; i < json.length; i++) {
    const char = json[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
        if (depth === 1 && key === null) {
          key = readKeyStart(json, i);
        }
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{' || char === '[') {
      depth++;
      continue;
    }

    if (char === '}' || char === ']') {
      depth--;
      if (depth === 0) {
        return toMembers(json, members, key, valueStart, i + 1);
      }
      continue;
    }

    if (char === ':' && depth === 1 && key !== null && valueStart < 0) {
      let j = i + 1;
      while (j < json.length && /\s/.test(json[j])) {
        j++;
      }
      valueStart = j;
      i = j - 1;
      continue;
    }

    if (char === ',' && depth === 1) {
      if (key !== null && valueStart >= 0) {
        members.push({ key, start: valueStart, end: trimBack(json, valueStart, i) });
      }
      key = null;
      valueStart = -1;
    }
  }

  return null;
}

/**
 * Rebuilds the export text, taking the members the editor does not change from the raw text of
 * the imported file and everything else from the freshly stringified character.
 */
export function applyAppearanceMembers(json: string, original: RawMembers | null): string {
  const markerAt = json.indexOf(MARKER);
  if (markerAt < 0) {
    return json;
  }
  const openAt = json.indexOf('{', markerAt + MARKER.length);
  if (openAt < 0) {
    return json;
  }
  if (original == null) {
    return json;
  }

  const closeAt = findMatchingBrace(json, openAt);
  if (closeAt < 0) {
    return json;
  }

  const fresh = readMembers(json, openAt, closeAt);
  if (fresh === null) {
    return json;
  }

  const parts: string[] = [];
  for (const key of Object.keys(fresh)) {
    const isEditable = EDITABLE.indexOf(key) !== -1;
    const raw = original[key];
    if (isEditable || raw == null) {
      parts.push(JSON.stringify(key) + ':' + fresh[key]);
    } else {
      parts.push(JSON.stringify(key) + ':' + raw);
    }
  }

  return json.slice(0, openAt) + '{' + parts.join(',') + '}' + json.slice(closeAt + 1);
}

/** The raw text of every member of an object whose braces are at openAt and closeAt. */
function readMembers(json: string, openAt: number, closeAt: number): RawMembers | null {
  const members: Member[] = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let key: string | null = null;
  let valueStart = -1;

  for (let i = openAt; i < closeAt; i++) {
    const char = json[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
        if (depth === 1 && key === null) {
          key = readKeyStart(json, i);
        }
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{' || char === '[') {
      depth++;
      continue;
    }
    if (char === '}' || char === ']') {
      depth--;
      continue;
    }

    if (char === ':' && depth === 1 && key !== null && valueStart < 0) {
      let j = i + 1;
      while (j < closeAt && /\s/.test(json[j])) {
        j++;
      }
      valueStart = j;
      i = j - 1;
      continue;
    }

    if (char === ',' && depth === 1) {
      if (key !== null && valueStart >= 0) {
        members.push({ key, start: valueStart, end: trimBack(json, valueStart, i) });
      }
      key = null;
      valueStart = -1;
    }
  }

  if (key !== null && valueStart >= 0) {
    members.push({ key, start: valueStart, end: trimBack(json, valueStart, closeAt) });
  }

  if (members.length === 0) {
    return null;
  }
  return toRaw(json, members);
}

/** Walks back from end over whitespace so the separator is not swallowed into the member. */
function trimBack(json: string, start: number, end: number): number {
  let stop = end;
  while (stop > start && /\s/.test(json[stop - 1])) {
    stop--;
  }
  return stop;
}

/** Reads the property name of the string that ends at quoteAt, or null when it is not a key. */
function readKeyStart(json: string, quoteAt: number): string | null {
  for (let i = quoteAt - 1; i >= 0; i--) {
    const char = json[i];
    if (char === '"') {
      try {
        return JSON.parse(json.slice(i, quoteAt + 1));
      } catch {
        return null;
      }
    }
    if (!/[\w$]/.test(char)) {
      return null;
    }
  }
  return null;
}

/** Finds the brace that closes the one at openAt, ignoring braces inside strings. */
function findMatchingBrace(json: string, openAt: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = openAt; i < json.length; i++) {
    const char = json[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{' || char === '[') {
      depth++;
    } else if (char === '}' || char === ']') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

function toRaw(json: string, members: Member[]): RawMembers {
  const raw: RawMembers = {};
  for (const member of members) {
    raw[member.key] = json.slice(member.start, member.end);
  }
  return raw;
}

function toMembers(
  json: string,
  members: Member[],
  key: string | null,
  valueStart: number,
  end: number
): RawMembers | null {
  if (key !== null && valueStart >= 0) {
    members.push({ key, start: valueStart, end: trimBack(json, valueStart, end) });
  }
  return members.length > 0 ? toRaw(json, members) : null;
}
