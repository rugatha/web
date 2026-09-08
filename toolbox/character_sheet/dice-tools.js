Object.assign(translations.zh, {
  gender: '性別（選填）', clearRolls: '清除',
  lastPart: '上一部分', nextPart: '下一部分', rollDice: '擲骰決定',
  maxHitPoints: '最高生命值', temporaryHitPoints: '臨時生命值',
  abilityRollDone: '六項能力值已擲骰完畢，請自行決定填入方式',
  hpRollHint: '每組第一顆生命骰固定取滿值，第二顆起隨機擲骰，每顆皆加上 CON 調整值；整組完成後加總。結果僅供參考，請自行填入生命值。',
  hpRollInvalid: '請先設定有效的生命骰，例如 4d8/con+1。',
  hpRollPending: '尚未擲完', hpRollDone: '已擲完，請自行填入生命值',
  editMarkdown: '編輯', viewMarkdown: '檢視', emptyLog: '尚未撰寫跑團紀錄。',
  sessionNotes: '跑團紀錄', markdownSupported: '（支援 Markdown）'
});
Object.assign(translations.en, {
  gender: 'Gender (optional)', clearRolls: 'Clear',
  lastPart: 'Last Part', nextPart: 'Next Part', rollDice: 'Roll Dice',
  maxHitPoints: 'Maximum Hit Points', temporaryHitPoints: 'Temporary Hit Points',
  abilityRollDone: 'All six ability scores have been rolled. Assign them as you wish.',
  hpRollHint: 'The first hit die in each set takes its maximum value; subsequent dice are rolled randomly. Add the CON modifier to each die, then sum the set. Enter your hit points manually.',
  hpRollInvalid: 'Set valid hit dice first, for example 4d8/con+1.',
  hpRollPending: 'Still rolling', hpRollDone: 'Complete — enter your hit points manually',
  editMarkdown: 'Edit', viewMarkdown: 'View', emptyLog: 'No session notes yet.',
  sessionNotes: 'Session Notes', markdownSupported: '(Markdown supported)'
});

