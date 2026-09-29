import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { debounceTime, filter, Subject } from 'rxjs';

import { ItemCategories } from '~enums';
import { ItemData } from '~models';
import { ItemDataService } from '~services';

export interface CategoryOption {
  name: string;
  id: number;
  ids?: number[];
}

@UntilDestroy()
@Component({
  selector: 'app-item-browser',
  templateUrl: './item-browser.component.html',
  styleUrls: ['./item-browser.component.scss']
})
export class ItemBrowserComponent implements OnInit {
  private $modelChanged: Subject<string> = new Subject();

  itemData: { itemData: ItemData; hide: boolean }[] = [];
  itemCategories = ItemCategories;
  categories: CategoryOption[] = [
    // Groups
    { name: '★ All Weapons', id: 9999, ids: [500, 501, 502, 503, 610] },
    { name: '★ All Armor', id: 9997, ids: [100, 101, 102] },
    { name: '★ All Accessories', id: 9996, ids: [103, 104, 105, 106, 107, 108] },
    {
      name: '★ All Tools',
      id: 9998,
      ids: [600, 601, 603, 604, 605, 606, 607, 608, 609, 1200, 1201, 1250]
    },
    // Specific
    { name: 'Melee Weapon', id: 500 },
    { name: 'Ranged Weapon', id: 501 },
    { name: 'Summoning Weapon', id: 502 },
    { name: 'Throwing Weapon', id: 503 },
    { name: 'Beam Weapon', id: 610 },
    { name: 'Helm', id: 100 },
    { name: 'Chest Armor', id: 101 },
    { name: 'Pants Armor', id: 102 },
    { name: 'Necklace', id: 103 },
    { name: 'Ring', id: 104 },
    { name: 'Offhand', id: 105 },
    { name: 'Bag', id: 106 },
    { name: 'Lantern', id: 107 },
    { name: 'Pouch', id: 108 },
    { name: 'Pickaxe', id: 603 },
    { name: 'Shovel', id: 600 },
    { name: 'Hoe', id: 601 },
    { name: 'Fishing Rod', id: 605 },
    { name: 'Bug Net', id: 606 },
    { name: 'Sledge / Hammer', id: 607 },
    { name: 'Roofing Tool', id: 608 },
    { name: 'Drill', id: 609 },
    { name: 'Watering Can', id: 1200 },
    { name: 'Bucket', id: 1201 },
    { name: 'Garden Trowel', id: 1250 },
    { name: 'Paint Tool', id: 604 },
    { name: 'Food', id: 1100 },
    { name: 'Valuable', id: 1300 },
    { name: 'Material / Component', id: 1400 },
    { name: 'Key Item', id: 1500 },
    { name: 'Critter', id: 801 },
    { name: 'Pet', id: 802 },
    { name: 'Instrument', id: 1600 },
    { name: 'Castable Items', id: 602 },
    { name: 'Placeable Item', id: 800 }
  ];

  filterTerm: string = '';
  selectedCategory: number = -1;

  /**
   * Every droppable inventory slot, so items from the browser can be dragged onto the
   * toolbar, the bag and the equipment slots.
   */
  inventory_ids: string[] = [];

  constructor(private itemDataService: ItemDataService) {}

  /**
   * Initialize the items and a subscription which uses a debounce method.
   * This way the form will only be alerted after the last keystroke + 150ms
   */
  ngOnInit(): void {
    this.$modelChanged
      .pipe(debounceTime(150))
      .pipe(untilDestroyed(this))
      .subscribe(data => {
        this.filterTerm = data;
        this.filterItems();
      });

    // Get all items once
    this.itemData = Object.values(this.itemDataService.items).map(itemData => ({
      itemData,
      hide: false
    }));

    this.filterItems();

    // Push inventory
    for (let i = 0; i < 50; i++) {
      this.inventory_ids.push(`inventory-${i}`);
    }
    // Push equipment
    for (let i = 0; i < 8; i++) {
      this.inventory_ids.push(`inventory-${i + 51}`);
    }
  }

  /**
   * Event handler for the input field.
   * @param event InputEvent
   */
  onFilterInput(event) {
    this.$modelChanged.next(event.target.value);
  }

  /**
   * Event handler for the select field.
   * @param category id
   */
  onCategorySelect(category: number) {
    this.selectedCategory = +category;
    this.filterItems();
  }

  private matchesCategory(selectedCategory: number, objectType: number): boolean {
    const cat = this.categories.find(c => c.id === selectedCategory);
    if (!cat) return false;
    if (cat.ids) {
      return cat.ids.includes(objectType);
    }
    return cat.id === objectType;
  }

  /**
   * Filter the items by category and by name / objectName / objectID
   */
  filterItems() {
    const term = (this.filterTerm || '').trim().toLowerCase();
    const isNum = !isNaN(Number(term)) && term !== '';
    const searchId = isNum ? Number(term) : -1;

    for (const item of this.itemData) {
      const itemData = item.itemData;

      // Filter by category
      if (this.selectedCategory !== -1) {
        if (!this.matchesCategory(this.selectedCategory, itemData.objectType)) {
          item.hide = true;
          continue;
        }
      }

      // Filter by search term
      if (!term) {
        item.hide = false;
        continue;
      }

      const matchName = itemData.name ? itemData.name.toLowerCase().includes(term) : false;
      const matchObjName = itemData.objectName
        ? itemData.objectName.toLowerCase().includes(term)
        : false;
      const matchId = isNum && itemData.objectID === searchId;

      item.hide = !(matchName || matchObjName || matchId);
    }
  }
}
