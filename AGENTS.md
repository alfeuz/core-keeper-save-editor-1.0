# AGENTS.md

Notes for AI agents and contributors working on this repository.
Read this before changing anything. The most common task is **"the game updated, bring the editor
up to date"** — jump to [Game update](#game-update) for that.

## This is a fork

`alfeuz/core-keeper-save-editor-1.0` is a community-maintained fork of
[halilbahar/core-keeper-save-editor](https://github.com/halilbahar/core-keeper-save-editor/), which
has been unmaintained for several years. The upstream remote is kept as `upstream` for diffing.

Licensed under **GPL-3.0**, inherited from the original. Three consequences for any change here:

- The license cannot be changed, and the whole work stays GPL-3.0.
- Keep the original copyright and licence notices intact.
- Keep stating that this is a modified work, and keep crediting the original author. Attribution
  lives in `README.md` (§Credits), `src/app/pages/about/about.component.html`, and the header of
  `CONTRIBUTING.md`. If you add a feature, add a line to that Credits list.
- The published repo is `https://github.com/alfeuz/core-keeper-save-editor-1.0` and Pages is
  `https://alfeuz.github.io/core-keeper-save-editor-1.0`. The path segment
  `core-keeper-save-editor-1.0` is hardcoded in `package.json` (`build:github.io`) and in the
  `og:`/`twitter:` meta tags in `src/index.html`. Change all of them together.

---

## Stack

Angular 15 (standalone components, `*ngIf`/`*ngFor` common module, no signals), TypeScript 4.8,
RxJS 7.5, `@ngneat/until-destroy` for subscription teardown, Angular CDK drag-drop, Tailwind 3.2
with `@apply` in component SCSS.

| Command | Purpose |
|---|---|
| `npm start` | Dev server on `http://localhost:4200` |
| `npm run build` | Production build into `dist/` |
| `npm run lint` | ESLint + Prettier. Must pass before you call a task done |
| `npm test` | Karma. **No `*.spec.ts` exists in the repo** — do not assume tests cover anything |

The build prints a bundle budget warning on every run. That warning is expected and is **not** a
regression; see [Bundle budget](#bundle-budget).

---

## Game update

The editor stores no game data itself. Item/condition/talent data is **extracted from the game
files by Python scripts** and committed into the repo. So a game update is mostly a data refresh,
and only needs code changes when the *shape* of the game data changes.

### Start here: pick your case

| What the update added | Do this | Code change? |
|---|---|---|
| New items in **existing** categories | Steps 1–5 below | No |
| Rebalanced existing items/conditions | Steps 1–5 below | No |
| A **new item category** (`objectType`) | Steps 1–5, then add the enum + browser entry | Small |
| A **new equipment slot** | Steps 1–5, then see [New equipment slot](#new-equipment-slot) | Large |
| A new **soul** | Add to `src/app/enums/soul.ts` + drop the icon in `src/assets/souls/` | Small |
| A new/rebalanced **pet or talent** | Run `pet_talent_data.py` as part of step 3 | No |
| A new **condition** whose value looks 10x off | See `scripts/README.adoc` §"Conditions which are off of a factor of 10" | Maybe |
| **Skill** rebalancing | Constants are hardcoded in `src/app/services/skill-talent.service.ts` | Manual |

### The steps

```bash
# 1. Export the game files with AssetRipper (Windows only, it does not extract everything on Linux)
#    File > Open Folder > C:\Program Files (x86)\Steam\steamapps\common\Core Keeper
#    Export > Export all Files  ->  produces  scripts/dump/

# 2. MANDATORY: drop the cache, otherwise you get stale translations
rm -rf scripts/.cache

# 3. Extract
cd scripts
./items.py && ./conditions.py && ./talents.py
python pet_talent_data.py          # pets / talent icons
cd ..

# 4. Copy the output into the app
cd scripts && ./deploy.py && cd ..

# 5. Trim the JSON to the fields the app actually reads  (MUST run AFTER deploy.py)
python scripts/minify_data.py

# 6. Verify
npm run lint && npm run build
```

Step 2 is the one people forget. `scripts/util.py` caches the language file as a pickle in
`scripts/.cache/language`; if that file exists, `get_translations()` never reads the new game
files. The symptom is new items showing a spaced-out enum name like `Training Dummy` instead of
their real name, via the fallback at `scripts/items.py:267`.

Step 5 must run after step 4 — `deploy.py` writes the full JSON, `minify_data.py` trims it.
Running them in the other order just wastes a step.

`deploy.py` also rewrites `--spritesheet-width` in `src/variables.scss` for you. Do not hand-edit
that number.

### New item category

1. Add the value to `src/app/enums/item-categories.ts`.
2. Add an entry to the `categories` array in
   `src/app/pages/items/components/item-browser/item-browser.component.ts`. Note the `★` group
   entries use an `ids: [...]` array instead of a single `id`.

A category missing from step 2 does **not** break anything: the item is still reachable through
the `all` category and through search. It just gets no dedicated filter. There is a live example —
`objectType 1700` (Training Dummy) is in the data but in neither list.

### New equipment slot

This changes the save file layout, so it touches several places. Find them by the exported
constants in `src/app/services/character.service.ts` (`FIRST_EQUIPMENT_SLOT`,
`LAST_EQUIPMENT_SLOT`, `BAG_SLOT`, `INVENTORY_SLOTS`, `TOOLBAR_SLOTS`, `BAG_SLOTS`,
`BASE_BAG_SLOTS`) rather than by typing numbers:

- `src/app/pages/items/components/equipment/equipment.component.ts` — the rendered slot window
- `src/app/services/drag-n-drop.service.ts` — `indexAllowedObjectTypes` and `bagDropListId`
- `src/app/pages/items/components/item/item.component.html` — the equipment placeholder images
- `src/app/services/character.service.ts` — the slot count, and `removeItemFromInventory`'s bag reset
- `INVENTORY_SLOTS` if the save grew more slots than 130

---

## Save file invariants

These are correctness rules. Breaking one **corrupts the user's character**, so never "simplify"
them away.

1. **The editor stores only references, not item data.** The save keeps
   `objectID / amount / variation / variationUpdateCount`, plus `objectName` as a plain string when
   an item is dropped from the browser. A bad data regeneration can therefore produce a wrong icon
   or a wrong name, but it cannot corrupt an existing save. An `objectID` the app does not know
   renders `assets/item-not-found.png` instead of crashing.

2. **`amount` is durability.** There is no `durability` field and no `itemHashesToAmounts` in this
   format. For non-stackables the cap is `initialAmount * 2`, because a reinforced item holds twice
   its listed durability. Stackables cap at 999.

3. **The four inventory arrays must stay the same length.** `inventory`, `inventoryObjectNames`,
   `inventoryAuxData` and `lockedObjects` are read by the game by the same index. Keep them padded
   to `INVENTORY_SLOTS` (130) via `CharacterService.alignInventoryArrays()`, which runs on both
   import and export. It only ever pads; it never truncates, so real game data is never dropped.

4. **`characterCustomizationNew` holds 64-bit numbers.** `m_low` / `m_high` are 64-bit colour
   values, e.g. `-633635439416787485`. A JS number cannot hold them, so `JSON.parse` +
   `JSON.stringify` rounds them and silently changes the character's appearance.
   `src/app/services/appearance-json.ts` keeps the raw text of every member and writes it back
   verbatim on export. Only `name`, `gender` and `role` are taken from the parsed object.
   The raw members are also persisted to `localStorage` under
   `core-keeper-save-editor.appearance` — **without that, importing, reloading the page and
   exporting corrupts the appearance.** This was a real bug; do not remove the storage round trip.

5. **The file is not valid JSON.** Amber larva / giant mushroom leave bare `Infinity` tokens.
   `escapeInfinity` / `unescapeInfinity` in `src/app/services/infinity.ts` swap them for a
   placeholder on import and restore them on export. Never `JSON.parse` the raw file directly.

6. **Every mutation must call `CharacterService.store()`.** The app re-hydrates from `localStorage`
   on load, so a mutation that skips `store()` survives in memory and is silently lost on reload.
   `onAmountChange` in `item-detail.component.ts` was missing this and it cost users their edits.

---

## Gotchas

- **Inventory views are slices, not copies.** `inventory.component.ts` and `equipment.component.ts`
  use `Array.prototype.slice`, which keeps the same object references. That is what lets the item
  detail panel mutate a slot in place. Replacing those slices with `map` or object spread would
  silently break every edit.
- **The item detail panel caches a slot reference and an index.** It is safe today only because
  `item.component.html` resets the selection to `-1` on `cdkDragStarted`, so a stale index cannot
  survive a drag. If that reset is ever removed, the Remove button starts deleting the wrong item.
- **Durability input** shows the real cap (`initialAmount * 2`), not `initialAmount`, and shows an
  error message when the value is out of range. Both were wrong before; keep them.
- **`ItemDataService.getItemDetail` must not mutate the imported `item-data.json`.** It copies
  `damage` before adding `reinforcementBonus`.
- **The download link must be in the document** and the object URL must be revoked in a `setTimeout`,
  not synchronously after `click()`.
- `scripts/blacklist.py` holds objectIDs that are *not* real items. `items.py` logs prefabs with no
  icon or no translation — that log is how you find items wrongly excluded.

---

## Verification

There is no automated test suite, so verify by hand. Use the real save in
`sample_save/original_0.json` (gitignored, keep it local).

1. `npm run lint` and `npm run build` both pass.
2. Import `sample_save/original_0.json` and export it again, then diff the two files.
   **Only `skills` (re-sorted) and `skillTalentTreeDatas` (padded to 8 points) may differ.**
   Any difference in `inventory`, `inventoryAuxData` or the appearance numbers is a bug.
3. Edit an amount and a durability, then **reload the page** and export again. The values must
   still be there. This is what catches a missing `store()`.
4. Compare the big numbers, e.g. `"m_low":8049113716129456219`, character for character. A plain
   `JSON.parse`/`stringify` round trip turns that into `8049113716129456000`.
5. Check every tab renders: Items, Pets, Skills, Character.
6. Check a truncated or hand-edited save still exports with all four inventory arrays at 130.

Do not leave scratch files in `src/assets/`. `dump/`, `out/`, `.cache/` and `sample_save/` are
gitignored.

---

## Bundle budget

`angular.json` sets `maximumError: 1mb` for the initial bundle. The build currently sits at about
**996 kB**, and `item-data.json` costs roughly **277 bytes per item**, so there is only room for
about **100 more items** before the build fails outright.

The `500kb` warning on every build is pre-existing and harmless. If a large update pushes past
1 MB, the lever is `scripts/minify_data.py`, which strips fields the app never reads — add the new
field to its `ITEM_FIELDS` list only if the app actually reads it.

---

## House rules

- Match the existing code style; run `npm run lint` before declaring a task done.
- Document non-obvious logic with comments that explain *why*.
- Keep changes focused, and do not commit or push unless explicitly asked.
- Prefer fixing the root cause over guarding against symptoms. Several bugs here were silent
  failures; add a visible error or an assertion rather than letting a bad value pass through.
