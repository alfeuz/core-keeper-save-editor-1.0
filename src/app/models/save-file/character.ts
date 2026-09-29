import { CharacterCustomization } from './character-customization';
import { Condition } from './condition';
import { InventorySlot } from './inventory-slot';
import { Server } from './server';
import { Skill } from './skill';
import { SkillTalentTree } from './skill-talent-tree';

export interface Character {
  version: number;
  characterGuid: string;
  characterCustomization: CharacterCustomization;
  characterCustomizationNew?: any;
  discoveredObjects: [];
  servers: Server[];
  skills: Skill[];
  activatedCrystals: [];
  inventory: InventorySlot[];
  inventoryObjectNames?: string[];
  inventoryAuxData?: { index: number; data: string }[];
  lockedObjects?: boolean[];
  conditionsList: Condition[];
  hasUnlockedSouls: boolean;
  coinAmount: number;
  collectedSouls: number[];
  maxHealth: number;
  serverConnectCount: number;
  skillTalentTreeDatas: SkillTalentTree[];
  characterType: number;
  discoveredBiomes: [];
  discoveredObjects2: InventorySlot[];
  disabledSoulPowers: [];
  hasPlayedOutro?: boolean;
  completedTutorials?: number[];
  lastActiveSession?: any;
  health?: number;
}
