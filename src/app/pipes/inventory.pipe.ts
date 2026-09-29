import { Pipe, PipeTransform } from '@angular/core';

import { Bag } from '~enums';
import { InventorySlot } from '~models';
import { BASE_BAG_SLOTS, CharacterService } from '~services';

@Pipe({
  name: 'inventory'
})
export class InventoryPipe implements PipeTransform {
  constructor(private characterService: CharacterService) {}

  transform(inventory: InventorySlot[], bag: Bag): InventorySlot[] {
    // The bag decides how many of the bag slots are reachable. The incoming list already starts
    // after the toolbar, so only the bag window has to be trimmed here.
    const bagSize = this.characterService.getBagSize(bag);
    return inventory.slice(0, BASE_BAG_SLOTS + bagSize);
  }
}
