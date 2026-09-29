import { PetTalentData, PetTypes } from '~data';
import { ItemRarity, PET_TALENT_NAMES, PetType } from '~enums';

export interface PetTalentVariant {
  name: string;
  icon: string;
}

type PetTalentVariants = {
  [petType: string]: PetTalentVariant | null;
};

const TABLE = PetTalentData as unknown as { [talentId: string]: PetTalentVariants };

const PET_TYPE_BY_OBJECT_ID = PetTypes as { [objectID: string]: PetType };

/**
 * Which set of talent names and icons the game shows for a pet.
 *
 * The type lives in the pet's ECS state and is never written to the save, so it cannot be read
 * back from a save file. It is recorded per pet item by scripts/pet_talent_data.py, which reads it
 * from the entity prefabs in the game dump. A pet that is not in the table falls back to melee,
 * which is what the game itself does for an unknown pet.
 */
export function getPetType(objectID: number): PetType {
  return PET_TYPE_BY_OBJECT_ID[objectID] ?? PetType.Melee;
}

/**
 * The name and icon of a talent for the given pet type.
 *
 * The game gives every talent a different name and icon per pet type, so a talent looks
 * completely different on a buff pet than on a melee one. A talent that does not exist for a pet
 * type has no entry and falls back to the enum name, since the game has no text for it either.
 */
export function getPetTalentVariant(talent: number, petType: PetType): PetTalentVariant {
  const variants = TABLE[talent];
  const variant = variants?.[petType];
  if (variant) {
    return variant;
  }
  return {
    name: PET_TALENT_NAMES[talent] || 'Talent ' + talent,
    icon: 'assets/pet_talents/pet_talent_' + talent + '.png'
  };
}

/** The rarity colour used for the pet name, matching the item rarity colours. */
export function getPetRarityColor(rarity: ItemRarity | number): string {
  switch (rarity) {
    case 1:
      return '#38c54f';
    case 2:
      return '#328aff';
    case 3:
      return '#cd3bbd';
    case 4:
      return '#ffb426';
    default:
      return '#ffffff';
  }
}
