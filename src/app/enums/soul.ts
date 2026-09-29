export enum Soul {
  SoulOfAzeos = 1,
  SoulOfOmoroth = 2,
  SoulOfScarab = 3,
  SoulOfNatureHydra = 4,
  SoulOfSeaHydra = 5,
  SoulOfDesertHydra = 6
}

export interface SoulDefinition {
  id: Soul;
  /** Name shown in the character page. */
  name: string;
  /** Asset file name, without the _1 (unchecked) / _2 (checked) suffix. */
  image: string;
}

/**
 * All souls the game can currently collect, in SoulID order.
 * Verified against the SoulID enum in the game's Pug.Base assembly, which ends at
 * SoulOfDesertHydra = 6 followed by a __MAX_VALUE = 7 sentinel.
 */
export const SOULS: SoulDefinition[] = [
  { id: Soul.SoulOfAzeos, name: 'Azeos', image: 'azeos' },
  { id: Soul.SoulOfOmoroth, name: 'Omoroth', image: 'omoroth' },
  { id: Soul.SoulOfScarab, name: 'Ra-Akar', image: 'ra_akar' },
  { id: Soul.SoulOfNatureHydra, name: 'Druidra', image: 'druidra' },
  { id: Soul.SoulOfSeaHydra, name: 'Crydra', image: 'crydra' },
  { id: Soul.SoulOfDesertHydra, name: 'Pyrdra', image: 'pyrdra' }
];
