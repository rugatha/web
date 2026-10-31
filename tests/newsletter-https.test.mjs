import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync('experience/subscribe/require-https.js', 'utf8');
test('public HTTP forms upgrade to HTTPS and preserve route, query and fragment', () => {
  for (const host of ['rugatha.com', 'www.rugatha.com']) {
    for (const route of ['subscribe', 'unsubscribe']) {
      const url = new URL(`http://${host}/experience/${route}/?source=mail#newsletter-form`);
      const redirects = [];
      runInNewContext(script, { URL, location: { protocol: url.protocol, hostname: url.hostname, href: url.href, replace: value => redirects.push(value) } });
      assert.deepEqual(redirects, [`https://${host}/experience/${route}/?source=mail#newsletter-form`]);
    }
  }
});
test('HTTPS and local HTTP preview do not redirect', () => {
  for (const input of ['https://rugatha.com/experience/subscribe/', 'http://localhost:8000/experience/subscribe/', 'http://127.0.0.1:8766/experience/unsubscribe/']) {
    const url = new URL(input);
    runInNewContext(script, { URL, location: { protocol: url.protocol, hostname: url.hostname, href: url.href, replace: () => assert.fail('Unexpected redirect') } });
  }
});
test('both forms load the upgrade script before Firebase and form modules', () => {
  for (const route of ['subscribe', 'unsubscribe']) {
    const html = readFileSync(`experience/${route}/index.html`, 'utf8');
    const upgrade = html.indexOf('<script src="../subscribe/require-https.js');
    assert.ok(upgrade > 0 && upgrade < html.indexOf('shared/firebase.config.js') && upgrade < html.indexOf('<body'));
  }
});
