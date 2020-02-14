import React from 'react';

import SPELLS from 'common/SPELLS';
import SpellLink from 'common/SpellLink';
import { formatNumber } from 'common/format';

import Analyzer, {
  SELECTED_PLAYER,
  SELECTED_PLAYER_PET,
} from 'parser/core/Analyzer';
import Events, {
  CastEvent,
  DamageEvent,
  SummonEvent,
} from 'parser/core/Events';
import Statistic from 'interface/statistics/Statistic';
import BoringSpellValue
  from 'interface/statistics/components/BoringSpellValue';
import { Trans } from '@lingui/macro';


const damagingCasts = [SPELLS.EYE_OF_THE_STORM.id, SPELLS.WIND_GUST.id, SPELLS.CALL_LIGHTNING.id];
const CALL_LIGHTNING_BUFF_DURATION = 15000;

class PrimalStormElemental extends Analyzer {
  eotsCasts = 0;
  pseCasts = 0;
  lastCLCastTimestamp = 0;

  usedCasts = {
    'Eye of the Storm': false,
    'Wind Gust': false,
    'Call Lightning': false,
  };

  damageGained = 0;
  maelstromGained = 0;
  badCasts=0;
  SEup = false;

  constructor(options: any) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(SPELLS.PRIMAL_ELEMENTALIST_TALENT.id)
      && this.selectedCombatant.hasTalent(SPELLS.STORM_ELEMENTAL_TALENT.id);
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER_PET),
      this.onSECast,
    );
    this.addEventListener(
      Events.summon.by(SELECTED_PLAYER).spell(SPELLS.STORM_ELEMENTAL_TALENT),
      this.onSEsummon,
    );
    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER_PET).spell(damagingCasts),
      this.onDamage,
    );
  }

  onSEsummon(event: SummonEvent) {
    this.SEup=true;
  }

  onSECast(event: CastEvent) {
    switch(event.ability.guid) {
      case SPELLS.EYE_OF_THE_STORM.id:
        this.usedCasts['Eye of the Storm']=true;
        break;
      case SPELLS.WIND_GUST.id:
        this.usedCasts['Wind Gust']=true;
        break;
      case SPELLS.CALL_LIGHTNING.id:
        this.usedCasts['Call Lightning']=true;
        this.lastCLCastTimestamp=event.timestamp;
        break;
      default:
        break;
    }
  }

  onDamage(event: DamageEvent) {
    this.damageGained+=event.amount;

    if(event.ability.guid !== SPELLS.CALL_LIGHTNING.id) {
      if(event.timestamp>this.lastCLCastTimestamp+CALL_LIGHTNING_BUFF_DURATION){
        this.badCasts+=1;
      }
    }
  }


  get damagePercent() {
    return this.owner.getPercentageOfTotalDamageDone(this.damageGained);
  }

  get damagePerSecond() {
    return this.damageGained / (this.owner.fightDuration / 1000);
  }

  suggestions(when: any) {
    // @ts-ignore
    const unusedSpells = Object.keys(this.usedCasts).filter(key => !this.usedCasts[key]);
    const unusedSpellsString = unusedSpells.join(', ');
    const unusedSpellsCount = unusedSpells.length;
    when(unusedSpellsCount).isGreaterThan(0)
      .addSuggestion((suggest: any, actual: any, recommended: any) => {
        return suggest(<span> Your Storm Elemental is not using all of it's spells. Check if Wind Gust and Call Lightning are set to autocast and you are using Eye Of The Storm.</span>)
          .icon(SPELLS.STORM_ELEMENTAL_TALENT.icon)
          .actual(`${formatNumber(unusedSpellsCount)} spells not used by your Storm Elemental (${unusedSpellsString})`)
          .recommended(`You should be using all spells of your Storm Elemental.`)
          .major(recommended+1);
      });

    when(this.badCasts).isGreaterThan(0)
      .addSuggestion((suggest: any, actual: any, recommended: any) => {
        return suggest(<span>You are not using <SpellLink id={SPELLS.CALL_LIGHTNING.id} /> on cooldown.</span>)
          .icon(SPELLS.STORM_ELEMENTAL_TALENT.icon)
          .actual(`${formatNumber(this.badCasts)} casts done by your Storm Elemental without the "Call Lightning"-Buff.}`)
          .recommended(`You should be recasting "Call Lightning" before the buff drops off.`)
          .major(recommended+5);
      });
  }

  statistic() {
    return (
      <Statistic>
        <BoringSpellValue
        spell={SPELLS.STORM_ELEMENTAL_TALENT}
        value={<Trans>{formatNumber(this.damageGained)} Damage</Trans>}
        label={<Trans>Damage done</Trans>}
        />
      </Statistic>
    );
  }
}

export default PrimalStormElemental;
