import { readCatalog, catalog } from './helpers/spell-catalog.mjs';
import { writeSpellbookOperation } from '../shared/spellbook-transport.js';
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { after, before, beforeEach } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import {
  arrayUnion,
  arrayRemove,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import {
  deleteObject,
  getBytes,
  listAll,
  ref as storageRef,
  uploadString
} from "firebase/storage";

const PROJECT_ID = "demo-rugatha";
let environment;

const migratedMember = (uid, memberNoNumber = 1) => {
  const digits = String(memberNoNumber).padStart(8, "0");
  return ({
  schemaVersion: 1,
  memberId: uid,
  memberNo: `${digits.slice(0, 4)}-${digits.slice(4)}`,
  memberNoNumber,
  displayName: "Member",
  email: `${uid}@example.test`,
  profile: { photo: null },
  badges: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
  achievements: {},
  rewardedAchievements: {},
  qaChoiceCount: 0,
  totalTimeSeconds: 0,
  campaign: "",
  character: "",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  lastLoginAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  migration: { source: "rtdb", runId: "test", sourceHash: "a".repeat(64) }
  });
};

const newMember = (uid, number) => ({
  schemaVersion: 1,
  memberId: uid,
  memberNo: `${String(number).padStart(8, "0").slice(0, 4)}-${String(number).padStart(8, "0").slice(4)}`,
  memberNoNumber: number,
  displayName: "New Member",
  email: `${uid}@example.test`,
  profile: { photo: null },
  badges: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
  achievements: {},
  rewardedAchievements: {},
  qaChoiceCount: 0,
  totalTimeSeconds: 0,
  campaign: "",
  character: "",
  createdAt: serverTimestamp(),
  lastLoginAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync("config/firebase/firestore.rules", "utf8") },
    storage: { rules: readFileSync("config/firebase/storage.rules", "utf8") }
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.clearStorage();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "memberKeys/owner"), { memberNo: "0000-0001" });
    await setDoc(doc(db, "memberKeys/other"), { memberNo: "0000-0002" });
    await setDoc(doc(db, "members/0000-0001"), migratedMember("owner", 1));
    await setDoc(doc(db, "members/0000-0002"), migratedMember("other", 2));
    await setDoc(doc(db, "system/memberNumbers"), {
      lastAllocated: 2,
      updatedAt: new Date("2026-01-01T00:00:00Z")
    });
    await setDoc(doc(db, "qaStats/npc%2Fone%2Ehtml"), {
      questionPage: "npc/one.html",
      c1: 0,
      c2: 0,
      total: 0,
      updatedAt: new Date("2026-01-01T00:00:00Z")
    });
  });
});

after(async () => {
  await environment.cleanup();
});

test("member documents are private to their owner and admin", async () => {
  const ownerDb = environment.authenticatedContext("owner", {
    email: "owner@example.test"
  }).firestore();
  const otherDb = environment.authenticatedContext("other", {
    email: "other@example.test"
  }).firestore();
  const adminDb = environment.authenticatedContext("admin", {
    email: "admin@example.test",
    admin: true
  }).firestore();
  const publicDb = environment.unauthenticatedContext().firestore();

  await assertSucceeds(getDoc(doc(ownerDb, "members/0000-0001")));
  await assertFails(getDoc(doc(otherDb, "members/0000-0001")));
  await assertFails(getDoc(doc(publicDb, "members/0000-0001")));
  const snapshot = await assertSucceeds(getDocs(query(collection(adminDb, "members"))));
  assert.equal(snapshot.size, 2);
});

test("the verified Rugatha admin email may browse member documents without a custom claim", async () => {
  const adminDb = environment.authenticatedContext("rugatha-admin", {
    email: "rugathadnd@gmail.com",
    email_verified: true
  }).firestore();
  const unverifiedDb = environment.authenticatedContext("unverified-admin", {
    email: "rugathadnd@gmail.com",
    email_verified: false
  }).firestore();

  const snapshot = await assertSucceeds(getDocs(query(collection(adminDb, "members"))));
  assert.equal(snapshot.size, 2);
  await assertFails(getDocs(query(collection(unverifiedDb, "members"))));
});

