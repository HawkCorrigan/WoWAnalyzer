import RESOURCE_TYPES from 'game/RESOURCE_TYPES';

import SpellResourceCost from 'parser/shared/modules/SpellResourceCost';
import SPELLS from 'common/SPELLS';

const MASTER_MARKSMAN_REDUCER = 0;
const LOCK_N_LOAD_REDUCER = 0;
const DOUBLE_TAP_REDUCER = 0;
const VIPERS_VENOM_REDUCER = 0;

class SpellFocusCost extends SpellResourceCost {
  static resourceType = RESOURCE_TYPES.FOCUS;

  constructor(...args) {
    super(...args);
    this.masterMarksman = this.selectedCombatant.hasTalent(SPELLS.MASTER_MARKSMAN_TALENT.id);
    this.lockAndLoad = this.selectedCombatant.hasTalent(SPELLS.LOCK_AND_LOAD_TALENT.id);
    this.doubleTap = this.selectedCombatant.hasTalent(SPELLS.DOUBLE_TAP_TALENT.id);
    this.vipersVenom = this.selectedCombatant.hasTalent(SPELLS.VIPERS_VENOM_TALENT.id);
  }

  getResourceCost(event) {
    const cost = super.getResourceCost(event);
    const spellId = event.ability.guid;
    if (this.masterMarksman && this.selectedCombatant.hasBuff(SPELLS.MASTER_MARKSMAN_BUFF.id) && spellId === (SPELLS.ARCANE_SHOT.id || SPELLS.MULTISHOT_MM.id)) {
      return cost * MASTER_MARKSMAN_REDUCER;
    }
    if (this.lockAndLoad && this.selectedCombatant.hasBuff(SPELLS.LOCK_AND_LOAD_BUFF.id) && spellId === SPELLS.AIMED_SHOT.id) {
      return cost * LOCK_N_LOAD_REDUCER;
    }
    if (this.doubleTap && this.selectedCombatant.hasBuff(SPELLS.DOUBLE_TAP_TALENT.id) && spellId === SPELLS.AIMED_SHOT.id) {
      return cost * DOUBLE_TAP_REDUCER;
    }
    if (this.vipersVenom && this.selectedCombatant.hasBuff(SPELLS.VIPERS_VENOM_BUFF.id) && spellId === SPELLS.SERPENT_STING_SV.id) {
      return cost * VIPERS_VENOM_REDUCER;
    }
    return cost;
  }
}

export default SpellFocusCost;
