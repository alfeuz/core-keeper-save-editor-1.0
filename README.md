# Core Keeper Save Editor

A simple browser based **Save File Editor** for **Core Keeper**.

> **This is a community-maintained fork.** The original project by
> [halilbahar](https://github.com/halilbahar/core-keeper-save-editor/) has been unmaintained for
> several years. This fork updates it for recent game versions and fixes data-loss bugs in the save
> round trip. It is a modified work and remains licensed under the
> [GPL-3.0](./LICENSE) — see [Credits](#credits) for the full attribution.

## Features

**Core-Keeper-Save-Editor** alows you to comfortably edit various aspects of your character's **save-file** from your browser.

### Editing The Inventory

Search for items in the **item-browser** and simply drag-and-drop them into your inventory.

![Inventory](./.github/assets/inventory.gif)

### Editing Skills & Talents

Set the **level** of each of the 9 skills and **distribute points** to talents in the talent-tree.

![Inventory](./.github/assets/skills.gif)

### Editing Character Information

Edit character specific information, such as **Name**, **Hardcore-Status**, **Saveslot-Index** and **Obtained Souls**

![Inventory](./.github/assets/character.gif)

### Editing Pets

Read your pets, their level and XP, and see which talents they have invested.

## Credits

**Original work** — [halilbahar/core-keeper-save-editor](https://github.com/halilbahar/core-keeper-save-editor/)
and its contributors. This project would not exist without it.

**This fork** — maintained by [alfeuz](https://github.com/alfeuz). Changes made here include:

- Regenerated item, condition, talent and soul data for current game versions
- Added the Pets page, pet XP editing and per-variant talent icons
- Added the three newer souls (Druidra, Crydra, Pyrdra)
- Fixed save corruption: 64-bit appearance colours are no longer rounded on export, and every
  edit is persisted before it can be lost
- Fixed item amount and durability edits being silently dropped or reverted
- Fixed the item detail panel being clipped instead of scrollable

**Made with AI assistance** — the updates in this fork were written with
[opencode](https://opencode.ai) using its Space Bunny model. It did the code changes, the save
round-trip verification in a real browser, and the game-data pipeline work. The design decisions,
the licensing choices and the publishing were done by the maintainer.

**License** — [GPL-3.0](./LICENSE), inherited from the original project. A modified work under the
GPL must stay under the GPL, keep the original copyright notices, and state that it was changed.

**Not affiliated with Pugstorm or Frozenbyte.** Core Keeper is a trademark of its respective owner.
