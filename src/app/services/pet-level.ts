/**
 * The pet level and talent point budget are not stored in the save. The game derives both from
 * the pet's experience, which is the inventory amount, using the curve below. The constants and
 * the formulas come from PetExtensions in the game's Pug.Other assembly.
 */

/** Growth factor of the level curve. */
const MUL_FACTOR = 1.993;

/** Scale of the level curve. */
const BASE_FACTOR = 200;

/** The game stops levelling a pet here. */
export const PET_MAX_LEVEL = 10;

/**
 * The level a pet has reached with the given total experience.
 * Port of PetExtensions.GetLevelFromXP.
 */
export function getPetLevelFromXp(xp: number): number {
  const level =
    1 + Math.trunc(Math.log(1 - (xp * (1 - MUL_FACTOR)) / BASE_FACTOR) / Math.log(MUL_FACTOR));
  return Math.min(level, PET_MAX_LEVEL);
}

/**
 * The total experience a pet needs to reach a level.
 * Port of PetExtensions.GetXPFromLevel, which nudges the value up until the curve agrees.
 */
export function getPetXpForLevel(level: number): number {
  const target = Math.min(level, PET_MAX_LEVEL);
  let xp = Math.round((BASE_FACTOR * (1 - MUL_FACTOR ** (target - 1))) / (1 - MUL_FACTOR));
  while (getPetLevelFromXp(xp) < target) {
    xp++;
  }
  return xp;
}

/** Experience earned within the current level. Port of GetCurrentXpForCurrentLevel. */
export function getPetXpIntoLevel(xp: number): number {
  const level = getPetLevelFromXp(xp);
  if (level === 1) {
    return xp;
  }
  return xp - getPetXpForLevel(level);
}

/** Experience still needed for the next level, zero once the pet is at the maximum. */
export function getPetXpToNextLevel(xp: number): number {
  const level = getPetLevelFromXp(xp);
  if (level >= PET_MAX_LEVEL) {
    return 0;
  }
  return getPetXpForLevel(level + 1) - getPetXpForLevel(level);
}

/** Talent points a pet has earned. Port of GetTotalTalentPoints, one point per two levels. */
export function getPetTalentPointsEarned(xp: number): number {
  return Math.floor(getPetLevelFromXp(xp) / 2);
}
