import React from 'react';

import SPELLS from 'common/SPELLS';
import SpellIcon from 'common/SpellIcon';
import { formatPercentage } from 'common/format';

import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import EnemyInstances from 'parser/shared/modules/EnemyInstances';

import StatisticBox from 'interface/others/StatisticBox';

import Abilities from '../Abilities';
import Events, { CastEvent, RemoveBuffEvent } from '../../../../core/Events';
import Combatant from 'parser/core/Combatant';

class StormElemental extends Analyzer {

  static dependencies = {
    abilities: Abilities,
    enemies: EnemyInstances,
  };

  protected acceptableSpells:Array<Function> = [];

  protected readonly abilities!: Abilities;
  protected readonly enemies!: EnemyInstances;

  _resolveAbilityGcdField(value: any): number {
    if (typeof value === 'function') {
      return value.call(this.owner, this.selectedCombatant);
    } else {
      return value
    }
  }

  get WindGustStacks() {
    const buff:any = this.selectedCombatant.getBuff(SPELLS.WIND_GUST_BUFF.id);
      if(!buff){
        return 0;
      } else {
        return buff.stacks;
    }
  }

  onlySurges(event: CastEvent) {
    this.acceptableSpells.push(
      (event: CastEvent, combatant: Combatant)=>(
        event.ability.guid===SPELLS.LAVA_BURST.id &&
        combatant.hasBuff(SPELLS.LAVA_SURGE.id)
      ),
    );
    this.numCasts[SPELLS.LAVA_BURST.id]=0;
  }

  lavaBurst() {
    this.acceptableSpells.push(
      (event: CastEvent, combatant: Combatant)=>(event.ability.guid===SPELLS.LAVA_BURST.id),
    );
    this.numCasts[SPELLS.LAVA_BURST.id]=0;
  }

  elementalBlast() {
    this.acceptableSpells.push(
      (event: CastEvent, combatant: Combatant)=>(
        event.ability.guid===SPELLS.ELEMENTAL_BLAST_TALENT.id &&
      this.WindGustStacks<14),
    );
    this.numCasts[SPELLS.ELEMENTAL_BLAST_TALENT.id] = 0;
  }

  castChecksByIP: {[id: number]: Function} = {
    2: this.onlySurges,
    3: this.lavaBurst,
  };

  justEnteredSE = false;
  wrongCasts = 0;
  correctCasts = 0;

  numCasts = {
    [SPELLS.STORM_ELEMENTAL_TALENT.id]: 0,
    [SPELLS.LIGHTNING_BOLT.id]: 0,
    [SPELLS.CHAIN_LIGHTNING.id]: 0,
    [SPELLS.EARTH_SHOCK.id]: 0,
    [SPELLS.EARTHQUAKE.id]: 0,
    others: 0,
  };

  constructor(options: any) {
    super(options);
    this.active
      = this.selectedCombatant.hasTalent(SPELLS.STORM_ELEMENTAL_TALENT.id);
    this.acceptableSpells.push(
      (event: CastEvent, combatant: Combatant)=>(event.ability.guid===SPELLS.LIGHTNING_BOLT.id),
    );
    this.acceptableSpells.push(
      (event: CastEvent, combatant: Combatant)=>(event.ability.guid===SPELLS.CHAIN_LIGHTNING.id),
    );
    this.acceptableSpells.push(
      (event: CastEvent, combatant: Combatant)=>(event.ability.guid===SPELLS.EARTH_SHOCK.id),
    );
    this.acceptableSpells.push(
      (event: CastEvent, combatant: Combatant)=>(event.ability.guid===SPELLS.EARTHQUAKE.id),
    );
    const nhTraits = this.selectedCombatant.traitsBySpellId[SPELLS.IGNEOUS_POTENTIAL.id];
    if(nhTraits && nhTraits.length===3){
      this.elementalBlast();
    }
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER),
      this.onCastDuringSE,
    );
    this.addEventListener(
      Events.removebuff.by(SELECTED_PLAYER).spell(SPELLS.WIND_GUST_BUFF),
      this.onWindGustRemove,
    );
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(SPELLS.STORM_ELEMENTAL_TALENT),
      this.onSECast,
    );
  }

  get stormEleUptime() {
    return this.selectedCombatant.getBuffUptime(SPELLS.WIND_GUST_BUFF.id) /
      this.owner.fightDuration;
  }

  onWindGustRemove(event: RemoveBuffEvent){
    this.justEnteredSE = false;
  }

  onSECast(event: CastEvent) {
    this.justEnteredSE = true;
    this.numCasts[SPELLS.STORM_ELEMENTAL_TALENT.id] += 1;
  }

  onCastDuringSE(event: CastEvent) {
    if(!this.justEnteredSE){
      return;
    }
    const ability = this.abilities.getAbility(event.ability.guid);
    if (!ability) {
      return;
    }

    const gcd = this._resolveAbilityGcdField(ability.gcd);
    if (!gcd) {
      return;
    }

    if(this.acceptableSpells.some(x=>x(event, this.selectedCombatant))) {
      this.correctCasts++;
    } else {
      this.wrongCasts++;
    }

  }

  statistic() {
    return (
      <StatisticBox
        icon={<SpellIcon id={SPELLS.STORM_ELEMENTAL_TALENT.id} />}
        value={`${formatPercentage(this.correctCasts/(this.correctCasts+this.wrongCasts))} %`}
        label="Percentag of Correct Casts during hard cast Storm Elemental"
        tooltip={(
          <>
            With a uptime of: {formatPercentage(this.stormEleUptime)} %<br />
            Casts while Storm Elemental was up:
            <ul>
              <li>Correct Casts: {this.correctCasts}</li>
              <li>Wrong Casts: {this.wrongCasts}</li>
            </ul>
            Refer to https://stormearthandlava.com for the correct casts.
          </>
        )}
      />
    );
  }

  get suggestionTresholds() {
    return {
      actual: this.numCasts.others,
      isLessThan: {
        minor: 0.95,
        major: 0.9,
      },
      style: 'percentage',
    };
  }

  suggestions(when: any) {
    when(this.suggestionTresholds)
      .addSuggestion(
        (suggest: any, actual: any, _: any) => {
          return suggest(
            <span>Maximize your damage during Storm Elemental by only using the correct abilities.</span>)
            .icon(SPELLS.STORM_ELEMENTAL_TALENT.icon)
            .actual(`${this.wrongCasts} other casts with Storm Elemental up`)
            .recommended(`Only cast specific while Storm Elemental is up.`);
        });
  }
}

export default StormElemental;
