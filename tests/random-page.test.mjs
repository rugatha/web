import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../shared/random-page.js', import.meta.url), 'utf8')
  .replace('import.meta.url', '"https://example.test/web/shared/random-page.js"');

for (const member of [false, true]) {
  test(`random navigation resolves the same destinations from ${member ? 'member' : 'home'}`, async () => {
    const requests = [], listeners = new Map(), navigations = [];
    const button = {setAttribute() {}, addEventListener: (name, callback) => listeners.set(name, callback)};
    const context = vm.createContext({
      URL, console,
      document: {
        querySelector: selector => selector === (member ? '[data-random-page]' : '.home-d20') ? button : null,
        querySelectorAll: () => member ? [button] : [],
        addEventListener: (name, callback) => { if (member) listeners.set(name, callback); }
      },
      window: {location: {assign: url => navigations.push(url)}},
      Math: Object.assign(Object.create(Math), {random: () => 0}),
      fetch: async url => {
        requests.push(String(url));
        const file = String(url).split('/web/')[1];
        return {ok: true, json: async () => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))};
      }
    });
    vm.runInContext(source, context);
    await listeners.get('click')({ target: { closest: () => member ? button : null } });
    // Delegation survives replacement of the saved-card DOM.
    if (member) await listeners.get('click')({ target: { closest: () => button } });
    assert.equal(requests.length, 5);
    assert.ok(requests.every(url => url.startsWith('https://example.test/web/') && !url.includes('/member/')));
    assert.equal(navigations.length, member ? 2 : 1);
    assert.match(navigations[0], /^https:\/\/example.test\/web\/campaigns\/pages\/.+\/chpt\d+\.html$/);
  });
}