const rollDie = sides => {
  // Rejection sampling avoids modulo bias.
  const bytes = new Uint32Array(1);
  const limit = Math.floor(4294967296 / sides) * sides;
  do { crypto.getRandomValues(bytes); } while (bytes[0] >= limit);
  return bytes[0] % sides + 1;
};
const readDiceHistory = id => {
  try { const value = JSON.parse(document.getElementById(id).value); return Array.isArray(value) ? value : []; }
  catch (_) { return []; }
};
const parseHitDice = text => {
  const normalized = text.replace(/\s/g, '').toLowerCase();
  const conMatch = /[/,，]con([+-]\d+)$/.exec(normalized);
  const formula = conMatch ? normalized.slice(0, conMatch.index) : normalized;
  if (!/^(?:\d+d\d+)(?:\+\d+d\d+)*(?:[+-]\d+)?$/.test(formula)) return null;
  const dice = [];
  for (const match of formula.matchAll(/(\d+)d(\d+)/g)) {
    const count = Number(match[1]), sides = Number(match[2]);
    if (count < 1 || count > 100 || sides < 2 || sides > 100 || dice.length + count > 100) return null;
    dice.push(...Array(count).fill(sides));
  }
  const tail = formula.replace(/\d+d\d+/g, '').replace(/^\++/, '+');
  const modifier = /([+-]\d+)$/.exec(tail);
  if (conMatch && modifier) return null;
  return { formula: conMatch ? formula + '/con' + conMatch[1] : formula, dice, perDie: Boolean(conMatch), bonus: conMatch ? Number(conMatch[1]) : modifier ? Number(modifier[1]) : 0 };
};
const abilityRollText = dice => {
  const kept = [...dice];
  const dropped = kept.splice(kept.indexOf(Math.min(...kept)), 1)[0];
  return kept.join('+') + '(+' + dropped + ') = ' + kept.reduce((sum, die) => sum + die, 0);
};
const renderDiceHistory = () => {
  const abilities = readDiceHistory('abilityRollHistory').filter(dice => Array.isArray(dice) && dice.length === 4 && dice.every(n => Number.isInteger(n) && n >= 1 && n <= 6));
  document.getElementById('abilityRollResults').innerHTML = abilities.map((dice, index) =>
    '<li>' + abilityRollText(dice) + (index === 5 ? '<p>' + escapeHTML(t().abilityRollDone) + '</p>' : '') + '</li>'
  ).join('');
  document.getElementById('hpRollResults').innerHTML = readDiceHistory('hpRollHistory').map(set => {
    const parsed = typeof set?.formula === 'string' ? parseHitDice(set.formula) : null;
    if (!parsed || !Array.isArray(set.rolls) || set.rolls.length > parsed.dice.length || !set.rolls.every((n, i) => Number.isInteger(n) && n > 0 && n <= parsed.dice[i])) return '';
    const complete = set.rolls.length === parsed.dice.length;
    const bonusText = (parsed.bonus >= 0 ? '+' : '') + parsed.bonus;
    const rolls = set.rolls.map((n, i) => 'd' + parsed.dice[i] + ': ' + n + (parsed.perDie ? bonusText : '')).join(' · ');
    const total = set.rolls.reduce((sum, n) => sum + n, 0) + parsed.bonus * (parsed.perDie ? set.rolls.length : 1);
    const equation = parsed.perDie ? set.rolls.map(n => '(' + n + bonusText + ')').join('+') : set.rolls.join('+') + bonusText;
    return '<li>' + escapeHTML(parsed.formula) + ' — ' + rolls + ' (' + set.rolls.length + '/' + parsed.dice.length + ') — ' +
      (complete ? equation + ' = ' + total + ' — ' + escapeHTML(t().hpRollDone) : escapeHTML(t().hpRollPending)) + '</li>';
  }).join('');
};
document.addEventListener('click', event => {
  if (event.target.closest('#clearAbilityRolls')) {
    document.getElementById('abilityRollHistory').value = '[]';
    renderDiceHistory(); save();
  }
  if (event.target.closest('#rollAbility')) {
    const history = readDiceHistory('abilityRollHistory');
    history.push(Array.from({ length: 4 }, () => rollDie(6)));
    document.getElementById('abilityRollHistory').value = JSON.stringify(history);
    renderDiceHistory(); save();
  }
  if (event.target.closest('#rollHP')) {
    let parsed = parseHitDice(document.getElementById('hitDice').value);
    // Old saved formulas used a total bonus. New rolls always use CON per die;
    // existing historical sets retain their original calculation.
    if (parsed && !parsed.perDie) {
      const con = modifier(getAbilityScore('con'));
      parsed = parseHitDice(parsed.formula.replace(/[+-]\d+$/, '') + '/con' + (con >= 0 ? '+' : '') + con);
      document.getElementById('hitDice').value = parsed.formula;
    }
    const status = document.getElementById('hpRollStatus');
    status.textContent = parsed ? '' : t().hpRollInvalid;
    if (!parsed) return;
    const history = readDiceHistory('hpRollHistory');
    let set = history[history.length - 1];
    if (!set || parseHitDice(set.formula)?.formula !== parsed.formula || !Array.isArray(set.rolls) || set.rolls.length >= parsed.dice.length) {
      set = { formula: parsed.formula, rolls: [] }; history.push(set);
    }
    const sides = parsed.dice[set.rolls.length];
    set.rolls.push(set.rolls.length === 0 ? sides : rollDie(sides));
    document.getElementById('hpRollHistory').value = JSON.stringify(history);
    renderDiceHistory(); save();
  }
  const mode = event.target.closest('[data-log-mode]');
  if (mode) {
    const row = mode.dataset.logRow;
    const input = document.getElementById('adventureNotes' + row);
    const preview = document.getElementById('adventurePreview' + row);
    const viewing = mode.dataset.logMode === 'view';
    preview.innerHTML = input.value.trim() ? storyMarkdown(input.value) : '<p>' + escapeHTML(t().emptyLog) + '</p>';
    preview.hidden = !viewing; input.hidden = viewing;
    mode.closest('.backstory-toolbar').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button === mode)));
  }
  if (event.target.closest('#languageButton')) renderDiceHistory();
});
document.getElementById('characterSheet').addEventListener('reset', () => {
  window.setTimeout(() => {
    ['abilityRollHistory', 'hpRollHistory'].forEach(id => { document.getElementById(id).value = '[]'; });
    renderDiceHistory(); document.getElementById('hpRollStatus').textContent = ''; save();
  }, 0);
});
