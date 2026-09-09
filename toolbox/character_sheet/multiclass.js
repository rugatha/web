/* Stable row IDs keep saved classN/levelN/subclassN fields compatible with v1 sheets. */
const getClassRowIds = () => [...document.querySelectorAll('#classRows > [data-class-row]:not(.hidden)')].map(row => Number(row.dataset.classRow));
const getCharacterClasses = () => getClassRowIds().map(row => ({ row, id: document.getElementById(`class${row}`).value, level: Number(document.getElementById(`level${row}`).value || 0) }));
const characterLevel = () => getCharacterClasses().reduce((sum, row) => sum + row.level, 0);
let pendingSubclassSelections = {};
const classRowTemplate = document.querySelector('#classRows > [data-class-row="2"]').cloneNode(true);
const ensureClassRow = row => {
  let element = document.querySelector(`#classRows > [data-class-row="${row}"]`);
  if (element) return element;
  element = classRowTemplate.cloneNode(true);
  element.dataset.classRow = String(row);
  element.querySelectorAll('[id], [for]').forEach(node => {
    for (const attr of ['id', 'for']) {
      const value = node.getAttribute(attr);
      if (value) node.setAttribute(attr, value === 'removeMulticlassButton' ? `removeClass${row}` : value.replace(/2(?=Other$|$)/, String(row)));
    }
  });
  const label = element.querySelector(`label[for="class${row}"]`);
  label.dataset.i18n = 'class'; label.textContent = t().class;
  element.querySelector('button').dataset.removeClassRow = String(row);
  element.querySelector('button').textContent = t().removeMulticlass;
  document.getElementById('classRows').append(element);
  return element;
};
const syncMulticlassFlag = () => {
  multiclass = getClassRowIds().length > 1;
  document.getElementById('multiclassButton').setAttribute('aria-pressed', String(multiclass));
};
const addClassRow = () => {
  const all = [...document.querySelectorAll('#classRows > [data-class-row]')].map(el => Number(el.dataset.classRow));
  const row = document.querySelector('#classRows > [data-class-row="2"]').classList.contains('hidden') ? 2 : Math.max(...all) + 1;
  ensureClassRow(row).classList.remove('hidden');
  document.getElementById(`level${row}`).value = '1';
  syncMulticlassFlag(); renderOptions();
  return row;
};
const resetClassRows = () => {
  pendingSubclassSelections = {};
  document.querySelectorAll('#classRows > [data-class-row]').forEach(el => {
    const row = Number(el.dataset.classRow);
    if (row > 2) el.remove();
  });
  const second = document.querySelector('#classRows > [data-class-row="2"]');
  second.classList.add('hidden');
  ['class2', 'class2Other', 'subclass2'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('level2').value = '1';
  syncMulticlassFlag();
};
const restoreClassRows = data => {
  resetClassRows();
  // The list preserves blank rows and removals. Old files only have the multiclass flag.
  const ids = Array.isArray(data.classRowIds) ? [...new Set(data.classRowIds.filter(id => Number.isSafeInteger(id) && id > 1))] : data.multiclass === true ? [2] : [];
  ids.forEach(row => ensureClassRow(row).classList.remove('hidden'));
  syncMulticlassFlag();
  // Populate options BEFORE assigning restored select values, including subclasses.
  getClassRowIds().forEach(row => {
    addOptions(document.getElementById(`class${row}`), window.sheetOptions?.classes || []);
    document.getElementById(`class${row}`).value = data[`class${row}`] || '';
    const level = document.getElementById(`level${row}`);
    level.innerHTML = Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
    level.value = data[`level${row}`] || '1';
    pendingSubclassSelections[row] = data[`subclass${row}`] || '';
    renderSubclassOptions(row);
  });
};
const removeClassRow = row => {
  if (row <= 1 || !getClassRowIds().includes(row)) return;
  delete pendingSubclassSelections[row];
  if (row === 2) {
    document.querySelector('#classRows > [data-class-row="2"]').classList.add('hidden');
    ['class2', 'class2Other', 'subclass2'].forEach(id => document.getElementById(id).value = '');
  } else document.querySelector(`#classRows > [data-class-row="${row}"]`).remove();
  syncMulticlassFlag(); renderOptions(); renderCharacterAbilities(); renderProficiencyPills(); updateLevels(); updateSaves(); updateAllAttacks(); updateSpellSummary(); renderRacialSpells(); save();
};
document.addEventListener('click', event => {
  const remove = event.target.closest('[data-remove-class-row]');
  if (remove) removeClassRow(Number(remove.dataset.removeClassRow));
});
