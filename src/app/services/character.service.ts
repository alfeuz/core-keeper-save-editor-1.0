import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { Bag } from '~enums';
import { Character } from '~models';
import {
  applyAppearanceMembers,
  RawMembers,
  readAppearanceMembers
} from '~services/appearance-json';
import { unescapeInfinity } from '~services/infinity';

// eslint-disable-next-line no-restricted-imports
import DefaultCharacter from '../../assets/default_character.json';

/**
 * The save file stores the inventory as one slot list plus three arrays that have to line up with
 * it slot for slot. The layout the game uses is a toolbar, a bag that grows with the equipped bag,
 * a run of bag slots that stay hidden, and then the equipment slots. Several places need these
 * boundaries, so they are declared once here instead of being repeated as bare numbers that can
 * drift apart.
 */
export const INVENTORY_SLOTS = 130;
export const TOOLBAR_SLOTS = 10;
export const BAG_SLOTS = 40;
/** How many bag slots are visible while no bag is equipped. */
export const BASE_BAG_SLOTS = 20;
export const FIRST_EQUIPMENT_SLOT = 51;
export const LAST_EQUIPMENT_SLOT = 58;
/** The slot that holds the equipped bag, which decides how big the bag is. */
export const BAG_SLOT = 58;

const CHARACTER_STORAGE_KEY = 'core-keeper-save-editor.character';
const INDEX_STORAGE_KEY = 'core-keeper-save-editor.index';
const APPEARANCE_STORAGE_KEY = 'core-keeper-save-editor.appearance';

@Injectable({
  providedIn: 'root'
})
export class CharacterService {
  $character: BehaviorSubject<Character> = new BehaviorSubject(null);
  $index: BehaviorSubject<number> = new BehaviorSubject(null);
  $bag: BehaviorSubject<Bag> = new BehaviorSubject(null);

  /**
   * The exact numbers the game wrote for the character's appearance, kept so export can put
   * them back verbatim. A JavaScript number cannot hold those 64 bit values, so reading and
   * writing the character through JSON would round them and change how the character looks.
   */
  private appearanceMembers: RawMembers | null = null;

  constructor() {
    const characterJsonInStorage = localStorage.getItem(CHARACTER_STORAGE_KEY);
    const characterIndexInStorage = localStorage.getItem(INDEX_STORAGE_KEY);
    if (characterJsonInStorage != null && characterIndexInStorage != null) {
      const character = JSON.parse(characterJsonInStorage) as Character;
      this.setCharacter(character, +characterIndexInStorage, this.readStoredAppearance());
    } else {
      this.setCharacter(this.getDefaultCharacterWithRandomGUID(), 0);
    }
  }

  /**
   * Set the current Character which the application will edit and the index how the file was encrypted
   */
  setCharacter(character: Character, index: number, appearanceMembers?: RawMembers | null): void {
    // Set before the character is pushed out, so anything that reacts to the new character and
    // stores it writes the matching appearance numbers.
    this.appearanceMembers = appearanceMembers ?? null;
    this.alignInventoryArrays(character);

    this.$character.next(character);
    this.$index.next(index);
    const objectID = character.inventory[BAG_SLOT]?.objectID ?? 0;
    const bag = objectID in Bag ? objectID : Bag.None;
    this.$bag.next(bag);

    // Skill are added later to the file, when earned the first xp
    // Create them if they dont exist
    for (let i = 0; i < 12; i++) {
      const skill = character.skills.find(skill => skill.skillID === i);
      if (skill == null) {
        character.skills.push({ skillID: i, value: 0 });
        character.skillTalentTreeDatas.push({
          skillTreeID: i,
          points: [0, 0, 0, 0, 0, 0, 0, 0]
        });
      } else {
        const skillTree = character.skillTalentTreeDatas.find(talent => talent.skillTreeID === i);
        // If nothing was skilled, the skillTree is not initialized so we create one
        if (skillTree == null) {
          character.skillTalentTreeDatas.push({
            skillTreeID: i,
            points: [0, 0, 0, 0, 0, 0, 0, 0]
          });
        } else {
          // If you only level up the first talent, the other ones are not created, fill them up
          for (let p = skillTree.points.length; p < 8; p++) {
            skillTree.points[p] = 0;
          }
        }
      }
    }

    // And afterwards sort them so it looks like the game ui when rendering them in a loop
    character.skills.sort((a, b) => a.skillID - b.skillID);
    character.skillTalentTreeDatas.sort((a, b) => a.skillTreeID - b.skillTreeID);
  }

  /**
   * Serialise the character, restoring the exact appearance numbers the game wrote.
   * @returns the save file text, still holding the bare Infinity tokens
   */
  serialize(): string {
    this.alignInventoryArrays(this.$character.value);
    return unescapeInfinity(
      applyAppearanceMembers(JSON.stringify(this.$character.value), this.appearanceMembers)
    );
  }