test("owner may edit profile but cannot change member number", async () => {
  const db = environment.authenticatedContext("owner", {
    email: "owner@example.test"
  }).firestore();
  await assertSucceeds(updateDoc(doc(db, "members/0000-0001"), {
    "profile.title": "Updated",
    updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(db, "members/0000-0001"), {
    memberNoNumber: 999,
    updatedAt: serverTimestamp()
  }));
});

test("migrated admin may record first Firestore login timestamp", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const admin = migratedMember("admin", 0);
    admin.memberNo = "0000-0000";
    admin.email = "rugathadnd@gmail.com";
    delete admin.updatedAt;
    await setDoc(doc(db, "memberKeys/admin"), { memberNo: "0000-0000" });
    await setDoc(doc(db, "members/0000-0000"), admin);
  });
  const db = environment.authenticatedContext("admin", {
    email: "rugathadnd@gmail.com",
    admin: true
  }).firestore();
  await assertSucceeds(getDoc(doc(db, "members/0000-0000")));
  await assertSucceeds(updateDoc(doc(db, "members/0000-0000"), {
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
});

test("new member allocation must atomically advance the counter", async () => {
  const uid = "new-user";
  const db = environment.authenticatedContext(uid, {
    email: `${uid}@example.test`
  }).firestore();
  await assertSucceeds(runTransaction(db, async (transaction) => {
    const counterRef = doc(db, "system/memberNumbers");
    const memberRef = doc(db, "members/0000-0003");
    const snapshot = await transaction.get(counterRef);
    const next = snapshot.data().lastAllocated + 1;
    transaction.update(counterRef, { lastAllocated: next, updatedAt: serverTimestamp() });
    transaction.set(doc(db, "memberKeys", uid), { memberNo: "0000-0003" });
    transaction.set(memberRef, newMember(uid, next));
  }));

  const attackerDb = environment.authenticatedContext("attacker", {
    email: "attacker@example.test"
  }).firestore();
  await assertFails(setDoc(doc(attackerDb, "members/attacker"), newMember("attacker", 50)));
});

test("member key mappings cannot be forged or reassigned", async () => {
  const db = environment.authenticatedContext('owner', { email: 'owner@example.test' }).firestore();
  await assertSucceeds(getDoc(doc(db, 'memberKeys/owner')));
  await assertFails(getDoc(doc(db, 'memberKeys/other')));
  await assertFails(updateDoc(doc(db, 'memberKeys/owner'), { memberNo: '0000-0002' }));
  await assertFails(deleteDoc(doc(db, 'memberKeys/owner')));
  await assertFails(setDoc(doc(db, 'members/owner'), newMember('owner', 3)));
  const attacker = environment.authenticatedContext('attacker', { email: 'attacker@example.test' }).firestore();
  await assertFails(setDoc(doc(attacker, 'memberKeys/attacker'), { memberNo: '0000-0001' }));
});

test("bookmarks are owner-only", async () => {
  const ownerDb = environment.authenticatedContext("owner", {
    email: "owner@example.test"
  }).firestore();
  const otherDb = environment.authenticatedContext("other", {
    email: "other@example.test"
  }).firestore();
  const path = "members/0000-0001/bookmarks/cGFnZQ";
  await assertSucceeds(setDoc(doc(ownerDb, path), {
    path: "page",
    title: "Page",
    savedAt: serverTimestamp()
  }));
  await assertFails(getDoc(doc(otherDb, path)));
});

test("character sheets are private, owner-writable records", async () => {
  const ownerDb = environment.authenticatedContext("owner", {
    email: "owner@example.test"
  }).firestore();
  const otherDb = environment.authenticatedContext("other", {
    email: "other@example.test"
  }).firestore();
  const adminDb = environment.authenticatedContext("admin", {
    email: "admin@example.test",
    admin: true
  }).firestore();
  const characterPath = "members/0000-0001/characters/Ada%20Stone";
  const character = {
    schemaVersion: 1,
    memberId: "owner",
    characterName: "Ada Stone",
    className: "wizard",
    race: "human",
    data: { characterName: "Ada Stone", class1: "wizard", notes: "Private notes" },
    portrait: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await assertSucceeds(setDoc(doc(ownerDb, characterPath), character));
  await assertSucceeds(getDoc(doc(ownerDb, characterPath)));
  await assertSucceeds(getDoc(doc(adminDb, characterPath)));
  await assertFails(getDoc(doc(otherDb, characterPath)));
  await assertFails(setDoc(doc(otherDb, "members/0000-0001/characters/Forged"), {
    ...character,
    characterName: "Forged"
  }));
  await assertFails(setDoc(doc(adminDb, "members/0000-0002/characters/Admin%20Made"), {
    ...character,
    memberId: "other",
    characterName: "Admin Made"
  }));
  await assertSucceeds(updateDoc(doc(ownerDb, characterPath), {
    data: { ...character.data, notes: "Updated notes" },
    updatedAt: serverTimestamp()
  }));
  await assertSucceeds(updateDoc(doc(ownerDb, characterPath), {
    portrait: {
      path: "character-portraits/owner/QWRhIFN0b25l/portrait-1780000000000.webp",
      contentType: "image/webp",
      size: 12345,
      updatedAt: serverTimestamp()
    },
    updatedAt: serverTimestamp()
  }));
  await assertSucceeds(deleteDoc(doc(ownerDb, characterPath)));
});

test("QA choice and anonymous stats must be updated together once", async () => {
  const db = environment.authenticatedContext("owner", {
    email: "owner@example.test"
  }).firestore();
  const pageKey = "npc%2Fone%2Ehtml";
  const choiceRef = doc(db, `members/0000-0001/qaChoices/${pageKey}`);
  const statsRef = doc(db, `qaStats/${pageKey}`);

  await assertSucceeds(runTransaction(db, async (transaction) => {
    const stats = await transaction.get(statsRef);
    transaction.set(choiceRef, {
      questionPage: "npc/one.html",
      choice: "C1",
      createdAt: serverTimestamp()
    });
    transaction.update(statsRef, {
      c1: stats.data().c1 + 1,
      c2: stats.data().c2,
      total: stats.data().total + 1,
      updatedAt: serverTimestamp()
    });
  }));

  await assertFails(updateDoc(statsRef, {
    c1: increment(1),
    total: increment(1),
    updatedAt: serverTimestamp()
  }));
  const publicDb = environment.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(publicDb, `qaStats/${pageKey}`)));
});

