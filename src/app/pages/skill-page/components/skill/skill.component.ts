import { Component, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'app-skill',
  templateUrl: './skill.component.html',
  styleUrls: ['./skill.component.scss']
})
export class SkillComponent {
  private _skillID: number;
  private _value: number;

  @HostBinding('class.selected')
  @Input()
  selected: boolean = false;

  @HostBinding('class.maxed')
  @Input()
  maxed: boolean = false;

  @Input() set skillID(value) {
    this._skillID = value;
  }

  @Input() set value(value) {
    this._value = value;
  }

  get skillID(): number {
    return this._skillID;
  }

  get value(): number {
    return this._value;
  }
}
