import { Component, Input, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { Skill, SkillTalentTree } from '~models';
import { CharacterService, SkillTalentService } from '~services';

type TalentTreeOptions = { skillId: number; talentTree: SkillTalentTree };

@UntilDestroy()
@Component({
  selector: 'app-talent-tree',
  templateUrl: './talent-tree.component.html',
  styleUrls: ['./talent-tree.component.scss']
})
export class TalentTreeComponent implements OnInit {
  skills: Skill[];
  skillTalentTreeDatas: SkillTalentTree[];

  blocked: boolean[] = [];
  selectedSkillTalentTree: SkillTalentTree;
  selectedSkillId: number;
  selectedSkillLevel: number;
  pointsToSpend: number;

  constructor(
    private characterService: CharacterService,
    private skillTalentService: SkillTalentService
  ) {}

  ngOnInit(): void {
    this.characterService.$character.pipe(untilDestroyed(this)).subscribe(value => {
      this.skills = value.skills;
      this.skillTalentTreeDatas = value.skillTalentTreeDatas;
      this.update();
    });
    this.skillTalentService.$selectedSkill.pipe(untilDestroyed(this)).subscribe(value => {
      this.selectedSkillId = value;
      this.update();
    });
  }

  onTalentIncrease({ index }: { index: number }) {
    if (this.blocked[index] || this.pointsToSpend <= 0) return;

    this.selectedSkillTalentTree.points[index]++;
    this.characterService.store();
    this.updateBlocked();
    this.updatePointsToSpend();
  }

  onResetButtonClick(): void {
    this.selectedSkillTalentTree.points = this.selectedSkillTalentTree.points.map(() => 0);
    this.characterService.store();
    this.updateBlocked();
    this.updatePointsToSpend();
  }

  private update() {
    if (!this.skills || !this.skillTalentTreeDatas || this.selectedSkillId == null) return;

    const skill = this.skills.find(s => s.skillID === this.selectedSkillId);
    const xp = skill ? skill.value : 0;
    this.selectedSkillLevel = this.skillTalentService.getLevelByXp(this.selectedSkillId, xp);

    this.selectedSkillTalentTree = this.skillTalentTreeDatas.find(
      tree => tree.skillTreeID === this.selectedSkillId
    );

    if (!this.selectedSkillTalentTree) {
      this.selectedSkillTalentTree = {
        skillTreeID: this.selectedSkillId,
        points: [0, 0, 0, 0, 0, 0, 0, 0]
      };
      this.skillTalentTreeDatas.push(this.selectedSkillTalentTree);
    }

    while (this.selectedSkillTalentTree.points.length < 8) {
      this.selectedSkillTalentTree.points.push(0);
    }

    this.updateBlocked();
    this.updatePointsToSpend();
  }

  private updateBlocked() {
    const firstMaxed = this.selectedSkillTalentTree.points[0] !== 5;
    this.blocked[0] = false;
    this.blocked[1] = firstMaxed;
    this.blocked[2] = firstMaxed;

    const secondMaxed = this.selectedSkillTalentTree.points[1] !== 5;
    const thirdMaxed = this.selectedSkillTalentTree.points[2] !== 5;
    this.blocked[3] = secondMaxed;
    this.blocked[4] = secondMaxed && thirdMaxed;
    this.blocked[5] = thirdMaxed;

    const fourthMaxed = this.selectedSkillTalentTree.points[3] !== 5;
    const fifthMaxed = this.selectedSkillTalentTree.points[4] !== 5;
    const sixthMaxed = this.selectedSkillTalentTree.points[5] !== 5;
    this.blocked[6] = fourthMaxed && fifthMaxed;
    this.blocked[7] = fifthMaxed && sixthMaxed;
  }

  private updatePointsToSpend() {
    let totalPoints = Math.floor(this.selectedSkillLevel / 5);
    if (totalPoints >= 20) {
      totalPoints += 5;
    }
    const spentPoints = this.selectedSkillTalentTree.points.reduce((sum, point) => sum + point, 0);
    const pointsDif = totalPoints - spentPoints;

    this.pointsToSpend = Math.max(0, pointsDif);
  }
}
