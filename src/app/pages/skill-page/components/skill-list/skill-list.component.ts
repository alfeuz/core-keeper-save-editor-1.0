import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { Character, Skill } from '~models';
import { CharacterService, SkillTalentService } from '~services';

@UntilDestroy()
@Component({
  selector: 'app-skill-list',
  templateUrl: './skill-list.component.html',
  styleUrls: ['./skill-list.component.scss']
})
export class SkillListComponent implements OnInit {
  skills: Skill[];
  character: Character;
  selectedSkillID: number;

  constructor(
    private characterService: CharacterService,
    private skillTalentService: SkillTalentService
  ) {}

  ngOnInit(): void {
    this.characterService.$character.pipe(untilDestroyed(this)).subscribe(value => {
      this.skills = value.skills;
      this.character = value;
    });
    this.skillTalentService.$selectedSkill.pipe(untilDestroyed(this)).subscribe(value => {
      this.selectedSkillID = value;
    });
  }

  onSKillClick(skillID: number): void {
    this.skillTalentService.setSelectedSkill(skillID);
  }

  onLevelIncreaseClick(): void {
    this.setSelectedSkillLevel(this.getSkillLevel(this.selectedSkillID) + 1);
  }

  onLevelDecreaseClick(): void {
    this.setSelectedSkillLevel(this.getSkillLevel(this.selectedSkillID) - 1);
  }

  onLevelInputChange(event): void {
    this.setSelectedSkillLevel(+event.target.value);
  }

  setSelectedSkillLevel(level: number): void {
    const newLevel = level < 100 ? (level > 0 ? level : 0) : 100;
    const skill = this.skills?.find(s => s.skillID === this.selectedSkillID);
    if (skill) {
      skill.value = this.skillTalentService.getXpForLevel(this.selectedSkillID, newLevel);
    }

    this.characterService.$character.next({ ...this.character, skills: this.skills });

    // Update the localstorage after changing a skill
    this.characterService.store();
  }

  getSelectedSkillName(): string {
    return this.skillTalentService.getSkillName(this.selectedSkillID);
  }

  getSkillLevel(skillID: number): number {
    const skill = this.skills?.find(s => s.skillID === skillID);
    return this.skillTalentService.getLevelByXp(skillID, skill ? skill.value : 0);
  }
}
