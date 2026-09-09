/* Incremental advancement uses the same 2014 rules as the class catalog.
 * https://www.dndbeyond.com/sources/dnd/basic-rules-2014/customization-options
 * Draft controls live outside the sheet so cancel never changes saved data. */
(() => {
  const $ = id => document.getElementById(id);
  const tr = (zh, en) => guideText(zh, en);
  const esc = escapeHTML;
  const requirements = { barbarian: [['str']], bard: [['cha']], cleric: [['wis']], druid: [['wis']], fighter: [['str', 'dex']], monk: [['dex'], ['wis']], paladin: [['str'], ['cha']], ranger: [['dex'], ['wis']], rogue: [['dex']], sorcerer: [['cha']], warlock: [['cha']], wizard: [['int']] };
  const multiclassGrants = {
    barbarian: ['盾牌、簡易與軍用武器', 'Shields, simple and martial weapons'],
    bard: ['輕甲、任選一項技能與一種樂器', 'Light armor, one skill and one instrument of your choice'],
    cleric: ['輕甲、中甲、盾牌', 'Light and medium armor, shields'],
    druid: ['輕甲、中甲、盾牌（不使用金屬護甲或盾牌）', 'Light and medium armor, shields (no metal armor or shields)'],
    fighter: ['輕甲、中甲、盾牌、簡易與軍用武器', 'Light and medium armor, shields, simple and martial weapons'],
    monk: ['簡易武器、短劍', 'Simple weapons, shortswords'],
    paladin: ['輕甲、中甲、盾牌、簡易與軍用武器', 'Light and medium armor, shields, simple and martial weapons'],
    ranger: ['輕甲、中甲、盾牌、簡易與軍用武器、職業技能任選一項', 'Light and medium armor, shields, simple and martial weapons, one class skill'],
    rogue: ['輕甲、盜賊工具、職業技能任選一項', 'Light armor, thieves’ tools, one class skill'],
    sorcerer: ['無額外熟練', 'No additional proficiencies'], warlock: ['輕甲、簡易武器', 'Light armor, simple weapons'], wizard: ['無額外熟練', 'No additional proficiencies']
  };
  const qualifies = id => Boolean(requirements[id]?.every(group => group.some(key => getAbilityScore(key) >= 13)));
  const requirementText = id => requirements[id]?.map(group => group.map(key => `${abilityData.find(a => a.id === key)?.[currentLanguage] || key.toUpperCase()} 13`).join(tr(' 或 ', ' or '))).join(tr(' 且 ', ' and ')) || tr('未提供資格規則', 'Prerequisites unavailable');
  const classes = () => window.sheetOptions?.classes || [];
  const name = cls => cls?.[currentLanguage] || cls?.[`name_${currentLanguage}`] || cls?.id || '';
  const rows = () => getCharacterClasses();
  const total = () => rows().reduce((sum, r) => sum + r.level, 0);
  const fingerprint = () => JSON.stringify([rows(), $('maxHitPoints').value, abilityData.map(a => getAbilityScore(a.id)), getClassRowIds().map(row => $(`subclass${row}`).value)]);
  const history = () => { try { const data = JSON.parse($('levelUpHistory').value); return Array.isArray(data) ? data.filter(record => record && typeof record === 'object').map(record => ({ ...record, tasks: Array.isArray(record.tasks) ? record.tasks.filter(task => task && typeof task.text === 'string') : [] })) : []; } catch { return []; } };
  let draft;
  let removedHistory = null;
  const dialog = document.createElement('dialog');
  dialog.id = 'levelUpDialog'; dialog.setAttribute('aria-labelledby', 'levelUpTitle');
  document.body.append(dialog);
  const bar = document.createElement('div'); bar.className = 'panel-box level-up-bar';
  // Outside workflow sections: available from both the overview and editing steps.
  $('characterSheet').before(bar);
  const renderBar = () => {
    const records = history();
    bar.innerHTML = `<div class="level-up-heading"><div><strong>${tr('角色成長', 'Character advancement')}</strong><p class="subtle">${tr('保留現有角色，逐等完成升級。使用 D&D 5e 2014 規則。', 'Advance your existing character one level at a time. D&D 5e 2014 rules.')}</p></div><button type="button" class="button" id="startLevelUp">${tr('↑ 升級下一等', '↑ Level up')}</button></div><p id="levelUpStatus" role="status"></p>${!records.length && removedHistory ? `<button type="button" class="button" id="undoClearLevelUpHistory">${tr('復原移除', 'Undo removal')}</button>` : ''}${records.length ? `<div class="level-up-heading"><p class="subtle">${tr('移除紀錄與待辦不會回退角色等級或 HP。', 'Removing records and tasks does not revert character levels or HP.')}</p><button type="button" class="button" id="clearLevelUpHistory">${tr('移除全部升級紀錄與待辦', 'Remove all advancement records & tasks')}</button></div><details><summary>${tr('升級紀錄與待辦', 'Advancement history & checklist')} (${records.length})</summary>${records.slice().reverse().map((record, reverse) => `<div class="panel-box"><strong>${esc(record.label)} · HP ${esc(record.beforeHP)} → ${esc(record.afterHP)}</strong><p class="subtle">${esc(record.hpExplanation || '')}</p>${(record.tasks || []).map((task, index) => `<label class="level-up-task"><input type="checkbox" data-level-record="${records.length - 1 - reverse}" data-level-task="${index}"${task.done ? ' checked' : ''}>${esc(task.text)}</label>`).join('')}<p class="subtle">${tr('在角色卡對應步驟完成調整後勾選；體質調整值若再變動，每個總等級都須回溯調整最高生命值。', 'Check items after editing the corresponding sheet step. Later CON modifier changes adjust maximum HP for every character level.')}</p></div>`).join('')}</details>` : ''}`;
  };
  const target = () => {
    const cls = classes().find(c => c.id === $('upgradeClass')?.value);
    const existing = rows().find(r => r.id === cls?.id);
    return { cls, row: existing?.row, next: (existing?.level || 0) + 1, isNew: !existing };
  };
  const tasksFor = ({ cls, next, isNew }) => {
    const tasks = [];
    const features = cls.featureRules?.classFeatures?.[next - 1] || [];
    features.forEach(f => { if (f.name) tasks.push(tr('核對本級能力：', 'Review feature: ') + cleanSpellText(f.name)); });
    if (isNew) tasks.push(tr('本次兼職取得熟練：', 'New multiclass proficiencies: ') + tr(...multiclassGrants[cls.id]));
    if (features.some(f => /Ability Score Improvement/.test(f.name))) tasks.push(tr('能力值提升：一項 +2 或兩項各 +1（上限 20），或經 DM 同意改選專長。若體質調整值增加，最高 HP 加上「總等級 × 調整值差」。', 'ASI: +2 to one score or +1 to two (maximum 20), or a DM-approved feat. If CON modifier increases, add total level × modifier change to maximum HP.'));
    tasks.push(tr('能力步驟：確認本等級特性、子職業能力及需要選擇的項目（例如戰鬥風格、專精、祈喚）。', 'Features step: review this level’s features, subclass features and choices (such as fighting style, expertise or invocations).'));
    if (['bard','cleric','druid','paladin','ranger','sorcerer','warlock','wizard'].includes(cls.id) || (['fighter','rogue'].includes(cls.id) && next >= 3)) tasks.push(tr('法術區：核對戲法、已知／準備法術、可替換法術、法術書與法術位；依各職業等級決定可學法術，兼職法術位另行合計，契約魔法分開。', 'Spells: review cantrips, known/prepared spells, replacements, spellbook and slots. Learn spells by individual class level; combine multiclass slots separately from Pact Magic.'));
    if (isNew) tasks.push(tr('兼職熟練：只取得兼職表列項目，不取得新職業的豁免熟練或起始裝備。核對角色卡熟練；額外攻擊、無甲防禦不可直接疊加。', 'Multiclass proficiencies: use only the multiclass grants, without new saving throw proficiencies or starting equipment. Review sheet proficiencies; Extra Attack and Unarmored Defense do not simply stack.'));
    tasks.push(tr('冒險資料：核對種族／專長的額外 HP、生命骰、熟練加值、攻擊與資源使用次數；手動覆寫的欄位需自行確認。', 'Adventure details: review racial/feat HP bonuses, Hit Dice, proficiency, attacks and resource uses. Review manually overridden fields.'));
    return tasks.map(text => ({ text, done: false }));
  };
  const preview = () => {
    const choice = target(); const { cls, next, isNew, row } = choice;
    if (!cls) return;
    draft.roll = null;
    const die = Number(getHitDie(cls).slice(2)); draft.die = die;
    const features = cls.featureRules?.classFeatures?.[next - 1] || [];
    const cellText = value => typeof value === 'object' && value !== null ? (value.type === 'bonus' ? '+' : '') + (value.value ?? value.number ?? '—') : String(value ?? '—');
    const resources = (cls.featureRules?.classTableGroups || []).filter(group => !group.subclasses).flatMap(group => (group.colLabels || []).flatMap((label, i) => {
      const before = cellText(group.rows?.[next - 2]?.[i] ?? 0); const after = cellText(group.rows?.[next - 1]?.[i]);
      return before === after ? [] : [`${group.title ? group.title + ' · ' : ''}${String(label).replace(/\{@filter ([^|}]+)[^}]*\}/g, '$1')}: ${before} → ${after}`];
    }));
    const subclass = isNew ? '' : $('subclass' + row).value;
    const subs = (cls.subclasses || []).filter(s => s.minLevel <= next);
    const details = cls.note?.[`lvl${String(next).padStart(2, '0')}_details_${currentLanguage}`] || '';
    $('upgradePreview').innerHTML = `<h3>${esc(name(cls))} ${next - 1} → ${next} · ${tr('總等級', 'Total level')} ${total()} → ${total() + 1}</h3><p>${tr('熟練加值', 'Proficiency')} +${2 + Math.floor((total() - 1) / 4)} → +${2 + Math.floor(total() / 4)} · ${tr('新增生命骰', 'Added Hit Die')} 1d${die}</p>${subs.length ? `<div class="field"><label for="upgradeSubclass">${tr('確認子職業', 'Confirm subclass')}</label><select id="upgradeSubclass"${subclass ? ' disabled' : ''}><option value="">${tr('請選擇', 'Choose')}</option>${subs.map(s => `<option value="${esc(s.id)}"${!isNew && s.id === subclass ? ' selected' : ''}>${esc(currentLanguage === 'zh' ? s.nameZh : s.nameEn)}</option>`).join('')}</select></div>` : ''}<div id="upgradeSubclassPreview"></div><h3>${tr('本等級職業項目', 'Class features this level')}</h3><ul>${features.map(f => `<li>${esc(cleanSpellText(f.name || ''))}</li>`).join('') || `<li>${tr('核對下方等級說明與職業資源表。', 'Review level details and the class resource table below.')}</li>`}</ul><details><summary>${tr('查看本等級完整說明（含子職業選項）', 'Full level details (includes subclass options)')}</summary><div class="level-up-rules">${esc(details || tr('此等級無額外文字說明，請核對職業表。', 'No additional level text; review the class table.'))}</div></details><ul>${resources.map(text => `<li>${esc(text)}</li>`).join('')}</ul><h3>${tr('本次最高生命值增加', 'Maximum HP increase')}</h3><p>${tr('擲一次新等級的生命骰，或採固定值；再加目前體質調整值，至少增加 1 HP。兼職第一等也不取滿骰。', 'Roll the new level’s Hit Die or take the fixed value, then add current CON modifier (minimum 1 HP). A new multiclass does not receive maximum first-level HP.')}</p><div class="field"><label for="upgradeHPMethod">${tr('血量方式', 'HP method')}</label><select id="upgradeHPMethod"><option value="fixed">${tr('固定值', 'Fixed value')} ${die / 2 + 1}</option><option value="roll">${tr('擲骰', 'Roll')} 1d${die}</option><option value="manual">${tr('輸入實體骰結果', 'Enter physical die result')}</option></select></div><button class="button" type="button" id="upgradeRoll" hidden>${tr('擲生命骰', 'Roll Hit Die')}</button><div class="field" id="upgradeManualField" hidden><label for="upgradeManual">${tr('骰面結果（未加體質）', 'Die result (before CON)')}</label><input type="number" id="upgradeManual" min="1" max="${die}" step="1"></div><p id="upgradeHPPreview" role="status"></p><h3>${tr('套用後的調整待辦', 'Checklist after applying')}</h3><ul>${tasksFor(choice).map(t => `<li>${esc(t.text)}</li>`).join('')}</ul>`;
    hpPreview(); subclassPreview();
  };
  const subclassPreview = () => {
    const { cls, next } = target();
    const sub = cls.featureRules?.subclasses?.find(s => `${s.name}|${s.source || ''}` === $('upgradeSubclass')?.value);
    const milestones = (cls.featureRules?.classFeatures || []).flatMap((features, i) => features.some(f => f.gainSubclassFeature) ? [i + 1] : []);
    const entries = sub?.subclassFeatures?.[milestones.indexOf(next)] || [];
    const flatten = value => typeof value === 'string' ? value : Array.isArray(value) ? value.map(flatten).join('\n') : value && typeof value === 'object' ? [value.name, flatten(value.entries || value.items || [])].filter(Boolean).join('\n') : '';
    $('upgradeSubclassPreview').innerHTML = entries.length ? `<details open><summary>${esc(tr('本級子職業能力', 'Subclass features this level'))}</summary><div class="level-up-rules">${esc(cleanSpellText(flatten(entries)))}</div></details>` : '';
  };
  const hpResult = () => {
    const method = $('upgradeHPMethod').value;
    const base = method === 'fixed' ? draft.die / 2 + 1 : method === 'roll' ? draft.roll : Number($('upgradeManual').value);
    if (!Number.isInteger(base) || base < 1 || base > draft.die) return null;
    const con = modifier(getAbilityScore('con')); return { base, con, gain: Math.max(1, base + con), method };
  };
  const hpPreview = () => {
    const method = $('upgradeHPMethod').value;
    $('upgradeRoll').hidden = method !== 'roll'; $('upgradeRoll').disabled = draft.roll !== null;
    $('upgradeManualField').hidden = method !== 'manual';
    const hp = hpResult(); $('upgradeHPPreview').textContent = hp ? `${hp.base} + CON (${hp.con}) → +${hp.gain} HP · ${draft.hp} → ${draft.hp + hp.gain}` : tr('請完成擲骰或輸入有效骰面。', 'Roll or enter a valid die result.');
  };
  const open = async () => {
    await loadOptions(); await loadSubclassOptions();
    const status = $('levelUpStatus');
    if (rows().some(r => !classes().some(c => c.id === r.id) || !Number.isInteger(r.level) || r.level < 1) || total() >= 20) { status.textContent = tr('請先選擇有效職業與等級；總等級 20 已達上限。自訂職業請手動升級。', 'Choose valid classes and levels first. Level 20 is the maximum; advance custom classes manually.'); return; }
    if (history().some(r => r.tasks?.some(t => !t.done))) { status.textContent = tr('請先完成並勾選上次升級待辦，再升下一等。', 'Complete and check the previous advancement tasks before leveling again.'); bar.querySelector('details').open = true; return; }
    if (!/^\d+$/.test($('maxHitPoints').value) || Number($('maxHitPoints').value) < 1) { status.textContent = tr('請先在冒險資料填入目前最高生命值（正整數），才能保留原有血量升級。', 'Enter your current maximum HP as a positive integer in Adventure details first.'); return; }
    if (rows().some(r => !classes().find(c => c.id === r.id)?.featureRules)) { status.textContent = tr('職業規則載入失敗，請重新整理後再試。', 'Class rules failed to load. Reload and try again.'); return; }
    draft = { fingerprint: fingerprint(), hp: Number($('maxHitPoints').value), roll: null };
    const originalsQualify = rows().every(r => qualifies(r.id));
    dialog.innerHTML = `<h2 id="levelUpTitle">${tr('升級下一等', 'Level up')}</h2><p>${tr('1 選職業 → 2 確認能力與血量 → 3 套用後完成待辦', '1 Choose class → 2 Review features & HP → 3 Apply and complete checklist')}</p><p class="subtle">${tr('兼職是 DM 允許的選用規則；需同時符合原職業與新職業門檻。可繼續新增兼職，角色總等級上限仍為 20。', 'Multiclassing requires DM permission and the prerequisites of both current and new classes. Add further classes as needed; the total character level limit remains 20.')}</p><ul>${rows().map(r => `<li>${esc(name(classes().find(c => c.id === r.id)))}: ${esc(requirementText(r.id))} · ${qualifies(r.id) ? '✓' : '✗'}</li>`).join('')}</ul><div class="field"><label for="upgradeClass">${tr('這一等要升哪個職業？', 'Which class gains this level?')}</label><select id="upgradeClass">${classes().map(cls => { const existing = rows().find(r => r.id === cls.id); const allowed = existing || (originalsQualify && qualifies(cls.id)); return `<option value="${esc(cls.id)}"${cls.id === rows()[0].id ? ' selected' : ''}${allowed ? '' : ' disabled'}>${esc(name(cls))} · ${existing ? tr('原職業', 'Current class') : `${tr('兼職', 'New class')}: ${esc(requirementText(cls.id))}${allowed ? ' ✓' : ' ✗'}`}</option>`; }).join('')}</select></div><label class="level-up-task" id="upgradeDMField" hidden><input type="checkbox" id="upgradeDM">${tr('DM 允許本次兼職', 'My DM allows this multiclass')}</label><p><a href="https://www.dndbeyond.com/sources/dnd/basic-rules-2014/customization-options#Multiclassing" target="_blank" rel="noopener noreferrer">${tr('2014 兼職資格、熟練與施法規則表', '2014 multiclass prerequisites, proficiencies & spellcasting tables')}</a></p><div id="upgradePreview"></div><p id="upgradeError" role="alert"></p><div class="level-up-heading"><button type="button" class="button" id="cancelLevelUp">${tr('取消', 'Cancel')}</button><button type="button" class="button" id="applyLevelUp">${tr('套用等級與 HP，建立待辦', 'Apply level & HP, create checklist')}</button></div>`;
    preview(); dialog.showModal();
  };
  const apply = () => {
    const fail = (zh, en) => $('upgradeError').textContent = tr(zh, en);
    if (!draft || fingerprint() !== draft.fingerprint) return fail('角色資料已變動，請關閉後重新開始升級。', 'The sheet changed. Close and restart advancement.');
    const choice = target(); const { cls, next, isNew } = choice; let { row } = choice; const hp = hpResult();
    if (!cls || total() >= 20 || (isNew && (!rows().every(r => qualifies(r.id)) || !qualifies(cls.id) || !$('upgradeDM').checked))) return fail('請確認兼職資格與 DM 同意。', 'Check prerequisites and DM permission.');
    if (!hp) return fail('請完成有效血量結果。', 'Complete a valid HP result.');
    const sub = $('upgradeSubclass')?.value;
    if ($('upgradeSubclass') && !sub) return fail('請選擇子職業。', 'Choose a subclass.');
    const label = `${name(cls)} ${next - 1} → ${next} (${total()} → ${total() + 1})`;
    if (isNew) { row = addClassRow(); $(`class${row}`).value = cls.id; renderOptions(); }
    $(`level${row}`).value = String(next); renderSubclassOptions(row); if (sub) $(`subclass${row}`).value = sub;
    $('maxHitPoints').value = String(draft.hp + hp.gain);
    const records = history(); records.push({ label, beforeHP: draft.hp, afterHP: draft.hp + hp.gain, hpExplanation: `${tr(hp.method === 'fixed' ? '固定值' : hp.method === 'roll' ? '擲骰' : '實體骰', hp.method)}: ${hp.base} + CON (${hp.con}) → +${hp.gain} HP`, tasks: tasksFor(choice), date: new Date().toISOString() }); $('levelUpHistory').value = JSON.stringify(records);
    // Use existing refresh handlers; current and temporary HP are intentionally preserved.
    $(`level${row}`).dispatchEvent(new Event('change', { bubbles: true }));
    renderProficiencyPills(); updateSaves(); updateAllAttacks(); renderDragonBreath(); renderRacialSpells();
    const saved = save(); draft = null; dialog.close(); renderBar(); bar.querySelector('details').open = true;
    $('levelUpStatus').textContent = saved ? tr('等級與最高 HP 已套用。請完成下方待辦；目前 HP 保持原值。', 'Level and maximum HP applied. Complete the checklist below; current HP is unchanged.') : tr('已套用，但瀏覽器儲存失敗；請立即匯出角色卡 JSON。', 'Applied, but browser saving failed. Export the sheet JSON now.');
    if (typeof renderFullSheet === 'function') renderFullSheet();
  };
  const persistHistoryChange = message => {
    const saved = save(); renderBar();
    $('levelUpStatus').textContent = saved ? message : tr('變更已套用，但儲存失敗，請匯出設定檔保存。', 'Changes applied, but saving failed. Export your sheet to keep them.');
  };
  bar.addEventListener('click', e => {
    if (e.target.closest('#startLevelUp')) open();
    if (e.target.closest('#clearLevelUpHistory')) {
      removedHistory = history();
      $('levelUpHistory').value = '[]';
      persistHistoryChange(tr('已移除全部升級紀錄與待辦。', 'All advancement records and tasks removed.'));
      $('undoClearLevelUpHistory')?.focus();
    }
    if (e.target.closest('#undoClearLevelUpHistory') && removedHistory && !history().length) {
      $('levelUpHistory').value = JSON.stringify(removedHistory); removedHistory = null;
      persistHistoryChange(tr('已復原升級紀錄與待辦。', 'Advancement records and tasks restored.'));
      $('clearLevelUpHistory')?.focus();
    }
  });
  bar.addEventListener('change', e => { if (e.target.dataset.levelRecord === undefined) return; const records = history(); records[Number(e.target.dataset.levelRecord)].tasks[Number(e.target.dataset.levelTask)].done = e.target.checked; $('levelUpHistory').value = JSON.stringify(records); save(); });
  dialog.addEventListener('change', e => { if (e.target.id === 'upgradeClass') { preview(); $('upgradeDMField').hidden = !target().isNew; $('upgradeDM').checked = false; } else if (e.target.id === 'upgradeSubclass') subclassPreview(); else if (['upgradeHPMethod', 'upgradeManual'].includes(e.target.id)) hpPreview(); });
  dialog.addEventListener('input', e => { if (e.target.id === 'upgradeManual') hpPreview(); });
  dialog.addEventListener('click', e => { if (e.target.closest('#cancelLevelUp')) dialog.close(); if (e.target.closest('#applyLevelUp')) apply(); if (e.target.closest('#upgradeRoll') && draft.roll === null) { draft.roll = Math.floor(Math.random() * draft.die) + 1; hpPreview(); } });
  dialog.addEventListener('close', () => { draft = null; $('startLevelUp').focus(); });
  // Restore/import and language changes also refresh the persisted checklist.
  window.renderLevelUp = () => { removedHistory = null; renderBar(); };
  document.addEventListener('click', e => { if (e.target.closest('#languageButton')) renderBar(); });
  $('characterSheet').addEventListener('reset', () => {
    // Hidden input values also change their reset defaults, so native reset
    // alone retains the history. Clear it before the sheet's reset is saved.
    $('levelUpHistory').value = '[]'; removedHistory = null;
    if (dialog.open) dialog.close();
    renderBar();
    setTimeout(() => { renderBar(); save(); }, 0);
  });
  renderBar();
})();
