import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { SOULS, Soul } from '~enums';
import { Character } from '~models';
import { CharacterService } from '~services';

@UntilDestroy()
@Component({
  selector: 'app-character',
  templateUrl: './character.component.html',
  styleUrls: ['./character.component.scss']
})
export class CharacterComponent implements OnInit {
  readonly souls = SOULS;

  character: Character;
  currentName: string;
  isHardcore: boolean;
  index: number;
  hasSoulsUnlocked: boolean;
  /** Collected state per soul, keyed by SoulID. */
  collectedSouls = new Set<Soul>();

  constructor(private characterService: CharacterService) {}

  ngOnInit(): void {
    this.characterService.$character.pipe(untilDestroyed(this)).subscribe(character => {
      this.character = character;
      this.isHardcore = character.characterType === 1;
      this.hasSoulsUnlocked = character.hasUnlockedSouls;
      this.collectedSouls = new Set<Soul>(character.collectedSouls as Soul[]);

      const nameObj =
        character.characterCustomizationNew?.name || character.characterCustomization?.name;

      const encodedBytes = [];
      if (nameObj?.bytes?.offset0000) {
        for (let i = 0; i < 16; i++) {
          const lastDigits = String(i).padStart(2, '0');
          const value = nameObj.bytes.offset0000['byte00' + lastDigits];
          if (value !== 0 && value !== undefined) {
            encodedBytes.push(value);
          }
        }
      }

      const encodedName = Uint8Array.from(encodedBytes);
      this.currentName = new TextDecoder('utf-8').decode(encodedName);
    });

    this.characterService.$index
      .pipe(untilDestroyed(this))
      .subscribe(index => (this.index = index + 1));
  }

  /**
   * When a change event happens, we save the name in the character json.
   * This can only happen if the encoded array is not longer than 16
   * @param event
   */
  onNameChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const encoded = new TextEncoder().encode(target.value);

    if (encoded.length > 16) {
      target.value = this.currentName;
    } else {
      this.currentName = target.value;

      if (this.character.characterCustomization?.name) {
        const name = this.character.characterCustomization.name;
        name.utf8LengthInBytes = encoded.length;
        if (name.bytes?.offset0000) {
          for (let i = 0; i < 16; i++) {
            const value = i < encoded.length ? encoded[i] : 0;
            const lastDigits = String(i).padStart(2, '0');
            name.bytes.offset0000['byte00' + lastDigits] = value;
          }
        }
      }

      if (this.character.characterCustomizationNew?.name) {
        const nameNew = this.character.characterCustomizationNew.name;
        nameNew.utf8LengthInBytes = encoded.length;
        if (nameNew.bytes?.offset0000) {
          for (let i = 0; i < 16; i++) {
            const value = i < encoded.length ? encoded[i] : 0;
            const lastDigits = String(i).padStart(2, '0');
            nameNew.bytes.offset0000['byte00' + lastDigits] = value;
          }
        }
      }

      this.characterService.store();
    }
  }

  /**
   * Event handler for the checkbox. When the state changes we update the character
   * @param event
   */
  onHardcoreChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.character.characterType = target.checked ? 1 : 0;
    this.characterService.store();
  }

  /**
   * When the index changes, we save it so we can recall it when we export the file
   * @param event
   */
  onIndexChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const index = +target.value;

    if (index < 1 || 30 < index) {
      target.value = '' + this.index;
    } else {
      // We display the Slot index which starts by 1. The files on the other hand start with 0
      const correctIndex = index - 1;
      this.characterService.$index.next(correctIndex);
      this.characterService.store();
    }
  }

  /**
   * Event handler for the change event on the enable soul input field.
   */
  onEnableSoulsChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.character.hasUnlockedSouls = target.checked;
    // Reset every soul we know about when disabling souls generally
    if (!target.checked) {
      this.collectedSouls.clear();
      this.character.collectedSouls = [];
    }

    this.characterService.store();
  }

  /**
   * Event handler for the given soul.
   * @param event
   * @param soul
   */
  onSoulsChange(event: Event, soul: Soul): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;
    // Reset the disabledSouls when enabling / disabling souls.
    // We don't want the game to be in a wrong state
    this.character.disabledSoulPowers = [];

    if (checked) {
      this.collectedSouls.add(soul);
    } else {
      this.collectedSouls.delete(soul);
    }

    // Keep the array in SoulID order so the exported save stays stable
    this.character.collectedSouls = [...this.collectedSouls].sort((a, b) => a - b);
    this.characterService.store();
  }

  /**
   * Load the default character.
   */
  resetCharacter(): void {
    this.characterService.resetToDefaultCharacter();
    this.characterService.store();
  }
}
