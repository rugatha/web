import test, { before, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { ref, uploadString, getBytes, deleteObject, listAll } from 'firebase/storage';

let environment;
const hash = 'a'.repeat(64);
const path = `public-images/arcs/rugatha-c01-test/${hash}/reading.webp`;
const original = `image-originals/arcs/rugatha-c01-test/${hash}/original.png`;
const signature = `public-images/signatures/sora/${hash}/signature.png`;
before(async () => {
  environment = await initializeTestEnvironment({ projectId: 'demo-rugatha-images', storage: { rules: readFileSync('config/firebase/storage.rules', 'utf8') } });
  await environment.withSecurityRulesDisabled(async context => {
    for (const object of [path, original, signature, signature.replace(hash, 'invalid'), signature.replace('signature.png', 'other.png'), path.replace('/arcs/', '/private/'), path.replace(hash, 'invalid'), 'profile-photos/owner/avatar.png', 'catalogs/spells/test/spells-phb.json']) {
      await uploadString(ref(context.storage(), object), 'test bytes', 'raw', { contentType: 'image/webp' });
    }
  });
});

test('full-resolution original archives are IAM-only, including for signed-in app admins', async () => {
  for (const context of [environment.unauthenticatedContext(), environment.authenticatedContext('owner'), environment.authenticatedContext('admin', { admin: true })]) {
    const storage = context.storage();
    await assertFails(getBytes(ref(storage, original)));
    await assertFails(listAll(ref(storage, 'image-originals')));
    await assertFails(uploadString(ref(storage, original), 'replacement'));
    await assertFails(deleteObject(ref(storage, original)));
  }
});
after(async () => { if (environment) await environment.cleanup(); });

test('signatures allow anonymous reads only at valid immutable paths', async () => {
  const storage = environment.unauthenticatedContext().storage();
  await assertSucceeds(getBytes(ref(storage, signature)));
  await assertFails(getBytes(ref(storage, signature.replace(hash, 'invalid'))));
  await assertFails(getBytes(ref(storage, signature.replace('signature.png', 'other.png'))));
  for (const context of [environment.unauthenticatedContext(), environment.authenticatedContext('admin', { admin: true })]) {
    const storage = context.storage();
    await assertFails(listAll(ref(storage, 'public-images/signatures')));
    await assertFails(uploadString(ref(storage, signature), 'replacement'));
    await assertFails(deleteObject(ref(storage, signature)));
  }
});

test('public variants are anonymous read-only; listing and app-admin writes fail', async () => {
  const storage = environment.unauthenticatedContext().storage();
  await assertSucceeds(getBytes(ref(storage, path)));
  await assertFails(listAll(ref(storage, 'public-images/arcs')));
  await assertFails(uploadString(ref(storage, path), 'replacement'));
  const admin = environment.authenticatedContext('admin', { admin: true }).storage();
  await assertFails(uploadString(ref(admin, path), 'replacement'));
  await assertFails(deleteObject(ref(admin, path)));
});

test('invalid public paths and private profile photos remain inaccessible', async () => {
  const storage = environment.unauthenticatedContext().storage();
  await assertFails(getBytes(ref(storage, path.replace('/arcs/', '/private/'))));
  await assertFails(getBytes(ref(storage, path.replace(hash, 'invalid'))));
  await assertFails(getBytes(ref(storage, 'profile-photos/owner/avatar.png')));
  await assertSucceeds(getBytes(ref(environment.authenticatedContext('owner').storage(), 'profile-photos/owner/avatar.png')));
  await assertSucceeds(getBytes(ref(storage, 'catalogs/spells/test/spells-phb.json')));
});