test("first QA choice may atomically create its anonymous stats", async () => {
  const db = environment.authenticatedContext("owner", {
    email: "owner@example.test"
  }).firestore();
  const pageKey = "npc%2Fnew%2Ehtml";
  const choiceRef = doc(db, `members/0000-0001/qaChoices/${pageKey}`);
  const statsRef = doc(db, `qaStats/${pageKey}`);

  await assertSucceeds(runTransaction(db, async (transaction) => {
    transaction.set(choiceRef, {
      questionPage: "npc/new.html",
      choice: "C2",
      createdAt: serverTimestamp()
    });
    transaction.set(statsRef, {
      questionPage: "npc/new.html",
      c1: 0,
      c2: 1,
      total: 1,
      updatedAt: serverTimestamp()
    });
  }));
});

test("profile photos are owner-readable, admin-readable, and image-only", async () => {
  const ownerStorage = environment.authenticatedContext("owner", {
    email: "owner@example.test"
  }).storage();
  const otherStorage = environment.authenticatedContext("other", {
    email: "other@example.test"
  }).storage();
  const adminStorage = environment.authenticatedContext("admin", {
    admin: true
  }).storage();
  const avatar = storageRef(ownerStorage, "profile-photos/owner/avatar.webp");

  await assertSucceeds(uploadString(avatar, "image", "raw", { contentType: "image/webp" }));
  await assertFails(getBytes(storageRef(otherStorage, "profile-photos/owner/avatar.webp")));
  await assertSucceeds(getBytes(storageRef(adminStorage, "profile-photos/owner/avatar.webp")));
  await assertFails(uploadString(
    storageRef(ownerStorage, "profile-photos/owner/avatar.png"),
    "not an image",
    "raw",
    { contentType: "text/plain" }
  ));
});

