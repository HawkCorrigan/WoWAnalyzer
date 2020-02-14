import React from 'react';

import SPELLS from 'common/SPELLS';
import SpellIcon from 'common/SpellIcon';
import { formatNumber, formatPercentage } from 'common/format';

import Analyzer from 'parser/core/Analyzer';
import EnemyInstances from 'parser/shared/modules/EnemyInstances';

import StatisticBox, { STATISTIC_ORDER } from 'interface/others/StatisticBox';

import Abilities from '../Abilities';
import { CastEvent } from '../../../../core/Events';
import Combatant from '../../../../core/Combatant';

type bla = (combatant: Combatant)=> number;

class StormElemental extends Analyzer {

  static dependencies = {
    abilities: Abilities,
    enemies: EnemyInstances,
  };



  protected readonly abilities!: Abilities;
  protected readonly  enemies!: EnemyInstances;

  _resolveAbilityGcdField(value: any): number {
    if ((value as bla).call(this.owner, this.selectedCombatant)){
      return (value as bla).call(this.owner, this.selectedCombatant);
    }
    if (typeof value === "number"){
      return value;
    }
    throw new Error("Expected number or function");
  }

  onlyLightningBolt(event: CastEvent) {
    return event.ability.guid !== SPELLS.LIGHTNING_BOLT.id;
  }

  onlySurges(event: CastEvent) {
    if (this.selectedCombatant.hasBuff(SPELLS.LAVA_SURGE_BUFF.id)) {
      return event.ability.guid === SPELLS.LAVA_BURST.id;
    } else {
      return event.ability.guid === SPELLS.LIGHTNING_BOLT.id;
    }
  }

  lavaBurstOrLightningBolt(event: CastEvent) {
    if (event.ability.guid === SPELLS.LAVA_BURST.id) {
      return true;
    }
    if (event.ability.guid === SPELLS.LIGHTNING_BOLT.id) {
      return true;
    }
    return false;
  }

  castChecksByIP: {[id: number]: Function} = {
    0: this.onlyLightningBolt,
    1: this.onlyLightningBolt,
    2: this.onlySurges,
    3: this.lavaBurstOrLightningBolt,
  };

  correctCastCheck : Function;

  badFS = 0;
  justEnteredSE = false;
  checkDelay = 0;

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
    const ipTraits = this.selectedCombatant.traitsBySpellId[SPELLS.IGNEOUS_POTENTIAL.id];
    if(ipTraits === undefined){
      this.correctCastCheck = this.castChecksByIP[0];
    } else {
      this.correctCastCheck = this.castChecksByIP[ipTraits.length];
    }
  }

  get stormEleUptime() {
    return this.selectedCombatant.getBuffUptime(SPELLS.WIND_GUST_BUFF.id) /
      this.owner.fightDuration;
  }

  get averageLightningBoltCasts() {
    return (
      this.numCasts[SPELLS.LIGHTNING_BOLT.id] /
      this.numCasts[SPELLS.STORM_ELEMENTAL_TALENT.id]
    ) || 0;
  }

  get averageChainLightningCasts() {
    return (
      this.numCasts[SPELLS.CHAIN_LIGHTNING.id] /
      this.numCasts[SPELLS.STORM_ELEMENTAL_TALENT.id]
    ) || 0;
  }

  onSECast(event: CastEvent) {
    this.justEnteredSE = true;
    this.numCasts[SPELLS.STORM_ELEMENTAL_TALENT.id] += 1;

    const ability = this.abilities.getAbility(event.ability.guid);
    if (!ability) {
      return;
    }

    if (!this.selectedCombatant.hasBuff(
      SPELLS.WIND_GUST_BUFF.id,
      event.timestamp,
    )) {
      return;
    }

    const gcd = this._resolveAbilityGcdField(ability.gcd);
    if (!gcd) {
      return;
    }
  }

  statistic() {
    return (
      <StatisticBox
        icon={<SpellIcon id={SPELLS.STORM_ELEMENTAL_TALENT.id} />}
        value={`${formatNumber(this.averageLightningBoltCasts)}`}
        label="Average Number Of Lightning Bolts per Storm Elemental Cast"
        tooltip={(
          <>
            With a uptime of: {formatPercentage(this.stormEleUptime)} %<br />
            Casts while Storm Elemental was up:
            <ul>
              <li>Earth Shock: {this.numCasts[SPELLS.EARTH_SHOCK.id]}</li>
              <li>Lightning Bolt: {this.numCasts[SPELLS.LIGHTNING_BOLT.id]}</li>
              <li>Earthquake: {this.numCasts[SPELLS.EARTHQUAKE.id]}</li>
              <li>Chain Lightning: {this.numCasts[SPELLS.CHAIN_LIGHTNING.id]}</li>
              <li>Other Spells: {this.numCasts.others}</li>
            </ul>
          </>
        )}
      />
    );
  }

  get suggestionTresholds() {
    return {
      actual: this.numCasts.others,
      isGreaterThan: {
        minor: 0,
        major: 1,
      },
      style: 'absolute',
    };
  }

  suggestions(when: any) {
    const abilities = `Lightning Bolt/Chain Lightning and Earth Shock/Earthquake`;
    when(this.suggestionTresholds)
      .addSuggestion(
        (suggest: any, actual: any, _: any) => {
          return suggest(
            <span>Maximize your damage during Storm Elemental by only using {abilities}.</span>)
            .icon(SPELLS.STORM_ELEMENTAL_TALENT.icon)
            .actual(`${actual} other casts with Storm Elemental up`)
            .recommended(`Only cast ${abilities} while Storm Elemental is up.`);
        });
  }
}

export default StormElemental;
