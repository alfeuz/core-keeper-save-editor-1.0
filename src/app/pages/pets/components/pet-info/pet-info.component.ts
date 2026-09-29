import { Component, EventEmitter, Input, Output } from '@angular/core';

import { PetInfo } from '~services';

/**
 * One pet: its icon, name, level, spent points and the XP field. The XP is the inventory amount,
 * so editing it is the same operation as editing any other item amount.
 */
@Component({
  selector: 'app-pet-info',
  templateUrl: './pet-info.component.html',
  styleUrls: ['./pet-info.component.scss']
})
export class PetInfoComponent {
  @Input() pet: PetInfo;

  /** Emitted when the user finishes editing the XP field. */
  @Output() xpChange = new EventEmitter<number>();

  /**
   * Sends the new XP upwards, or asks for the field to be reset when the value is not a plain
   * non-negative integer.
   */
  onXpChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const xp = parseInt(target.value, 10);
    if (Number.isNaN(xp) || xp < 0 || !Number.isSafeInteger(xp)) {
      target.value = '' + this.pet.xp;
      return;
    }
    this.xpChange.emit(xp);
  }
}
