import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { ItemRarity } from '~enums';
import { InventorySlot, ItemDetail, SetBonusDetail } from '~models';
import { CharacterService, ItemDataService, ItemSetService, SelectedItemService } from '~services';

@UntilDestroy()
@Component({
  selector: 'app-item-detail',
  templateUrl: './item-detail.component.html',
  styleUrls: ['./item-detail.component.scss']
})
export class ItemDetailComponent implements OnInit {
  itemDetail: ItemDetail;
  inventorySlot: InventorySlot;
  setBonusDetail: SetBonusDetail;
  itemIndex: number;
  rarityLabel: string;
  isReinforced: boolean;
  amountError: string;

  constructor(
    private characterService: CharacterService,
    private itemDataService: ItemDataService,
    private selectedItemService: SelectedItemService,
    private itemSetService: ItemSetService
  ) {}

  ngOnInit(): void {
    this.selectedItemService.$selectedItem.pipe(untilDestroyed(this)).subscribe(index => {
      // We have a null index (initial state) don't do anything
      if (index == null) {
        return;
      }

      // If a index of -1 is given, reset (display nothing)
      if (index === -1) {
        this.reset();
      } else {
        // Show the item in the given slot. The only exception is for empty item slots (objectID === 0). These we don't display.
        const inventorySlot = this.characterService.$character.value.inventory[index];
        if (inventorySlot.objectID !== 0) {
          this.itemDetail = this.itemDataService.getItemDetail(inventorySlot.objectID);
          // Item may not exist in the item-data
          if (this.itemDetail != null) {
            this.inventorySlot = inventorySlot;
            this.amountError = null;
            this.setBonusDetail = this.itemSetService.getSetBonusDetail(inventorySlot.objectID);
            this.itemIndex = index;
            this.rarityLabel = ItemRarity[this.itemDetail.rarity];
            this.isReinforced =
              !this.itemDetail.isStackable &&
              this.inventorySlot.amount > this.itemDetail.initialAmount;
          }
        } else {
          this.reset();
        }
      }
    });
  }

  /**
   * Whenever the user is done editing the input field, this function will be called.
   * It Will check if the value is between 0 and item-max-durability or 999 when it is a stackable item.
   * When the value of the input field is valid, we change the inventoryslot
   * @param event
   */
  onAmountChange(event: Event): void {
    const traget = event.target as HTMLInputElement;
    const amount = parseInt(traget.value);

    const maxAmount = this.itemDetail.isStackable ? 999 : this.maxDurability;

    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > maxAmount) {
      // We can't cancel this event. So have to reset the value manually
      traget.value = '' + this.inventorySlot.amount;
      this.amountError = `Enter a number between 1 and ${maxAmount}`;
    } else {
      this.inventorySlot.amount = amount;
      this.amountError = null;
      // Without this the new amount only lives in memory, so a page reload would drop it and the
      // export would write the old value.
      this.characterService.store();
    }
    this.isReinforced =
      !this.itemDetail.isStackable && this.inventorySlot.amount > this.itemDetail.initialAmount;
  }

  /**
   * The highest durability an item can hold. A reinforced item holds up to twice the durability
   * the item data lists, which is why the input accepts more than `initialAmount`.
   */
  get maxDurability(): number {
    return Math.max((this.itemDetail?.initialAmount ?? 0) * 2, 0);
  }

  /**
   * Removes the currently selected item from the inventor and clears the selection after
   */
  onDeleteButtonClick(): void {
    this.characterService.removeItemFromInventory(this.itemIndex);
    this.selectedItemService.setSelectedItem(-1);
  }

  /**
   * Reset all the variables. This equivalent to deselecting the current item.
   */
  private reset(): void {
    this.itemDetail = null;
    this.inventorySlot = null;
    this.itemIndex = null;
    this.rarityLabel = null;
    this.amountError = null;
  }
}