  /**
   * Save the current character into local storage.
   * This value will be loaded when you load the site again (constructor of this service)
   */
  store(): void {
    const character = this.$character.value;
    const characterJson = JSON.stringify(character);
    const characterIndex = this.$index.value;
    localStorage.setItem(CHARACTER_STORAGE_KEY, characterJson);
    localStorage.setItem(INDEX_STORAGE_KEY, characterIndex + '');

    // The raw appearance text has to be kept next to the character. The character in storage is
    // already rounded, so without these numbers an export after a reload would change the
    // character's colours.
    if (this.appearanceMembers == null) {
      localStorage.removeItem(APPEARANCE_STORAGE_KEY);
    } else {
      localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(this.appearanceMembers));
    }
  }

  /**
   * Load the default character and update localstorage
   */
  resetToDefaultCharacter() {
    const defaultCharacter = this.getDefaultCharacterWithRandomGUID();
    this.setCharacter(defaultCharacter, 0);
  }

  /**
   * @param bag
   * @returns how many slot the given bag has.
   */
  getBagSize(bag: Bag): number {
    if (!Object.values(Bag).includes(bag) || bag === Bag.None) {
      return 0;
    }

    switch (bag) {
      case Bag.CavePouch:
      case Bag.SmallBackpack:
        return 5;
      case Bag.ExplorerBackpack:
        return 10;
      case Bag.GhormsStomachBag:
        return 12;
      case Bag.ScarletShellBackpack:
        return 15;
      case Bag.MorphasBubbleBag:
      case Bag.OctarineBag:
      case Bag.ScholarBackpack:
        return 20;
    }
  }

  /**
   * Removes the item at the specified index from the inventory
   */
  removeItemFromInventory(index: number): void {
    const character = this.$character.value;
    const inventory = character.inventory;
    inventory[index].objectID = 0;
    inventory[index].amount = 0;
    inventory[index].variation = 0;
    inventory[index].variationUpdateCount = 0;

    if (character.inventoryObjectNames && character.inventoryObjectNames.length > index) {
      character.inventoryObjectNames[index] = '';
    }
    if (character.inventoryAuxData && character.inventoryAuxData.length > index) {
      character.inventoryAuxData[index] = { index: 0, data: '' };
    }
    if (character.lockedObjects && character.lockedObjects.length > index) {
      character.lockedObjects[index] = false;
    }

    // Reset bag so the inventory resizes
    if (index === BAG_SLOT) {
      this.$bag.next(Bag.None);
    }
    this.store();
  }

  /**
   * The game reads the inventory and the three arrays beside it by the same index, so a missing or
   * short array would make it read the wrong item's data. Pad them to the slot count on both import
   * and export. Nothing is ever dropped, so data from the game is left alone.
   */
  private alignInventoryArrays(character: Character): void {
    while (character.inventory.length < INVENTORY_SLOTS) {
      character.inventory.push({ objectID: 0, amount: 0, variation: 0, variationUpdateCount: 0 });
    }

    if (!character.inventoryObjectNames) {
      character.inventoryObjectNames = [];
    }
    while (character.inventoryObjectNames.length < character.inventory.length) {
      character.inventoryObjectNames.push('');
    }

    if (!character.inventoryAuxData) {
      character.inventoryAuxData = [];
    }
    while (character.inventoryAuxData.length < character.inventory.length) {
      character.inventoryAuxData.push({ index: 0, data: '' });
    }

    if (!character.lockedObjects) {
      character.lockedObjects = [];
    }
    while (character.lockedObjects.length < character.inventory.length) {
      character.lockedObjects.push(false);
    }
  }

  /**
   * @returns the raw appearance numbers kept from the imported file, or null when there are none
   */
  private readStoredAppearance(): RawMembers | null {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (stored == null) {
      return null;
    }
    try {
      return JSON.parse(stored) as RawMembers;
    } catch {
      // A corrupt entry only costs the exact appearance numbers, so drop it and carry on.
      localStorage.removeItem(APPEARANCE_STORAGE_KEY);
      return null;
    }
  }

  /**
   * @returns default character with random guid
   */
  private getDefaultCharacterWithRandomGUID(): Character {
    const defaultCharacter = JSON.parse(JSON.stringify(DefaultCharacter)) as Character;
    // defaultCharacter.characterGuid = crypto.randomUUID().replace(/-/g, '');
    defaultCharacter.characterGuid = this.uuidv4().replace(/-/g, '');
    return defaultCharacter;
  }

  /**
   * Generate a random uuid v4. https://stackoverflow.com/a/2117523/11125147
   * @returns random uuid v4
   */
  private uuidv4() {
    // @ts-ignore
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
  }
}
