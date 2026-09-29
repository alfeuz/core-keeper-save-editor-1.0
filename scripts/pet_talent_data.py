"""Build the pet talent display data: display name and icon per PetTalent and PetType.

The game keeps three icons and three names per talent, one per pet type. The icon for a
talent+type pair is recorded in PetInfosTable, and the name is a localisation term
PetTalents/<TalentName><PetType> in the game language file.

Some talents do not exist for every pet type: a few have no icon for one type, and some types
have no localised name because the talent only applies to another. Those pairs are written as
null so the app can fall back instead of showing a wrong icon or name.

Usage: python scripts/pet_talent_data.py
"""
import json
import os
import pickle
import re

ROOT = os.path.join(os.path.dirname(__file__), "..")
DUMP = os.path.join(ROOT, "scripts", "dump", "CoreKeeper", "ExportedProject", "Assets")
SPRITES = os.path.join(DUMP, "Sprite")
TABLE = os.path.join(DUMP, "Resources", "PetInfosTable.asset")
CACHE = os.path.join(ROOT, "scripts", ".cache", "language")
OUT = os.path.join(ROOT, "src", "app", "data", "pet-talents.json")
OUT_PET_TYPES = os.path.join(ROOT, "src", "app", "data", "pet-types.json")
OUT_DIR = os.path.join(ROOT, "src", "assets", "pet_talents")

# PetType is Melee=0, Range=1, Buff=2; the key is what the app looks up.
PET_TYPES = ("melee", "range", "buff")
ICON = 16

# The PetTalent enum member names, needed to build the localisation term.
TALENT_NAMES = {
    0: "MeleeAttackSpeed", 1: "RangeAttackSpeed", 2: "CritChance", 3: "CritDamage",
    4: "MeleeDamage", 5: "RangeDamage", 6: "BossDamage", 7: "ChanceToDealTripleDamage",
    8: "ApplyBurn", 9: "ApplyPoison", 10: "ApplyStun", 11: "ApplySlime", 12: "OrangeGlow",
    13: "BlueGlow", 14: "StunDuration", 15: "DamageIncreaseAgainstStunned", 16: "MovementSpeed",
    17: "ApplySlippery", 18: "DamageBasedOnTargetRemainingHealth", 19: "ChanceToConsumeBurning",
    20: "PiercingProjectiles", 21: "StunAndSnareReduction", 22: "ChanceToGainManaOnAttack",
    23: "ManaRegeneration", 24: "MagicDamage", 25: "MinionAttackSpeed", 26: "ApplyRadiationDamage",
    27: "MinionCritChance", 28: "MinionCritDamage", 29: "MinionDamage", 30: "MinionBossDamage",
    31: "MinionReducedManaReservation", 32: "LifeToOwnerOnMinionHit", 33: "LifeToOwnerOnPetHit",
    34: "RangeHitKnockbackChance", 35: "ChanceToShatterProjectiles", 36: "ExtraShatteredProjectile",
}

ENTRY = re.compile(
    r"- petTalentID: (\d+)\s*\n"
    r"(?:.*\n)*?"
    r"\s*meleeIcon: \{fileID: \d+, guid: ([0-9a-f]+), type: \d+\}\s*\n"
    r"\s*rangeIcon: \{fileID: \d+, guid: ([0-9a-f]+), type: \d+\}\s*\n"
    r"\s*buffIcon: \{fileID: \d+, guid: ([0-9a-f]+), type: \d+\}",
)


def read_sprite_rects():
    """sprite guid -> (x, y) in the atlas, for the 16x16 pet talent icons."""
    rects = {}
    for name in os.listdir(SPRITES):
        if not name.startswith("talent_icons_pet_") or not name.endswith(".asset"):
            continue
        meta = os.path.join(SPRITES, name + ".meta")
        if not os.path.exists(meta):
            continue
        g = re.search(r"guid: ([0-9a-f]+)", open(meta, encoding="utf-8", errors="replace").read())
        t = open(os.path.join(SPRITES, name), encoding="utf-8", errors="replace").read()
        r = re.search(
            r"m_Rect:\s*\n\s*serializedVersion: \d+\s*\n\s*x: (-?\d+)\s*\n\s*y: (-?\d+)\s*\n"
            r"\s*width: (\d+)\s*\n\s*height: (\d+)",
            t,
        )
        if g and r and int(r.group(3)) == ICON and int(r.group(4)) == ICON:
            rects[g.group(1)] = (int(r.group(1)), int(r.group(2)))
    return rects


def main():
    from PIL import Image

    rects = read_sprite_rects()
    with open(CACHE, "rb") as f:
        terms = {e["term"]: e["value"] for e in pickle.load(f)}

    text = open(TABLE, encoding="utf-8", errors="replace").read()
    block = text[text.find("petTalents:"):]

    os.makedirs(OUT_DIR, exist_ok=True)
    for name in os.listdir(OUT_DIR):
        os.remove(os.path.join(OUT_DIR, name))
    atlas = Image.open(os.path.join(DUMP, "Texture2D", "talent_icons_pet.png")).convert("RGBA")

    data = {}
    for m in ENTRY.finditer(block):
        talent_id = int(m.group(1))
        entry = {}
        for key, guid in zip(PET_TYPES, m.group(2, 3, 4)):
            suffix = key.capitalize()
            name = terms.get("PetTalents/%s%s" % (TALENT_NAMES.get(talent_id), suffix))
            rect = rects.get(guid)
            if rect is None or not name:
                entry[key] = None
                continue
            x, y = rect
            file_name = "pet_talent_%d_%s.png" % (talent_id, key)
            atlas.crop((x, y, x + ICON, y + ICON)).save(os.path.join(OUT_DIR, file_name))
            entry[key] = {"icon": "assets/pet_talents/" + file_name, "name": name}
        data[str(talent_id)] = entry

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"), ensure_ascii=False)

    pairs = sum(1 for v in data.values() for k in PET_TYPES if v[k])
    print("talents              : %d" % len(data))
    print("name + icon pairs    : %d of %d" % (pairs, len(data) * len(PET_TYPES)))
    print("icons written        : %d" % len(os.listdir(OUT_DIR)))
    print("data file            : %s (%.1f KB)" % (OUT, os.path.getsize(OUT) / 1024))
    write_pet_types()


def write_pet_types():
    """Record the pet type of every pet, which selects the talent name and icon to show.

    The type lives in the pet's ECS state and is never written to the save, so it is read from
    the entity prefabs in the dump instead. PetType is Melee=0, Range=1, Buff=2.
    """
    prefabs = os.path.join(DUMP, "GameObject")
    items_path = os.path.join(ROOT, "src", "app", "data", "item-data.json")
    with open(items_path, encoding="utf-8") as f:
        items = json.load(f)["items"]

    pets = sorted(
        (int(k), v["objectName"])
        for k, v in items.items()
        if v.get("objectType") == 802
    )

    result = {}
    for object_id, name in pets:
        path = os.path.join(prefabs, name + "Entity.prefab")
        if not os.path.exists(path):
            continue
        text = open(path, encoding="utf-8", errors="replace").read()
        match = re.search(r"petType: (\d+)", text)
        if match:
            result[str(object_id)] = PET_TYPES[int(match.group(1))]

    with open(OUT_PET_TYPES, "w", encoding="utf-8") as f:
        json.dump(result, f, separators=(",", ":"), indent=None)

    counts = {}
    for value in result.values():
        counts[value] = counts.get(value, 0) + 1
    print("pet types written    : %d of %d pets %s" % (len(result), len(pets), counts))


if __name__ == "__main__":
    main()
