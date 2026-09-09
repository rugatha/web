Object.assign(translations.zh, { fullSheet: '完整角色卡', startCharacter: '開始製作角色卡', overviewEdit: '前往調整', overviewHint: '除少數部分外，角色資料為唯讀，請切換至對應步驟修改。' });
Object.assign(translations.en, { fullSheet: 'Full Character Sheet', startCharacter: 'Start Creating Character', overviewEdit: 'Edit this part', overviewHint: 'Aside from specific parts, the character details are read-only; use the relevant step to edit them.' });

// Build a display-only snapshot: no duplicated field IDs, editable controls,
// or event-bearing wizard controls enter the overview or exported form data.
const overviewCollapsedSections = new Map();
const readonlySection = source => {
  if (source.id === 'spellSection') {
    const hasSpell = [...source.querySelectorAll('.spell-name-select')].some(select => Boolean(select.value));
    const hasRacialSpell = Boolean(source.querySelector('#racialSpells')?.textContent.trim());
    if (!hasSpell && !hasRacialSpell) return null;
  }
  const copy = source.cloneNode(true);
  const preserveControls = new Set(['skillsSection', 'abilityScoreSection', 'adventureSection', 'equipmentSection', 'attackSection']).has(source.id);
  const editableId = new Set(['hitPoints', 'temporaryHitPoints', 'wealthPlatinum', 'wealthGold', 'wealthSilver', 'wealthCopper']);
  copy.querySelectorAll('.equipment-picker').forEach(node => node.hidden = true);
  if (source.id === 'characterAbilitySection') {
    copy.querySelectorAll('.character-ability-note').forEach(note => {
      if (!note.querySelector('textarea')?.value.trim()) note.remove();
    });
  }
  if (source.id === 'attackSection') {
    copy.querySelectorAll('#attackRows tr').forEach(row => {
      const weapon = row.querySelector('.weapon-select');
      const custom = row.querySelector('.weapon-custom');
      if (!weapon) return;
      const originalWeapon = document.getElementById(weapon.id);
      const originalCustom = custom && document.getElementById(custom.id);
      if (!originalWeapon?.value && !(originalCustom && !originalCustom.hidden && originalCustom.value.trim())) row.remove();
    });
    if (!copy.querySelector('tbody tr')) copy.querySelector('.attack-table-layout')?.remove();
  }
  if (source.id === 'spellSection') {
    copy.querySelectorAll('#spellRows tr').forEach(row => {
      const name = row.querySelector('.spell-name-select');
      if (name && !document.getElementById(name.id)?.value) row.remove();
    });
  }
  const originals = [...source.querySelectorAll('input, select, textarea')];
  copy.querySelectorAll('input, select, textarea').forEach((field, index) => {
    const original = document.getElementById(field.id) || originals[index];
    if (original.type === 'hidden' || original.type === 'file') { field.remove(); return; }
    if (preserveControls) {
      // cloneNode does not preserve a select's live selectedness. Copy the
      // current controls, not just their initial HTML attributes.
      if (original.matches('select')) [...field.options].forEach((option, i) => { option.selected = Boolean(original.options[i]?.selected); });
      else if (original.type === 'checkbox') field.checked = original.checked;
      else field.value = original.value;
      if (source.id === 'abilityScoreSection' && original.classList.contains('ability-select')) {
        field.hidden = true;
        return;
      }
      field.disabled = true;
      field.readOnly = true;
      field.tabIndex = -1;
      field.setAttribute('aria-readonly', 'true');
      const editable = editableId.has(original.id) || /^death(?:Success|Failure)\d+$/.test(original.id) || original.classList.contains('loadout-worn');
      if (editable) {
        field.disabled = false;
        field.readOnly = false;
        field.removeAttribute('aria-readonly');
        field.dataset.overviewControl = original.id;
      }
      return;
    }
    const output = document.createElement('span');
    output.className = 'overview-value';
    if (original.matches('textarea')) {
      output.classList.add('overview-prose');
      if (original.id === 'backstoryMarkdown' || /^adventureNotes/.test(original.id)) {
        output.innerHTML = storyMarkdown(original.value || '—');
        output.classList.add('markdown-preview');
      } else output.textContent = original.value || '—';
    } else if (original.type === 'checkbox') {
      output.textContent = original.checked ? '☑' : '☐';
      output.setAttribute('aria-label', (original.getAttribute('aria-label') || '') + ' ' + (original.checked ? t().yes : t().no));
    } else if (original.matches('select')) {
      output.textContent = original.value ? [...original.selectedOptions].map(option => option.textContent).join('、') : '—';
    } else output.textContent = original.value || '—';
    if (original.hidden && !original.matches('textarea')) output.hidden = true;
    field.replaceWith(output);
  });
  copy.querySelectorAll('#inspirationButton').forEach(button => {
    if (source.id === 'adventureSection') {
      button.dataset.overviewInspiration = 'true';
      return;
    }
    const value = document.createElement('span'); value.textContent = button.textContent; button.replaceWith(value);
  });
  const readonlyRemovals = [...copy.querySelectorAll('.portrait-tools, .advanced-abilities, .calculation-actions, .dice-tool, #creationGuide, #skillConflictWarning, .backstory-toolbar, #backstoryPreview, [id^="adventurePreview"], .mobile-table-add, .attack-action-cell, button:not(#inspirationButton), .hidden, [hidden]')];
  if (!preserveControls) readonlyRemovals.push(...copy.querySelectorAll('input, select, textarea'));
  readonlyRemovals.forEach(node => node.remove());
  copy.classList.remove('is-collapsed');
  copy.querySelectorAll('.is-collapsed').forEach(node => node.classList.remove('is-collapsed'));
  [copy, ...copy.querySelectorAll('*')].forEach(node => {
    for (const attr of [...node.attributes]) {
      if (/^(id|for|name|tabindex|contenteditable|role|aria-controls|aria-labelledby|aria-live)$/.test(attr.name) || attr.name.startsWith('data-') && !['data-label', 'data-overview-control', 'data-overview-inspiration'].includes(attr.name) || attr.name.startsWith('on')) node.removeAttribute(attr.name);
    }
  });
  [copy, ...copy.querySelectorAll('.sheet-section')].forEach((section, index) => {
    const title = section.querySelector(':scope > .section-title, :scope > .spell-heading > .section-title');
    if (!title) return;
    const key = source.id + ':' + index;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'section-collapse';
    const update = collapsed => {
      section.classList.toggle('is-collapsed', collapsed);
      button.setAttribute('aria-expanded', String(!collapsed));
      button.setAttribute('aria-label', (collapsed ? t().expandSection : t().collapseSection) + ': ' + title.textContent.replace(/[+−]$/, '').trim());
      button.textContent = collapsed ? '+' : '−';
    };
    update(overviewCollapsedSections.get(key) === true);
    button.addEventListener('click', event => {
      event.stopPropagation();
      const collapsed = !section.classList.contains('is-collapsed');
      overviewCollapsedSections.set(key, collapsed);
      update(collapsed);
    });
    title.append(button);
  });
  copy.querySelectorAll('[data-overview-control]').forEach(field => {
    const sync = event => {
      const original = document.getElementById(field.dataset.overviewControl);
      if (!original) return;
      if (original.type === 'checkbox') original.checked = field.checked;
      else original.value = field.value;
      original.dispatchEvent(new Event(event.type === 'input' ? 'input' : 'change', { bubbles: true }));
    };
    field.addEventListener('input', sync);
    field.addEventListener('change', sync);
  });
  copy.querySelectorAll('[data-overview-inspiration]').forEach(button => {
    button.addEventListener('click', () => {
      const original = document.getElementById('inspiration');
      original.value = original.value === 'yes' ? 'no' : 'yes';
      syncInspiration();
      button.textContent = document.getElementById('inspirationButton').textContent;
      button.setAttribute('aria-pressed', document.getElementById('inspirationButton').getAttribute('aria-pressed'));
      scheduleSave();
    });
  });
  return copy;
};
const renderFullSheet = () => {
  const container = document.getElementById('fullSheetContent');
  if (!container) return;
  const fragment = document.createDocumentFragment();
  const hint = document.createElement('p'); hint.className = 'subtle'; hint.textContent = t().overviewHint; fragment.append(hint);
  const parts = [
    ['workflowIdentity', ['portraitSection', 'identitySection', 'backgroundSection']],
    ['workflowScores', ['abilityScoreSection']],
    ['workflowFeatures', ['proficiencySection', 'skillsSection', 'characterAbilitySection']],
    ['workflowAdventure', ['adventureSection', 'equipmentSection', 'attackSection', 'spellSection']],
    ['workflowRecords', ['storySection', 'backstorySection']]
  ];
  parts.forEach(([target, sections]) => {
    const heading = document.createElement('div'); heading.className = 'overview-heading';
    const title = document.createElement('h2'); title.textContent = t()[target];
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'button'; edit.textContent = t().overviewEdit;
    edit.addEventListener('click', () => { switchWorkflowView(target); document.getElementById(target + 'Tab').focus(); });
    heading.append(title, edit); fragment.append(heading);
    sections.forEach(id => {
      const source = document.getElementById(id);
      const section = source && readonlySection(source);
      if (section) fragment.append(section);
    });
  });
  container.replaceChildren(fragment);
};
let overviewTimer;
const scheduleOverview = () => {
  const view = document.getElementById('workflowOverviewView');
  if (!view || view.hidden) return;
  clearTimeout(overviewTimer);
  overviewTimer = setTimeout(renderFullSheet, 80);
};
// Async spell/catalog loading and config imports also refresh the visible card.
new MutationObserver(records => {
  if (records.some(record => !record.target.closest?.('#workflowOverviewView'))) scheduleOverview();
}).observe(document.getElementById('characterSheet'), { subtree: true, childList: true, characterData: true, attributes: true });
document.addEventListener('change', scheduleOverview);
document.getElementById('languageButton').addEventListener('click', scheduleOverview);
