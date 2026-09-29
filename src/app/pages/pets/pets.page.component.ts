import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { CharacterService, PetInfo, PetService } from '~services';

/** The pets page, listing every pet the character carries. */
@UntilDestroy()
@Component({
  selector: 'app-pets-page',
  templateUrl: './pets.page.component.html',
  styleUrls: ['./pets.page.component.scss']
})
export class PetsPageComponent implements OnInit {
  pets: PetInfo[] = [];

  constructor(private petService: PetService, private characterService: CharacterService) {}

  ngOnInit(): void {
    this.characterService.$character
      .pipe(untilDestroyed(this))
      .subscribe(() => (this.pets = this.petService.getPets()));
  }

  /**
   * Applies a new XP value for the pet. The service rejects anything that is not a plain
   * non-negative safe integer, so the list is rebuilt from the stored values either way.
   */
  onXpChange(pet: PetInfo, xp: number): void {
    this.petService.setXp(pet.slotIndex, xp);
    this.pets = this.petService.getPets();
  }
}
