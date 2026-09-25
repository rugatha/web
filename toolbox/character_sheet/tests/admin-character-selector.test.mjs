import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('const characterOptionValue =');
const end = html.indexOf('const saveToCloud =', start);
const selectorSource = html.slice(start, end);

class OptionNode {
  constructor(text, value) {
    this.textContent = text;
    this.value = value;
  }
}

class GroupNode {
  constructor() {
    this.label = '';
    this.children = [];
  }

  appendChild(child) {
    this.children.push(child);
  }
}

const selector = {
  children: [],
  value: '',
  replaceChildren(...children) { this.children = children; },
  appendChild(child) { this.children.push(child); },
  add(child) { this.children.push(child); }
};

const context = vm.createContext({
  Option: OptionNode,
  document: {
    createElement: (tag) => {
      assert.equal(tag, 'optgroup');
      return new GroupNode();
    },
    getElementById: (id) => {
      assert.equal(id, 'characterSelector');
      return selector;
    }
  },
  t: () => ({ characterSelectPrompt: 'Choose a saved character sheet', characterEmpty: 'No characters yet' })
});

vm.runInContext(`
  let characterIsAdmin = true;
  let characterItems = [
    { memberId: 'one', memberNo: '0000-0001', memberDisplayName: 'Alice', memberEmail: 'alice@example.test', key: 'Ada', characterName: 'Ada' },
    { memberId: 'one', memberNo: '0000-0001', memberDisplayName: 'Alice', memberEmail: 'alice@example.test', key: 'Bea', characterName: 'Bea' },
    { memberId: 'two', memberNo: '0000-0002', memberDisplayName: 'Bob', memberEmail: 'bob@example.test', key: 'Cid', characterName: 'Cid' }
  ];
  let characterMemberId = 'two';
  let currentCharacterKey = 'Cid';
  let characterStore = null;
  let characterUser = { uid: 'admin' };
  ${selectorSource}
  renderCharacterSelector();
`, context);

assert.equal(selector.children.length, 3);
assert.equal(selector.children[1].label, '0000-0001 | Alice | alice@example.test');
assert.deepEqual(selector.children[1].children.map((item) => item.textContent), ['Ada', 'Bea']);
assert.equal(selector.children[2].label, '0000-0002 | Bob | bob@example.test');
assert.equal(selector.value, 'two::Cid');

console.log('Passed grouped administrator character selector assertions.');
