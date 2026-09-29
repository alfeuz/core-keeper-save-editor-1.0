/**
 * How a pet fights. The game shows a different name and icon for every talent depending on this,
 * and it is stored in the pet's ECS state rather than in the save file.
 */
export enum PetType {
  Melee = 'melee',
  Range = 'range',
  Buff = 'buff'
}

export enum PetTalent {
  MeleeAttackSpeed = 0,
  RangeAttackSpeed = 1,
  CritChance = 2,
  CritDamage = 3,
  MeleeDamage = 4,
  RangeDamage = 5,
  BossDamage = 6,
  ChanceToDealTripleDamage = 7,
  ApplyBurn = 8,
  ApplyPoison = 9,
  ApplyStun = 10,
  ApplySlime = 11,
  OrangeGlow = 12,
  BlueGlow = 13,
  StunDuration = 14,
  DamageIncreaseAgainstStunned = 15,
  MovementSpeed = 16,
  ApplySlippery = 17,
  DamageBasedOnTargetRemainingHealth = 18,
  ChanceToConsumeBurning = 19,
  PiercingProjectiles = 20,
  StunAndSnareReduction = 21,
  ChanceToGainManaOnAttack = 22,
  ManaRegeneration = 23,
  MagicDamage = 24,
  MinionAttackSpeed = 25,
  ApplyRadiationDamage = 26,
  MinionCritChance = 27,
  MinionCritDamage = 28,
  MinionDamage = 29,
  MinionBossDamage = 30,
  MinionReducedManaReservation = 31,
  LifeToOwnerOnMinionHit = 32,
  LifeToOwnerOnPetHit = 33,
  RangeHitKnockbackChance = 34,
  ChanceToShatterProjectiles = 35,
  ExtraShatteredProjectile = 36
}

/**
 * Names of the pet talents, keyed by their PetTalent id.
 *
 * TypeScript drops the reverse mapping of a numeric enum when it compiles, so PetTalent[id]
 * is undefined at runtime. This table is built from the enum instead of hardcoding it a
 * second time, so the two can never drift apart.
 */
export const PET_TALENT_NAMES: { [id: number]: string } = Object.keys(PetTalent)
  .filter(key => isNaN(Number(key)))
  .reduce((names, key) => {
    names[PetTalent[key]] = key;
    return names;
  }, {} as { [id: number]: string });
