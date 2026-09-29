import { Injectable } from '@angular/core';

import { ItemRarity, PET_TALENT_NAMES, PetType } from '~enums';
import { Character, InventorySlot } from '~models';
import {
  CharacterService,
  getPetLevelFromXp,
  getPetRarityColor,
  getPetTalentPointsEarned,
  getPetTalentVariant,
  getPetType,
  getPetXpIntoLevel,
  getPetXpToNextLevel,
  ItemDataService,
  PET_MAX_LEVEL
} from '~services';

/**
 * A talent entry as stored in the pet's inventoryAuxData payload. The game writes it with
 * capitalised keys, for example {"Talent":0,"Points":1}.
 */
export interface PetTalentPoint {
  Talent: number;
  Points: number;
}

/** A stored talent point together with the name and icon the game shows for it. */
export interface PetTalent {
  talent: number;
  name: string;
  icon: string;
  points: number;
}

export interface PetInfo {
  slotIndex: number;
  objectID: number;
  name: string;
  rarity: ItemRarity;
  rarityColor: string;
  /** Which of the three talent variants this pet shows, see getPetType. */
  petType: PetType;
  /** Experience, stored as the inventory amount. */
  xp: number;
  /** Level derived from the experience, see pet-level.ts. */
  level: number;
  maxLevel: number;
  /** Experience earned within the current level. */
  xpIntoLevel: number;
  /** Experience still needed for the next level, zero at the maximum. */
  xpToNextLevel: number;
  talents: PetTalent[];
  /** Points spent on the talents. */
  spentPoints: number;
  /** Points the level has earned, so spent + available. */
  earnedPoints: number;
  /** Points still available to spend. */
  availablePoints: number;
}

/**
 * Pets are ordinary inventory items (objectType 802) that carry their talent points in the
 * matching inventoryAuxData entry, as a JSON payload of prefab hashes.
 *
 * The level is not stored anywhere: the game derives it from the experience, which is the
 * inventory amount, so editing the XP here is enough to change the level too. The talent points
 * are only read. Writing them back means reproducing the game's prefabHash and stableTypeHash
 * values, and a wrong hash makes the game discard the pet.
 */
@Injectable({
  providedIn: 'root'
})
export class PetService {
  /** stableTypeHash of the field holding the talent point list. */
  private readonly talentTypeHash = 16038764625220822319;

  constructor(
    private characterService: CharacterService,
    private itemDataService: ItemDataService
  ) {}

  /** Every pet the character carries, in inventory order. */
  getPets(): PetInfo[] {
    return this.collect(this.characterService.$character.value);
  }

  /**
   * Rewrites the pet's XP, which is the inventory amount. Anything that is not a plain
   * non-negative safe integer is rejected so the value stays valid in the save.
   */
  setXp(slotIndex: number, xp: number): boolean {
    if (!Number.isSafeInteger(xp) || xp < 0) {
      return false;
    }
    const slot = this.characterService.$character.value?.inventory[slotIndex];
    if (slot == null) {
      return false;
    }
    slot.amount = xp;
    this.characterService.store();
    return true;
  }

  private collect(character: Character | null): PetInfo[] {
    if (character == null) {
      return [];
    }

    const pets: PetInfo[] = [];
    for (let index = 0; index < character.inventory.length; index++) {
      const slot: InventorySlot = character.inventory[index];
      const itemData = this.itemDataService.getData(slot?.objectID);
      if (itemData?.objectType !== 802) {
        continue;
      }
      const talents = this.readTalents(character, index);
      const level = getPetLevelFromXp(slot.amount);
      const petType = getPetType(slot.objectID);
      const earnedPoints = getPetTalentPointsEarned(slot.amount);
      const spentPoints = talents.reduce((sum, talent) => sum + talent.Points, 0);
      pets.push({
        slotIndex: index,
        objectID: slot.objectID,
        name: itemData.name,
        rarity: itemData.rarity as ItemRarity,
        rarityColor: getPetRarityColor(itemData.rarity),
        petType,
        xp: slot.amount,
        level,
        maxLevel: PET_MAX_LEVEL,
        xpIntoLevel: getPetXpIntoLevel(slot.amount),
        xpToNextLevel: getPetXpToNextLevel(slot.amount),
        talents: talents.map(point => {
          const variant = getPetTalentVariant(point.Talent, petType);
          return {
            talent: point.Talent,
            name: variant.name,
            icon: variant.icon,
            points: point.Points
          };
        }),
        spentPoints,
        earnedPoints,
        availablePoints: Math.max(0, earnedPoints - spentPoints)
      });
    }
    return pets;
  }

  private readTalents(character: Character, index: number): PetTalentPoint[] {
    const raw = character.inventoryAuxData?.[index]?.data;
    if (!raw) {
      return [];
    }

    try {
      const payload = JSON.parse(raw);
      for (const prefab of payload.prefabs ?? []) {
        for (const type of prefab.types ?? []) {
          if (type.stableTypeHash === this.talentTypeHash) {
            return (type.data ?? []).map((entry: string) => JSON.parse(entry));
          }
        }
      }
    } catch {
      // A payload we cannot parse is left alone rather than reported as broken
    }
    return [];
  }
}

/**
 * The pet type and the rarity colour are resolved by the helpers in pet-talent.ts.
 */
