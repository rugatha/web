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
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
    storage: { rules: readFileSync("storage.rules", "utf8") }
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.clearStorage();
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "members/owner"), migratedMember("owner", 1));
    await setDoc(doc(db, "members/other"), migratedMember("other", 2));
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

  await assertSucceeds(getDoc(doc(ownerDb, "members/owner")));
  await assertFails(getDoc(doc(otherDb, "members/owner")));
  await assertFails(getDoc(doc(publicDb, "members/owner")));
  const snapshot = await assertSucceeds(getDocs(query(collection(adminDb, "members"))));
  assert.equal(snapshot.size, 2);
});

test("owner may edit profile but cannot change member number", async () => {
  const db = environment.authenticatedContext("owner", {
    email: "owner@example.test"
  }).firestore();
  await assertSucceeds(updateDoc(doc(db, "members/owner"), {
    "profile.title": "Updated",
    updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(db, "members/owner"), {
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
    await setDoc(doc(db, "members/admin"), admin);
  });
  const db = environment.authenticatedContext("admin", {
    email: "rugathadnd@gmail.com",
    admin: true
  }).firestore();
  await assertSucceeds(getDoc(doc(db, "members/admin")));
  await assertSucceeds(updateDoc(doc(db, "members/admin"), {
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
    const memberRef = doc(db, `members/${uid}`);
    const snapshot = await transaction.get(counterRef);
    const next = snapshot.data().lastAllocated + 1;
    transaction.update(counterRef, { lastAllocated: next, updatedAt: serverTimestamp() });
    transaction.set(memberRef, newMember(uid, next));
  }));

  const attackerDb = environment.authenticatedContext("attacker", {
    email: "attacker@example.test"
  }).firestore();
  await assertFails(setDoc(doc(attackerDb, "members/attacker"), newMember("attacker", 50)));
});

test("bookmarks are owner-only", async () => {
  const ownerDb = environment.authenticatedContext("owner", {
    email: "owner@example.test"
  }).firestore();
  const otherDb = environment.authenticatedContext("other", {
    email: "other@example.test"
  }).firestore();
  const path = "members/owner/bookmarks/cGFnZQ";
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
  const characterPath = "members/owner/characters/Ada%20Stone";
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
  await assertFails(setDoc(doc(otherDb, "members/owner/characters/Forged"), {
    ...character,
    characterName: "Forged"
  }));
  await assertFails(setDoc(doc(adminDb, "members/other/characters/Admin%20Made"), {
    ...character,
    memberId: "other",
    characterName: "Admin Made"
  }));
  await assertSucceeds(updateDoc(doc(ownerDb, characterPath), {
    data: { ...character.data, notes: "Updated notes" },
    updatedAt: serverTimestamp()
  }));
  await assertSucceeds(deleteDoc(doc(ownerDb, characterPath)));
});

test("QA choice and anonymous stats must be updated together once", async () => {
  const db = environment.authenticatedContext("owner", {
    email: "owner@example.test"
  }).firestore();
  const pageKey = "npc%2Fone%2Ehtml";
  const choiceRef = doc(db, `members/owner/qaChoices/${pageKey}`);
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
  const choiceRef = doc(db, `members/owner/qaChoices/${pageKey}`);
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
});