test("character portraits are owner-writable and private", async () => {
  const ownerStorage = environment.authenticatedContext("owner", {
    email: "owner@example.test"
  }).storage();
  const otherStorage = environment.authenticatedContext("other", {
    email: "other@example.test"
  }).storage();
  const adminStorage = environment.authenticatedContext("admin", {
    admin: true
  }).storage();
  const portraitPath = "character-portraits/owner/QWRhIFN0b25l/portrait.webp";
  const portrait = storageRef(ownerStorage, portraitPath);

  await assertSucceeds(uploadString(portrait, "image", "raw", { contentType: "image/webp" }));
  await assertSucceeds(getBytes(portrait));
  await assertSucceeds(getBytes(storageRef(adminStorage, portraitPath)));
  await assertFails(getBytes(storageRef(otherStorage, portraitPath)));
  const adminPortrait = storageRef(
    adminStorage,
    "character-portraits/other/QWRtaW4/portrait.webp"
  );
  await assertFails(uploadString(adminPortrait, "image", "raw", { contentType: "image/webp" }));
  await assertFails(uploadString(
    storageRef(ownerStorage, "character-portraits/owner/QWRhIFN0b25l/portrait.png"),
    "not an image",
    "raw",
    { contentType: "text/plain" }
  ));
  await assertSucceeds(uploadString(
    storageRef(ownerStorage, "character-portraits/owner/QWRhIFN0b25l/portrait-1780000000000.webp"),
    "optimized image",
    "raw",
    { contentType: "image/webp" }
  ));
  const emailAdminStorage = environment.authenticatedContext("rugatha-admin", {
    email: "rugathadnd@gmail.com",
    email_verified: true
  }).storage();
  await assertSucceeds(getBytes(storageRef(emailAdminStorage, portraitPath)));
  await assertFails(deleteObject(storageRef(otherStorage, portraitPath)));
  await assertFails(deleteObject(storageRef(adminStorage, portraitPath)));
  await assertSucceeds(deleteObject(portrait));
});

const chapterPath = 'chapterAccess/plus-c08/pages/temp';
const credentialHash = 'a'.repeat(64);
const credentialGrant = (characterId = 'midori', passwordHash = credentialHash) => ({
  characterId, passwordHash, verifiedAt: serverTimestamp()
});
async function seedAdventureAccess(lock = 1) {
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), chapterPath), {
      chapterKey: 'plus-c08/temp',
      lock,
      passwordHashes: { midori: credentialHash, ron: 'b'.repeat(64) },
      questions: { crossroads: { allowedCharacters: ['midori', 'samael'] } }
    });
  });
}
const adventureAnswer = (uid, characterId = 'midori', option = 1, customText = '') => ({
  uid, characterId, option, customText, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
});

test('chapter passwords remain private; only a matching role credential creates a grant', async () => {
  await seedAdventureAccess();
  const db = environment.authenticatedContext('player').firestore();
  await assertFails(getDoc(doc(db, chapterPath)));
  await assertFails(setDoc(doc(db, `${chapterPath}/grants/player`), credentialGrant('midori', 'wrong')));
  await assertFails(setDoc(doc(db, `${chapterPath}/grants/other`), credentialGrant()));
  await assertSucceeds(setDoc(doc(db, `${chapterPath}/grants/player`), credentialGrant()));
  await assertFails(setDoc(doc(environment.unauthenticatedContext().firestore(), `${chapterPath}/grants/player`), credentialGrant()));
});

