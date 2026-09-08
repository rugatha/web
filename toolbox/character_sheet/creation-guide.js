/* Character creation choices share the sheet's existing JSON persistence. */
const guideText = (zh, en) => currentLanguage === 'zh' ? zh : en;
// Dragonborn traits use the 2014 rules, consistent with the race catalog.
// https://www.dndbeyond.com/sources/dnd/basic-rules-2014/races#Dragonborn
const dragonAncestries = [
  ['black', '黑龍', 'Black', '強酸', 'Acid', 'line', 'dex'],
  ['blue', '藍龍', 'Blue', '閃電', 'Lightning', 'line', 'dex'],
  ['brass', '黃銅龍', 'Brass', '火焰', 'Fire', 'line', 'dex'],
  ['bronze', '青銅龍', 'Bronze', '閃電', 'Lightning', 'line', 'dex'],
  ['copper', '赤銅龍', 'Copper', '強酸', 'Acid', 'line', 'dex'],
  ['gold', '金龍', 'Gold', '火焰', 'Fire', 'cone', 'dex'],
  ['green', '綠龍', 'Green', '毒素', 'Poison', 'cone', 'con'],
  ['red', '紅龍', 'Red', '火焰', 'Fire', 'cone', 'dex'],
  ['silver', '銀龍', 'Silver', '寒冷', 'Cold', 'cone', 'con'],
  ['white', '白龍', 'White', '寒冷', 'Cold', 'cone', 'con']
];
const renderDragonAncestry = () => {
  const select = document.getElementById('dragonAncestry'); if (!select) return;
  const value = select.value;
  document.getElementById('dragonAncestryField').hidden = document.getElementById('race').value !== 'dragonborn';
  document.querySelector('label[for="dragonAncestry"]').textContent = guideText('龍族祖先（龍種）', 'Draconic ancestry');
  select.innerHTML = `<option value="">${escapeHTML(t().choose)}</option>${dragonAncestries.map(row => `<option value="${row[0]}">${escapeHTML(guideText(row[1], row[2]))} · ${escapeHTML(guideText(row[3], row[4]))}</option>`).join('')}`;
  select.value = value;
  renderDragonBreath();
};
const dragonBreathData = () => {
  if (document.getElementById('race').value !== 'dragonborn') return null;
  const ancestry = dragonAncestries.find(row => row[0] === document.getElementById('dragonAncestry').value); if (!ancestry) return null;
  const level = Number(document.getElementById('level1').value || 1) + (multiclass ? Number(document.getElementById('level2').value || 0) : 0);
  const dice = level >= 16 ? 5 : level >= 11 ? 4 : level >= 6 ? 3 : 2;
  const proficiency = Number(String(fieldValue('proficiency')).replace('+', '')) || 2;
  return { ancestry, damage: `${dice}d6`, dc: 8 + proficiency + modifier(getAbilityScore('con')) };
};
const renderDragonBreath = () => {
  const body = document.getElementById('dragonBreathRows'); if (!body) return;
  const data = dragonBreathData(); if (!data) { body.innerHTML = ''; return; }
  const { ancestry: row, damage, dc } = data;
  const name = guideText(row[1], row[2]); const type = guideText(row[3], row[4]);
  const area = row[5] === 'line' ? guideText('5 呎寬、30 呎長直線', '5 by 30 ft. line') : guideText('15 呎錐狀', '15 ft. cone');
  const saveName = row[6] === 'dex' ? guideText('敏捷豁免', 'DEX save') : guideText('體質豁免', 'CON save');
  const notes = `${area}；${guideText('動作；豁免成功傷害減半；短休或長休恢復一次使用。傷害抗性：', 'Action; half damage on a successful save; recharges after a short or long rest. Damage resistance: ')}${type}`;
  body.innerHTML = `<tr class="dragon-breath-row"><td data-label="${escapeHTML(t().weapon)}">${guideText('龍息', 'Breath Weapon')} · ${escapeHTML(name)}</td><td data-label="${escapeHTML(t().specialization)}">${guideText('種族能力', 'Racial trait')}</td><td data-label="${escapeHTML(t().attackBonus)}">DC ${dc} · ${saveName}</td><td data-label="${escapeHTML(t().damage)}">${damage}</td><td data-label="${escapeHTML(t().damageType)}">${type}</td><td data-label="${escapeHTML(t().notes)}">${escapeHTML(notes)}</td><td class="attack-action-cell"></td></tr>`;
};
// Only fixed feature entries qualify. Nested option lists are choices, not grants.
const fixedFeatureEntries = (entries) => (entries || []).flatMap(entry => {
  if (!entry || typeof entry !== 'object' || entry.type === 'options' || entry.type === 'invocation') return [];
  return [...(entry.name ? [entry] : []), ...fixedFeatureEntries(entry.entries)];
});
const isAutomaticClassFeature = (item, choice) => {
  if (item.sub_category !== choice.id && !item.sub_category.startsWith(`${choice.id}_`)) return false;
  const data = window.sheetOptions?.classes?.find(cls => cls.id === choice.id)?.featureRules;
  if (!data) return false;
  const level = Number(item.level);
  const base = (data.classFeatures?.[level - 1] || []).filter(entry => entry.name === item.title_en);
  if (base.length) return true;
  const subclass = data.subclasses?.find(sub => `${sub.name}|${sub.source || ''}` === choice.subclassId);
  if (!subclass) return false;
  const milestones = (data.classFeatures || []).flatMap((entries, index) => entries.some(entry => entry.gainSubclassFeature) ? [index + 1] : []);
  const slot = milestones.indexOf(level); if (slot < 0) return false;
  const matching = fixedFeatureEntries(subclass.subclassFeatures?.[slot]).filter(entry => entry.name === item.title_en);
  if (!matching.length) return false;
  // Several patrons share this title; the description identifies its owner.
  if (item.title_en === 'Expanded Spell List') return String(item.desc_en).toLowerCase().includes(subclass.name.toLowerCase());
  return true;
};
const readCreationChoices = () => {
  try { const value = JSON.parse(document.getElementById('creationChoices').value || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; }
};
const writeCreationChoices = (value) => { document.getElementById('creationChoices').value = JSON.stringify(value); };
const primaryCreationClass = () => window.sheetOptions?.classes?.find(item => item.id === document.getElementById('class1').value);
const backgroundSkillNames = () => window.sheetOptions?.backgrounds?.find(item => item.id === document.getElementById('background').value)?.skills_en || [];
const classSkillRule = () => {
  const text = primaryCreationClass()?.note?.lvl01_details_en?.split('\n').find(line => /Skills:/.test(line)) || '';
  const count = { two: 2, three: 3, four: 4 }[text.match(/\b(two|three|four)\b/i)?.[1]?.toLowerCase()] || 0;
  return { count, skills: skillData.filter(skill => /Any three/i.test(text) || text.includes(skill.en)) };
};
const guidedSkillNames = () => {
  const cls = primaryCreationClass(); const rule = classSkillRule();
  const choices = readCreationChoices()[cls?.id]?.skills || [];
  return [...backgroundSkillNames(), ...rule.skills.filter(skill => choices.includes(skill.en)).slice(0, rule.count).map(skill => skill.en)];
};
const classSkillChoicesComplete = () => {
  const rule = classSkillRule();
  const selected = readCreationChoices()[primaryCreationClass()?.id]?.skills || [];
  const valid = rule.skills.filter(skill => selected.includes(skill.en) && !backgroundSkillNames().includes(skill.en));
  return rule.count > 0 && valid.length === rule.count;
};
const startingEquipmentGroups = () => {
  const cls = primaryCreationClass(); if (!cls) return [];
  const lines = language => (cls.note?.[`lvl01_details_${language}`] || '').split(language === 'zh' ? '起始裝備\n\n' : 'Starting Equipment\n\n')[1]?.split('\n\n')[0]?.split('\n').filter(line => line.startsWith('•')).map(line => line.replace(/^•\s*/, '')) || [];
  const zh = lines('zh');
  return lines('en').map((line, index) => {
    // Commas belong to a bundle unless the entire line is a list of alternatives.
    const conditional = /, if proficient$/.test(line); const optionLine = line.replace(/, if proficient$/, '');
    const splitEn = optionLine.includes(', or ') && !/ and /.test(optionLine) ? optionLine.split(/, (?:or )?/) : optionLine.split(/,? or /);
    if (conditional) splitEn[splitEn.length - 1] += ', if proficient';
    const splitZh = (zh[index] || line).includes('、') && !/與/.test(zh[index]) && /或/.test(zh[index]) ? zh[index].split(/、|，?或/) : (zh[index] || line).split(/，?或/);
    return { zh: zh[index] || line, en: line, options: splitEn.map((en, option) => ({ en, zh: splitZh.length === splitEn.length ? splitZh[option] : en })) };
  });
};
const equipmentWeaponChoices = text => (window.sheetOptions?.weapons || []).filter(weapon => {
  if (/martial/i.test(text) && weapon.proficiency !== '軍用') return false;
  if (/simple/i.test(text) && weapon.proficiency !== '簡易') return false;
  return !/melee/i.test(text) || !/遠程|Ranged/.test(weapon.rangeType);
});
const renderCreationGuide = () => {
  renderDragonAncestry();
  const container = document.getElementById('creationGuide'); if (!container) return;
  const cls = primaryCreationClass(); if (!cls) { container.innerHTML = ''; renderSkillConflict(); return; }
  const rule = classSkillRule(); const state = readCreationChoices()[cls.id] || {};
  const selected = Array.isArray(state.skills) ? state.skills : []; const background = backgroundSkillNames();
  const count = rule.skills.filter(skill => selected.includes(skill.en)).length;
  const skillChoices = rule.skills.map(skill => {
    const granted = background.includes(skill.en); const checked = selected.includes(skill.en);
    return `<label class="guided-skill"><input type="checkbox" data-guide-skill="${escapeHTML(skill.en)}"${checked || granted ? ' checked' : ''}${(granted && !checked) || (!checked && count >= rule.count) ? ' disabled' : ''}><span>${escapeHTML(skill[currentLanguage])}${granted ? ` <small>${checked ? guideText('與背景重複，請取消並另選', 'Overlaps background: uncheck and replace') : guideText('背景已提供', 'From background')}</small>` : ''}</span></label>`;
  }).join('');
  const groups = startingEquipmentGroups();
  const equipment = groups.map((group, index) => {
    const choice = state.equipment?.[index] ?? (group.options.length === 1 ? '0' : ''); const option = group.options[choice];
    const generic = option && /(?:any|one|two) (?:simple|martial).*weapon/i.test(option.en);
    const weaponCount = generic && /two .*weapons/i.test(option.en) ? 2 : 1;
    return `<div class="field"><label for="starterChoice${index}">${index + 1}. ${escapeHTML(group[currentLanguage])}</label><select id="starterChoice${index}" data-starter-choice="${index}"><option value="">${escapeHTML(t().choose)}</option>${group.options.map((entry, i) => `<option value="${i}"${String(choice) === String(i) ? ' selected' : ''}>${escapeHTML(entry[currentLanguage])}</option>`).join('')}</select>${generic ? Array.from({ length: weaponCount }, (_, slot) => `<label class="starter-specific" for="starterWeapon${index}-${slot}">${guideText('選擇武器', 'Choose weapon')} ${slot + 1}<select id="starterWeapon${index}-${slot}" data-starter-weapon="${index}" data-weapon-slot="${slot}"><option value="">${escapeHTML(t().choose)}</option>${equipmentWeaponChoices(option.en).map(weapon => `<option value="${escapeHTML(weapon.id)}"${state.weapons?.[`${index}-${slot}`] === weapon.id ? ' selected' : ''}>${escapeHTML(currentLanguage === 'zh' ? weapon.nameZh : weapon.nameEn)}</option>`).join('')}</select></label>`).join('') : ''}${option && /instrument|artisan|focus/i.test(option.en) ? `<label class="starter-specific" for="starterDetail${index}">${guideText('具體物品／法器名稱', 'Specific item / focus')}<input id="starterDetail${index}" data-starter-detail="${index}" value="${escapeHTML(state.details?.[index] || '')}"></label>` : ''}</div>`;
  }).join('');
  container.innerHTML = `<div class="panel-box"><h3 class="subsection-title">${guideText('接著選擇職業技能', 'Choose your class skills')}</h3><p class="subtle" role="status">${guideText(`已選 ${count}／${rule.count} 項。背景提供的技能不占職業名額；請完成背景後確認有無重複。`, `${count} of ${rule.count} selected. Background skills do not use class choices; check for overlap after choosing a background.`)}</p><div class="guided-skills">${skillChoices}</div></div><details class="panel-box" open><summary>${guideText('選擇起始護甲、武器與套裝', 'Choose starting armor, weapons & packs')}</summary><p class="subtle">${guideText('依第一個職業選擇起始裝備；兼職不會再給一套。每一列選一項，再加入角色卡。', 'Starting equipment comes from your first class, not multiclassing. Choose one option per row, then add it to the sheet.')}</p><div class="starter-options">${equipment}</div><button class="button" type="button" id="applyStarterEquipment"${state.applied ? ' disabled' : ''}>${state.applied ? guideText('已加入角色卡', 'Added to sheet') : guideText('加入起始裝備', 'Add starting equipment')}</button><p id="starterStatus" class="subtle" role="status"></p></details>`;
  renderStarterPreviews();
  renderSkillConflict();
  if (window.sheetOptions && !equipmentOptionsPromise) loadEquipmentOptions().then(() => renderCreationGuide());
};

const skillConflicts = () => (readCreationChoices()[primaryCreationClass()?.id]?.skills || []).filter(name => backgroundSkillNames().includes(name));
const conflictMessage = () => guideText('背景與職業技能重複：', 'Background and class skills overlap: ') + skillConflicts().map(name => skillData.find(skill => skill.en === name)?.[currentLanguage] || name).join('、') + guideText('。請回到職業技能，取消重複項目並另選技能。', '. Return to class skills, uncheck duplicates and choose replacements.');
const renderSkillConflict = () => {
  let warning = document.getElementById('skillConflictWarning');
  if (!warning) { warning = document.createElement('div'); warning.id = 'skillConflictWarning'; warning.className = 'skill-conflict'; warning.setAttribute('role', 'alert'); document.getElementById('backgroundSection').append(warning); }
  warning.hidden = !skillConflicts().length;
  warning.innerHTML = warning.hidden ? '' : `${escapeHTML(conflictMessage())} <button type="button" class="button" id="returnToClassSkills">${guideText('回到技能選擇', 'Review class skills')}</button>`;
};
const weaponPreview = weapon => `<strong>${escapeHTML(currentLanguage === 'zh' ? weapon.nameZh : weapon.nameEn)}</strong><br>${escapeHTML(guideText('傷害', 'Damage'))}: ${escapeHTML(weapon.damage)} · ${escapeHTML(weapon.damageType)}<br>${escapeHTML(weapon.rangeType)} · ${escapeHTML(weapon.ability)}<br>${escapeHTML((weapon.properties || []).join(' · '))}`;
const armorPreview = armor => {
  const dex = armor.dexRule === '全部' ? guideText('＋敏捷調整值', '+ DEX modifier') : armor.dexRule === '最多 +2' ? guideText('＋敏捷調整值（最多 +2）', '+ DEX modifier (max +2)') : guideText('（不加敏捷）', '(no DEX modifier)');
  return `<strong>${escapeHTML(currentLanguage === 'zh' ? armor.nameZh : armor.nameEn)}</strong><br>AC ${armor.ac} ${escapeHTML(dex)}`;
};
const renderStarterPreviews = () => {
  const state = readCreationChoices()[primaryCreationClass()?.id] || {};
  startingEquipmentGroups().forEach((group, index) => {
    const select = document.getElementById(`starterChoice${index}`); if (!select) return;
    const option = group.options[select.value]; if (!option) return;
    const names = option.en.toLowerCase();
    const weapons = (window.sheetOptions?.weapons || []).filter(weapon => names.includes(weapon.nameEn.toLowerCase()) || [state.weapons?.[`${index}-0`], state.weapons?.[`${index}-1`]].includes(weapon.id));
    const packs = (window.sheetOptions?.equipment || []).filter(item => item.type === 'pack' && names.includes(item.nameEn.toLowerCase().replace(/’/g, "'")));
    const armorMatches = (window.sheetOptions?.armors || []).filter(armor => names.includes(armor.nameEn.toLowerCase()));
    const armors = armorMatches.filter(armor => !armorMatches.some(other => other !== armor && other.nameEn.toLowerCase().includes(armor.nameEn.toLowerCase())));
    const shield = /\bshield\b/i.test(names) ? [`<strong>${guideText('盾牌', 'Shield')}</strong><br>AC +2`] : [];
    const html = [...armors.map(armorPreview), ...shield, ...weapons.map(weaponPreview), ...packs.map(pack => `<strong>${escapeHTML(currentLanguage === 'zh' ? pack.nameZh : pack.nameEn)}</strong><ul>${(pack.contents || []).map(item => `<li>${escapeHTML(currentLanguage === 'zh' ? item.nameZh : item.nameEn)} × ${item.quantity}</li>`).join('')}</ul>`)].join('<hr>');
    if (!html) return;
    const preview = document.createElement('div'); preview.className = 'starter-preview'; preview.innerHTML = html; select.parentElement.append(preview);
  });
};
const renderEquipmentSelectionPreview = () => {
  const select = document.getElementById('equipmentSelect');
  let preview = document.getElementById('equipmentSelectionPreview');
  if (!preview) { preview = document.createElement('div'); preview.id = 'equipmentSelectionPreview'; preview.className = 'starter-preview'; select.closest('.equipment-picker').after(preview); }
  const pack = window.sheetOptions?.equipment?.find(item => item.id === select.value && item.type === 'pack');
  preview.hidden = !pack;
  preview.innerHTML = pack ? `<strong>${escapeHTML(currentLanguage === 'zh' ? pack.nameZh : pack.nameEn)}</strong><ul>${pack.contents.map(item => `<li>${escapeHTML(currentLanguage === 'zh' ? item.nameZh : item.nameEn)} × ${item.quantity}</li>`).join('')}</ul>` : '';
};

let starterApplying = false;
const applyStarterEquipment = async () => {
  const cls = primaryCreationClass(); if (!cls) return;
  const all = readCreationChoices(); const state = all[cls.id] || {}; if (state.applied || starterApplying) return;
  const groups = startingEquipmentGroups(); const picked = groups.map((group, index) => ({ group, index, option: group.options[state.equipment?.[index] ?? (group.options.length === 1 ? '0' : '')] }));
  const missing = picked.some(({ option, index }) => !option || (/(?:any|one|two) (?:simple|martial).*weapon/i.test(option.en) && Array.from({ length: /two .*weapons/i.test(option.en) ? 2 : 1 }, (_, slot) => state.weapons?.[`${index}-${slot}`]).some(value => !value)) || (/instrument|artisan|focus/i.test(option.en) && !state.details?.[index]?.trim()));
  if (missing) { document.getElementById('starterStatus').textContent = guideText('請完成每列選擇，並填寫具體武器／物品。', 'Complete every choice and specify each weapon / item.'); return; }
  starterApplying = true;
  try {
  await loadEquipmentOptions();
  // Abort if the user changed class while the catalog was loading.
  if (primaryCreationClass()?.id !== cls.id) return;
  const weaponIds = new Set();
  picked.forEach(({ option, index }) => {
    const generic = /(?:any|one|two) (?:simple|martial).*weapon/i.test(option.en);
    const weapons = generic ? Array.from({ length: /two .*weapons/i.test(option.en) ? 2 : 1 }, (_, slot) => window.sheetOptions.weapons.find(item => item.id === state.weapons?.[`${index}-${slot}`])).filter(Boolean) : [];
    const suffix = weapons.map(item => currentLanguage === 'zh' ? item.nameZh : item.nameEn);
    equipmentItems.push({ id: `starter:${cls.id}:${index}`, nameZh: option.zh + (weapons.length ? `（${weapons.map(item => item.nameZh).join('、')}）` : '') + (state.details?.[index] ? `（${state.details[index]}）` : ''), nameEn: option.en + (suffix.length ? ` (${weapons.map(item => item.nameEn).join(', ')})` : '') + (state.details?.[index] ? ` (${state.details[index]})` : ''), quantity: 1 });
    weapons.forEach(item => weaponIds.add(item.id));
    const en = option.en.toLowerCase();
    window.sheetOptions.weapons.forEach(item => { if (en.includes(item.nameEn.toLowerCase())) weaponIds.add(item.id); });
    window.sheetOptions.armors.forEach(item => { if (en.includes(item.nameEn.toLowerCase()) && !armorRows.some(row => row.choice === item.id)) armorRows.push({ choice: item.id, worn: !armorRows.some(row => row.worn), custom: '', customAC: '10' }); });
    if (/shield/i.test(en) && !shieldRows.some(row => row.choice === 'shield')) shieldRows.push({ choice: 'shield', worn: true, custom: '', customAC: '0' });
  });
  const attacks = captureAttackValues();
  weaponIds.forEach(id => { if (Object.entries(attacks).some(([key, value]) => /^attackWeapon\d+$/.test(key) && value === id)) return; const empty = Array.from({ length: attackRowCount }, (_, i) => i + 1).find(row => !attacks[`attackWeapon${row}`] && !attackCustomRows[row] && !attacks[`attackWeaponCustom${row}`]); const row = empty || ++attackRowCount; attacks[`attackWeapon${row}`] = id; });
  renderAttackRows(); restoreAttackValues(attacks); updateAllAttacks(); renderArmorLoadout(); updateArmorClass(); renderEquipmentItems();
  state.applied = true; const latest = readCreationChoices(); latest[cls.id] = state; writeCreationChoices(latest); renderCreationGuide(); save();
  } finally { starterApplying = false; }
};

// Render escaped Markdown; raw HTML never becomes executable markup.
const storyInline = text => escapeHTML(text).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
const storyMarkdown = text => {
  let code = false; let list = ''; const result = [];
  const closeList = () => { if (list) result.push(`</${list}>`); list = ''; };
  String(text).split(/\r?\n/).forEach(line => {
    if (/^```/.test(line)) { closeList(); result.push(code ? '</code></pre>' : '<pre><code>'); code = !code; return; }
    if (code) { result.push(escapeHTML(line) + '\n'); return; }
    const bullet = line.match(/^\s*(?:[-*+] |\d+\. )(.*)/); const kind = /^\s*\d+\./.test(line) ? 'ol' : 'ul';
    if (bullet) { if (list !== kind) { closeList(); list = kind; result.push(`<${kind}>`); } result.push(`<li>${storyInline(bullet[1])}</li>`); return; }
    closeList(); const heading = line.match(/^(#{1,6})\s+(.+)/);
    if (heading) result.push(`<h${heading[1].length}>${storyInline(heading[2])}</h${heading[1].length}>`);
    else if (/^>\s?/.test(line)) result.push(`<blockquote>${storyInline(line.replace(/^>\s?/, ''))}</blockquote>`);
    else if (/^\s*---+\s*$/.test(line)) result.push('<hr>');
    else if (line.trim()) result.push(`<p>${storyInline(line)}</p>`);
  });
  closeList(); if (code) result.push('</code></pre>'); return result.join('');
};
const renderBackstoryPreview = () => {
  document.getElementById('backstoryEdit').textContent = guideText('編輯', 'Edit');
  document.getElementById('backstoryView').textContent = guideText('檢視', 'View');
  const text = document.getElementById('backstoryMarkdown').value;
  document.getElementById('backstoryPreview').innerHTML = text.trim() ? storyMarkdown(text) : `<p>${guideText('尚未撰寫背景故事。', 'No backstory yet.')}</p>`;
};
const racialSpellGrants = () => {
  const race = document.getElementById('race').value; const subrace = document.getElementById('subrace').value;
  const level = Number(document.getElementById('level1').value || 0) + (multiclass ? Number(document.getElementById('level2').value || 0) : 0);
  const grants = race === 'tiefling' ? [['Thaumaturgy', 1], ['Hellish Rebuke', 3], ['Darkness', 5]] : race === 'elf' && subrace === 'drow' ? [['Dancing Lights', 1], ['Faerie Fire', 3], ['Darkness', 5]] : race === 'gnome' && subrace === 'forest-gnome' ? [['Minor Illusion', 1]] : [];
  return grants.filter(([, min]) => level >= min).map(([name]) => window.sheetOptions?.spells?.find(spell => spell.name_en?.toLowerCase() === name.toLowerCase())).filter(Boolean);
};
const renderRacialSpells = () => {
  const container = document.getElementById('racialSpells'); if (!container) return;
  container.innerHTML = racialSpellGrants().map(spell => `<details class="panel-box"><summary>${escapeHTML(currentLanguage === 'zh' ? spell.name_zh : spell.name_en)} · ${spell.level} · ${guideText('種族自帶', 'Granted by race')}</summary><p class="subtle">${guideText(spell.level ? '每次長休可施放一次；依種族規則施放，不占職業已知／準備名額。' : '種族戲法，不占職業戲法名額。', spell.level ? 'Once per long rest under your racial trait; does not count against class spells known / prepared.' : 'Racial cantrip; does not count against class cantrips.')}${spell.name_en === 'Hellish Rebuke' ? guideText(' 煉獄叱喝以 2 環施放。', ' Hellish Rebuke is cast at 2nd level.') : ''}</p><div class="spell-detail">${escapeHTML(currentLanguage === 'zh' ? spell.descriptionZh : spell.descriptionEn)}</div></details>`).join('');
};

document.addEventListener('change', event => {
  const el = event.target; const cls = primaryCreationClass();
  if (el.id === 'dragonAncestry') { renderDragonBreath(); save(); }
  if (el.id === 'equipmentSelect') renderEquipmentSelectionPreview();
  if (el.matches('[data-guide-skill], [data-starter-choice], [data-starter-weapon], [data-starter-detail]') && cls) {
    const all = readCreationChoices(); const state = all[cls.id] || { skills: [], equipment: {}, weapons: {}, details: {} };
    if (el.dataset.guideSkill) { const choices = new Set(state.skills || []); if (el.checked && choices.size < classSkillRule().count) choices.add(el.dataset.guideSkill); else choices.delete(el.dataset.guideSkill); state.skills = [...choices]; }
    if (el.dataset.starterChoice !== undefined) { (state.equipment ||= {})[el.dataset.starterChoice] = el.value; delete (state.weapons ||= {})[`${el.dataset.starterChoice}-0`]; delete state.weapons[`${el.dataset.starterChoice}-1`]; delete (state.details ||= {})[el.dataset.starterChoice]; }
    if (el.dataset.starterWeapon !== undefined) { (state.weapons ||= {})[`${el.dataset.starterWeapon}-${el.dataset.weaponSlot}`] = el.value; }
    if (el.dataset.starterDetail !== undefined) { (state.details ||= {})[el.dataset.starterDetail] = el.value; }
    all[cls.id] = state; writeCreationChoices(all); renderCreationGuide(); renderProficiencyPills(); updateSaves(); save();
  }
  if (el.id === 'background') {
    renderSkillConflict();
  }
  if (el.matches('#class1, #background, #race, #subrace, .level-select')) { renderCreationGuide(); renderProficiencyPills(); updateSaves(); renderRacialSpells(); if (window.sheetOptions && !window.sheetOptions.spells.length) loadSpellOptions(); save(); }
});
document.addEventListener('click', event => {
  if (event.target.closest('#returnToClassSkills')) { switchWorkflowView('workflowIdentity'); const section = document.getElementById('identitySection'); if (section.classList.contains('is-collapsed')) section.querySelector('.section-collapse')?.click(); document.getElementById('creationGuide').scrollIntoView({ behavior: 'smooth', block: 'start' }); document.querySelector('[data-guide-skill]')?.focus({ preventScroll: true }); }
  if (event.target.closest('#applyStarterEquipment')) applyStarterEquipment();
  if (event.target.closest('#languageButton')) { renderCreationGuide(); renderBackstoryPreview(); renderRacialSpells(); renderEquipmentSelectionPreview(); }
  if (event.target.closest('#backstoryEdit, #backstoryView')) { const preview = Boolean(event.target.closest('#backstoryView')); renderBackstoryPreview(); document.getElementById('backstoryPreview').hidden = !preview; document.getElementById('backstoryMarkdown').hidden = preview; document.getElementById('backstoryEdit').setAttribute('aria-pressed', String(!preview)); document.getElementById('backstoryView').setAttribute('aria-pressed', String(preview)); }
});
document.getElementById('characterSheet').addEventListener('reset', () => window.setTimeout(() => { renderCreationGuide(); renderBackstoryPreview(); renderRacialSpells(); }, 0));
renderDragonAncestry();
