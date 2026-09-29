import { Component, ContentChildren, QueryList } from '@angular/core';

import { InaccessibleItemsComponent } from '~components/dialog/inaccessible-items/inaccessible-items.component';
import {
  BASE_BAG_SLOTS,
  BAG_SLOTS,
  CharacterService,
  DialogService,
  escapeInfinity,
  TOOLBAR_SLOTS
} from '~services';
import { readAppearanceMembers } from '~services/appearance-json';

import { TabComponent } from './tab/tab.component';

@Component({
  selector: 'app-tab-group',
  templateUrl: './tab-group.component.html',
  styleUrls: ['./tab-group.component.scss']
})
export class TabGroupComponent {
  @ContentChildren(TabComponent) tabs: QueryList<TabComponent>;

  constructor(private characterService: CharacterService, private dialogService: DialogService) {}

  selectTab(tab: TabComponent): void {
    this.tabs.forEach(t => {
      t.active = false;
    });
    tab.active = true;
  }

  /**
   * Import the x.json file with this on file upload event handler.
   * This finds out what x is.
   */
  onFileUpload(files: FileList): void {
    const file = files.item(0);
    const filename = file.name;
    const regex = /(\d{1,2})\.json/;
    const match = filename.match(regex);
    const index = +match[1];

    this.readFile(file).then(characterString => {
      // The json is invalid when the user consumed an amber larva or giant mushroom, because an
      // int duration field then holds Infinity. Those tokens are swapped for a placeholder so the
      // file can be parsed, and swapped back on export.
      const escaped = escapeInfinity(characterString);
      const character = JSON.parse(escaped);
      this.characterService.setCharacter(character, index, readAppearanceMembers(escaped));
      this.characterService.store();
    });
  }

  /**
   * Based on the bag equipped bag and filled bag slots, display a warning message.
   */
  export(): void {
    const character = this.characterService.$character.value;
    const bag = this.characterService.$bag.value;
    const bagSize = this.characterService.getBagSize(bag);

    // The bag slots a bigger bag would unlock but the current one does not reach
    const bagSlots = character.inventory.slice(
      TOOLBAR_SLOTS + BASE_BAG_SLOTS + bagSize,
      TOOLBAR_SLOTS + BAG_SLOTS
    );
    // When we find a slot that is hidden due to a insufficient bag size, we show the dialog.
    let showWarningDialog = false;
    for (const slot of bagSlots) {
      if (slot.objectID !== 0) {
        showWarningDialog = true;
        break;
      }
    }

    if (showWarningDialog) {
      this.dialogService
        .open(InaccessibleItemsComponent)
        .afterClosed()
        .subscribe(result => {
          if (result) {
            this.save();
          }
        });
    } else {
      this.save();
    }
  }

  /**
   * Export the current character with the given index.
   * Create a invisible a tag and click on it so the user can download the file
   */
  private save(): void {
    const index = this.characterService.$index.value;
    const blob = new Blob([this.characterService.serialize()], {
      type: 'application/octet-stream'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${index}.json`;
    // The link has to sit in the document for the click to start a download everywhere, and the
    // url may only be released once the download has been handed over to the browser.
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 0);
  }

  /**
   * Read the content of a file.
   * @param file
   * @returns Promise which holds the string
   */
  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file, 'UTF-8');
      reader.onload = evt => resolve(evt.target.result as string);
      reader.onerror = () => reject();
    });
  }
}
