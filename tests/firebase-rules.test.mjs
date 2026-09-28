import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { after, before, beforeEach } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import {
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