test('role credentials constrain answers, option validation and group membership', async () => {
  await seedAdventureAccess();
  const db = environment.authenticatedContext('player').firestore();
  const path = `${chapterPath}/questions/crossroads/answers`;
  await assertFails(setDoc(doc(db, path, 'midori'), adventureAnswer('player')));
  await setDoc(doc(db, `${chapterPath}/grants/player`), credentialGrant());
  await assertFails(setDoc(doc(db, path, 'samael'), adventureAnswer('player', 'samael')));
  await assertFails(setDoc(doc(db, path, 'midori'), adventureAnswer('player', 'midori', 6)));
  await assertFails(setDoc(doc(db, path, 'midori'), adventureAnswer('player', 'midori', 5)));
  await assertSucceeds(setDoc(doc(db, path, 'midori'), adventureAnswer('player', 'midori', 5, '第一行\n <script>文字</script>\n 第二行')));
  await assertSucceeds(updateDoc(doc(db, path, 'midori'), { option: 2, customText: '', updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db, path, 'midori'), { createdAt: new Date(0), updatedAt: serverTimestamp() }));
  await setDoc(doc(db, `${chapterPath}/grants/player`), credentialGrant('ron', 'b'.repeat(64)));
  await assertFails(setDoc(doc(db, path, 'ron'), adventureAnswer('player', 'ron')));
});

test('lock controls publication; locked chapters hide other roles even after password verification', async () => {
  await seedAdventureAccess(1);
  const db = environment.authenticatedContext('player').firestore();
  const guest = environment.unauthenticatedContext().firestore();
  const path = `${chapterPath}/questions/crossroads/answers`;
  await setDoc(doc(db, `${chapterPath}/grants/player`), credentialGrant());
  await setDoc(doc(db, path, 'midori'), adventureAnswer('player'));
  await assertSucceeds(getDoc(doc(db, path, 'midori')));
  await assertFails(getDoc(doc(db, path, 'samael')));
  await assertFails(getDocs(collection(db, path)));
  await assertFails(getDocs(collection(guest, path)));
  await seedAdventureAccess(0);
  await assertSucceeds(getDocs(collection(db, path)));
  await assertSucceeds(getDocs(collection(guest, path)));
  await assertSucceeds(getDoc(doc(guest, path, 'midori')));
  await environment.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), chapterPath), { lock: 1, 'passwordHashes.midori': 'c'.repeat(64) });
  });
  await assertFails(getDoc(doc(db, path, 'midori')));
  await assertFails(updateDoc(doc(db, path, 'midori'), { option: 3, updatedAt: serverTimestamp() }));
});

test('roles can revise published answers; lock changes visibility without blocking credentialed voting', async () => {
  await seedAdventureAccess(1);
  const path = `${chapterPath}/questions/crossroads/answers`;
  const guest = environment.unauthenticatedContext().firestore();
  const anonymous = environment.authenticatedContext('anonymous', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  await assertFails(setDoc(doc(anonymous, path, 'midori'), adventureAnswer('anonymous')));
  await setDoc(doc(anonymous, `${chapterPath}/grants/anonymous`), credentialGrant());
  await assertSucceeds(setDoc(doc(anonymous, path, 'midori'), adventureAnswer('anonymous')));
  await environment.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), chapterPath), { lock: 0 });
  });
  await assertSucceeds(getDocs(collection(guest, path)));
  await assertSucceeds(updateDoc(doc(anonymous, path, 'midori'), { option: 2, updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(anonymous, path, 'midori'), { option: 5, customText: '新的答案\n保留換行', updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(guest, path, 'samael'), adventureAnswer('guest', 'samael')));
  await assertFails(setDoc(doc(anonymous, path, 'samael'), adventureAnswer('anonymous', 'samael')));
  await environment.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), chapterPath), { lock: 1 });
  });
  await assertFails(getDocs(collection(guest, path)));
  await assertFails(getDocs(collection(anonymous, path)));
  await assertSucceeds(updateDoc(doc(anonymous, path, 'midori'), { option: 2, customText: '', updatedAt: serverTimestamp() }));
});

