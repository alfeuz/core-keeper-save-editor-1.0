import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { fromEvent } from 'rxjs';

import { Bag } from '~enums';
import { InventorySlot } from '~models';
import {
  BAG_SLOTS,
  CharacterService,
  DragNDropService,
  SelectedItemService,
  TOOLBAR_SLOTS
} from '~services';

@UntilDestroy()
@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {
  inventory: InventorySlot[];
  inventoryToolbar: InventorySlot[];
  bag: Bag;
  indexToHide: number = -1;
  indexToSelect: number = -1;

  constructor(
    private characterService: CharacterService,
    private selectedItemService: SelectedItemService,
    public dragNDropService: DragNDropService
  ) {}

  ngOnInit(): void {
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(untilDestroyed(this))
      .subscribe(event => {
        const { key } = event;
        if (key === 'Backspace' || key === 'Delete') {
          this.removeSelectedItem();
        }
      });

    this.characterService.$bag.pipe(untilDestroyed(this)).subscribe(value => (this.bag = value));
    this.characterService.$character.pipe(untilDestroyed(this)).subscribe(value => {
      // The toolbar is always fully visible, the bag window is trimmed by the pipe below
      this.inventoryToolbar = value.inventory.slice(0, TOOLBAR_SLOTS);
      this.inventory = value.inventory.slice(TOOLBAR_SLOTS, TOOLBAR_SLOTS + BAG_SLOTS);
    });

    this.dragNDropService.$indexToHide
      .pipe(untilDestroyed(this))
      .subscribe(indexToHide => (this.indexToHide = indexToHide));

    this.selectedItemService.$selectedItem
      .pipe(untilDestroyed(this))
      .subscribe(index => (this.indexToSelect = index));
  }

  /**
   * Event handler for the on click event on items. If the same invetory slot gets clicked again, deselect by sending a value of -1.
   * @param index of the inventory slot
   */
  onItemClick(index: number): void {
    const currentIndex = this.selectedItemService.$selectedItem.value;
    const newIndex = currentIndex === index ? -1 : index;
    this.selectedItemService.$selectedItem.next(newIndex);
  }

  /**
   * Removes the currently selected item from the inventor and clears the selection IF there is no focused input-element
   */
  removeSelectedItem(): void {
    // if there is any input-element that has focus we don't want to remove the item, since pressing Delete or Backspace would be intendet for editing the value of the input
    if (document.activeElement.tagName === 'INPUT') return;

    if (this.indexToSelect !== -1) {
      this.characterService.removeItemFromInventory(this.indexToSelect);
      this.selectedItemService.setSelectedItem(-1);
    }
  }
}
