import { Component, Input } from '@angular/core';

import { PetTalent } from '~services';

export interface PetTalentCell {
  talent: number;
  name: string;
  icon: string;
  points: number;
  /** The game only lets a point be placed once the pet has spent as many as the row index. */
  locked: boolean;
}

/** The grid is three by three, like the pet window in the game. */
const COLUMNS = 3;

/**
 * The talent points of one pet on a 3 by 3 grid.
 *
 * The game writes the points as a flat list of nine entries, one per grid cell, and a talent can
 * only hold a single point, so the entries are shown in their saved order rather than sorted. That
 * keeps the grid in the same arrangement as the pet window in the game.
 *
 * The game gates the rows with UnlockedLevel, which is the entry's index divided by the number of
 * columns, so the lower rows stay dimmed until enough points have been spent to reach them.
 *
 * The name and icon of a cell come from the pet service, which picks the variant that matches the
 * pet's type: the same talent is called something else, and drawn differently, on a buff pet.
 */
@Component({
  selector: 'app-pet-talents',
  templateUrl: './pet-talents.component.html',
  styleUrls: ['./pet-talents.component.scss']
})
export class PetTalentsComponent {
  readonly columns = COLUMNS;

  /** How many talent slots the game gives a pet, three by three. */
  readonly capacity = COLUMNS * COLUMNS;
  /** Always a multiple of the column count, so the grid is never ragged. */
  cells: (PetTalentCell | null)[] = new Array(this.capacity).fill(null);
  /** How many of the cells hold a point. */
  used = 0;

  @Input() set talents(points: PetTalent[]) {
    this.cells = this.buildCells(points ?? [], this.spentPoints);
    this.used = this.cells.filter(cell => cell !== null && cell.points > 0).length;
  }

  /** Points already spent, which decides how far down the grid the talent rows unlock. */
  @Input() spentPoints = 0;

  private buildCells(points: PetTalent[], spent: number): (PetTalentCell | null)[] {
    // The game reads the talents as a fixed list of nine, indexed by grid position, and reads
    // the *index* of an entry as its row. The index is therefore position in this list.
    const cells: (PetTalentCell | null)[] = points.slice(0, this.capacity).map((point, index) => ({
      talent: point.talent,
      name: point.name,
      icon: point.icon,
      points: point.points,
      locked: spent < Math.trunc(index / COLUMNS)
    }));

    while (cells.length < this.capacity) {
      cells.push(null);
    }
    return cells;
  }
}
