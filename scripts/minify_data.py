# Which fields of the game data the Angular app actually reads.
# Regenerate the shipped JSON with: python scripts/minify_data.py
import json
import os
import subprocess
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..")

# Fields read by the app, verified against the TypeScript sources.
ITEM_FIELDS = [
    "objectID",      # identity, drag&drop, cross-referencing
    "objectName",    # saved into inventoryObjectNames when dropped from the browser
    "name",          # tooltips and the item detail panel
    "description",   # item detail panel
    "initialAmount", # durability / stack cap
    "objectType",    # category filter and the equipment slot predicates
    "rarity",        # border colour and the rarity label
    "isStackable",   # amount vs durability input
    "iconIndex",     # offset into the item spritesheet
    "setBonusId",    # set bonus lookup
    "whenEquipped",  # condition list
    "damage",        # damage range and reinforcement bonus
    "cooldown",      # attacks per second
]

CONDITION_FIELDS = [
    "description",  # the {0:N} template
    "isUnique",     # green highlight for unique conditions
]


def prune(value, fields):
    if isinstance(value, dict):
        return {k: v for k, v in value.items() if k in fields and v is not None}
    return value


def report(path, before, after):
    print("%-24s %8.1f KB -> %8.1f KB  (-%.0f%%)" % (
        os.path.basename(path), before / 1024, after / 1024, 100 - after * 100.0 / before))


def main():
    path = os.path.join(ROOT, "src", "app", "data", "item-data.json")
    raw = open(path, encoding="utf-8").read()
    data = json.loads(raw)

    for section, fields in (("items", ITEM_FIELDS), ("conditionData", CONDITION_FIELDS)):
        if isinstance(data.get(section), dict):
            for key, value in data[section].items():
                data[section][key] = prune(value, fields)

    out = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    open(path, "w", encoding="utf-8").write(out)
    report(path, len(raw), len(out))

    # The default character is padded to 130 inventory slots at runtime, so shipping a full
    # 130-slot copy only bloats the bundle.
    dpath = os.path.join(ROOT, "src", "assets", "default_character.json")
    draw = open(dpath, encoding="utf-8").read()
    character = json.loads(draw)
    trimmed = dict(character)
    trimmed["inventory"] = character["inventory"][:1]
    for key in ("inventoryObjectNames", "inventoryAuxData", "lockedObjects"):
        if key in character:
            trimmed[key] = character[key][:1]
    out = json.dumps(trimmed, separators=(",", ":"), ensure_ascii=False)
    open(dpath, "w", encoding="utf-8").write(out)
    report(dpath, len(draw), len(out))

    # The spritesheet only needs as many icons as the data references.
    sheet = os.path.join(ROOT, "src", "assets", "item-spritesheet.png")
    indices = [v["iconIndex"] for v in data["items"].values() if "iconIndex" in v]
    if indices:
        print("%-24s max iconIndex=%d of %d icons in the sheet" % (
            os.path.basename(sheet), max(indices), os.path.getsize(sheet) // 16))


if __name__ == "__main__":
    main()