const spellbook = (spellIds = ['Aid']) => ({ schemaVersion: 1, spellIds,
  createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
const spellbookPath = 'members/0000-0001/spellbooks/default';

test('spellbooks: owner can create, read, update and clear but never delete', async () => {
  const db = environment.authenticatedContext('owner').firestore();
  const ref = doc(db, spellbookPath);
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(setDoc(ref, spellbook()));
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(updateDoc(ref, { spellIds: ['Fireball'], updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(ref, { spellIds: [], updatedAt: serverTimestamp() }));
  assert.deepEqual((await getDoc(ref)).data().spellIds, []);
  await assertFails(deleteDoc(ref));
});

test('spellbooks: deny anonymous, other members, admins, listing and UID path bypass', async () => {
  const owner = environment.authenticatedContext('owner').firestore();
  await setDoc(doc(owner, spellbookPath), spellbook());
  for (const context of [environment.unauthenticatedContext(),
    environment.authenticatedContext('other'), environment.authenticatedContext('admin', { admin: true }),
    environment.authenticatedContext('email-admin', { email: 'rugathadnd@gmail.com', email_verified: true })]) {
    const db = context.firestore();
    await assertFails(getDoc(doc(db, spellbookPath)));
    await assertFails(setDoc(doc(db, spellbookPath), spellbook()));
    await assertFails(updateDoc(doc(db, spellbookPath), { spellIds: [], updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(db, spellbookPath)));
    await assertFails(getDocs(collection(db, 'members/0000-0001/spellbooks')));
  }
  await assertFails(getDocs(collection(owner, 'members/0000-0001/spellbooks')));
  await assertFails(setDoc(doc(owner, 'members/owner/spellbooks/default'), spellbook()));
  await assertFails(setDoc(doc(owner, 'members/0000-0002/spellbooks/default'), spellbook()));
  await assertFails(setDoc(doc(owner, 'members/0000-0001/spellbooks/second'), spellbook()));
});

test('spellbooks: reject extra/missing fields, invalid lists, IDs, versions and timestamps', async () => {
  const db = environment.authenticatedContext('owner').firestore();
  const ref = doc(db, spellbookPath);
  const missing = spellbook(); delete missing.schemaVersion;
  for (const value of [missing, { ...spellbook(), extra: true },
    { ...spellbook(), schemaVersion: 2 }, { ...spellbook(), schemaVersion: '1' },
    spellbook('Aid'), spellbook([42]), spellbook(['Unknown Spell']), spellbook(['Aid', 'Aid']),
    spellbook(Array(501).fill('Aid')), { ...spellbook(), createdAt: new Date(0) },
    { ...spellbook(), updatedAt: new Date(0) }]) {
    await assertFails(setDoc(ref, value));
  }
  await setDoc(ref, spellbook());
  await assertFails(updateDoc(ref, { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { updatedAt: new Date(0) }));
  await assertFails(updateDoc(ref, { spellIds: ['not-a-spell'], updatedAt: serverTimestamp() }));
});

test('public spell catalog: guest reads only reference files; all clients cannot list or write', async () => {
  const paths = Object.values(catalog.files).map(file => file.path);
  await environment.withSecurityRulesDisabled(async context => {
    for (const path of paths) await uploadString(storageRef(context.storage(), path), '{"fixture":true}', 'raw', { contentType: 'application/json' });
  });
  const guest = environment.unauthenticatedContext().storage();
  for (const path of paths) await assertSucceeds(getBytes(storageRef(guest, path)));
  for (const storage of [guest, environment.authenticatedContext('owner').storage(),
    environment.authenticatedContext('admin', { admin: true }).storage()]) {
    await assertFails(listAll(storageRef(storage, `catalogs/spells/${catalog.version}`)));
    await assertFails(uploadString(storageRef(storage, paths[0]), '{}'));
    await assertFails(uploadString(storageRef(storage, 'catalogs/spells/next/spells-phb.json'), '{}'));
    await assertFails(deleteObject(storageRef(storage, paths[0])));
  }
  await assertFails(getBytes(storageRef(guest, `catalogs/spells/${catalog.version}/private.json`)));
  await assertFails(getBytes(storageRef(guest, 'profile-photos/owner/avatar.webp')));
});

test('spellbooks: catalog and Rules whitelist stay aligned', async () => {
  const db = environment.authenticatedContext('owner').firestore();
  const ids = readCatalog('spells').spell.map(spell => spell.name_en);
  assert.equal(new Set(ids).size, ids.length);
  await assertSucceeds(setDoc(doc(db, spellbookPath), spellbook(ids)));
});

const mutateBook = (db, operation, isActive = () => true) => writeSpellbookOperation({
  db, reference: doc(db, spellbookPath), operation, isActive
}, { runTransaction, serverTimestamp, arrayUnion, arrayRemove });

test('spellbooks: concurrent first writes and imports merge without overwriting', async () => {
  const a = environment.authenticatedContext('owner').firestore();
  const b = environment.authenticatedContext('owner').firestore();
  await Promise.all([mutateBook(a, { type: 'add', ids: ['Aid'] }),
    mutateBook(b, { type: 'add', ids: ['Fireball'] })]);
  assert.deepEqual(new Set((await getDoc(doc(a, spellbookPath))).data().spellIds), new Set(['Aid', 'Fireball']));
  await Promise.all([mutateBook(a, { type: 'add', ids: ['Aid', 'Light'] }),
    mutateBook(b, { type: 'add', ids: ['Fireball', 'Light'] })]);
  assert.deepEqual(new Set((await getDoc(doc(a, spellbookPath))).data().spellIds), new Set(['Aid', 'Fireball', 'Light']));
  // Retrying an import does not create duplicates; an empty document stays present.
  await mutateBook(a, { type: 'clear' });
  assert.equal((await getDoc(doc(a, spellbookPath))).exists(), true);
  await mutateBook(a, { type: 'add', ids: ['Aid'] });
  await mutateBook(b, { type: 'add', ids: ['Aid'] });
  assert.deepEqual((await getDoc(doc(a, spellbookPath))).data().spellIds, ['Aid']);
});

test('spellbooks: ordered add/remove and clear/add follow server commit order', async () => {
  const db = environment.authenticatedContext('owner').firestore();
  await mutateBook(db, { type: 'add', ids: ['Aid'] });
  await mutateBook(db, { type: 'remove', ids: ['Aid'] });
  assert.deepEqual((await getDoc(doc(db, spellbookPath))).data().spellIds, []);
  await mutateBook(db, { type: 'add', ids: ['Aid'] });
  await mutateBook(db, { type: 'clear' });
  await mutateBook(db, { type: 'add', ids: ['Light'] });
  assert.deepEqual((await getDoc(doc(db, spellbookPath))).data().spellIds, ['Light']);
});

test('spellbooks: denied reads and cancelled sessions cannot initialize documents', async () => {
  const other = environment.authenticatedContext('other').firestore();
  await assertFails(mutateBook(other, { type: 'add', ids: ['Aid'] }));
  const db = environment.authenticatedContext('owner').firestore();
  await assert.rejects(mutateBook(db, { type: 'add', ids: ['Aid'] }, () => false));
  assert.equal((await getDoc(doc(db, spellbookPath))).exists(), false);
  let checks = 0;
  await assert.rejects(mutateBook(db, { type: 'add', ids: ['Aid'] }, () => ++checks === 1));
  assert.equal((await getDoc(doc(db, spellbookPath))).exists(), false);
});
