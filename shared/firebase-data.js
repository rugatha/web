import * as realtime from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  runTransaction as runFirestoreTransaction,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  getBytes,
  getStorage,
  ref as storageRef,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

const FIRESTORE = "firestore";
const PROFILE_FIELDS = ["title", "religion", "species", "className", "kingdom"];
const BADGE_FIELDS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const MAX_AVATAR_EDGE = 512;

export const getDataBackend = () => {
  const configured =
    window.RUGATHA_DATA_BACKEND || window.RUGATHA_FEATURE_FLAGS?.dataBackend || "rtdb";
  return configured === FIRESTORE ? FIRESTORE : "rtdb";
};

export const isFirestoreBackend = () => getDataBackend() === FIRESTORE;

export const areDataWritesEnabled = () =>
  window.RUGATHA_FEATURE_FLAGS?.dataWritesEnabled !== false;

const assertWritesEnabled = () => {
  if (!areDataWritesEnabled()) throw new Error("Data writes are temporarily paused for maintenance");
};

export const getDatabase = (app) =>
  isFirestoreBackend() ? getFirestore(app) : realtime.getDatabase(app);

const firestoreRef = (db, path) => ({
  __rugathaFirestoreRef: true,
  db,
  path: String(path || "").replace(/^\/+|\/+$/g, "")
});

const isFirestoreRef = (value) => Boolean(value?.__rugathaFirestoreRef);

export const ref = (db, path) =>
  isFirestoreBackend() ? firestoreRef(db, path) : realtime.ref(db, path);

const toIsoString = (value) => {
  if (!value) return value ?? null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
};

const memberToLegacy = (data = {}) => {
  const profile = data.profile && typeof data.profile === "object" ? data.profile : {};
  const badges = data.badges && typeof data.badges === "object" ? data.badges : {};
  const legacy = {
    ...data,
    ...profile,
    Campaign: data.campaign ?? "",
    Character: data.character ?? "",
    photoUrl: "",
    createdAt: toIsoString(data.createdAt),
    lastLoginAt: toIsoString(data.lastLoginAt),
    updatedAt: toIsoString(data.updatedAt)
  };
  BADGE_FIELDS.forEach((field) => {
    if (badges[field] !== undefined) legacy[`Badge${field}`] = badges[field];
  });
  return legacy;
};

class CompatSnapshot {
  constructor(value, key = null, children = null) {
    this._value = value;
    this.key = key;
    this._children = children;
  }

  exists() {
    return this._value !== undefined && this._value !== null;
  }

  val() {
    return this.exists() ? this._value : null;
  }

  forEach(callback) {
    const entries = this._children || Object.entries(this._value || {});
    for (const [key, value] of entries) {
      if (callback(new CompatSnapshot(value, key)) === true) return true;
    }
    return false;
  }
}

const splitPath = (path) => String(path || "").split("/").filter(Boolean);

const resolveFirestoreTarget = (compatRef) => {
  const parts = splitPath(compatRef.path);
  const db = compatRef.db;
  if (parts[0] === "members" && parts.length === 1) {
    return { kind: "members", target: collection(db, "members") };
  }
  if (parts[0] === "members" && parts.length === 2) {
    return { kind: "member", target: doc(db, "members", parts[1]), uid: parts[1] };
  }
  if (parts[0] === "members" && parts[2] === "bookmarks" && parts.length === 3) {
    return {
      kind: "bookmarks",
      target: collection(db, "members", parts[1], "bookmarks"),
      uid: parts[1]
    };
  }
  if (parts[0] === "members" && parts.length === 3) {
    return {
      kind: "memberField",
      target: doc(db, "members", parts[1]),
      uid: parts[1],
      field: parts[2]
    };
  }
  if (parts[0] === "members" && parts[2] === "bookmarks" && parts.length === 4) {
    return {
      kind: "bookmark",
      target: doc(db, "members", parts[1], "bookmarks", parts[3]),
      uid: parts[1]
    };
  }
  if (parts[0] === "qa_choices" && parts.length === 2) {
    return {
      kind: "qaChoices",
      target: collection(db, "members", parts[1], "qaChoices"),
      uid: parts[1]
    };
  }
  if (parts[0] === "qa_choices" && parts.length === 3) {
    return {
      kind: "qaChoice",
      target: doc(db, "members", parts[1], "qaChoices", parts[2]),
      uid: parts[1]
    };
  }
  if (parts[0] === "qaStats" && parts.length === 2) {
    return { kind: "qaStats", target: doc(db, "qaStats", parts[1]) };
  }
  if (compatRef.path === "members_meta/memberNoCounter") {
    return {
      kind: "counter",
      target: doc(db, "system", "memberNumbers"),
      field: "lastAllocated"
    };
  }
  throw new Error(`Unsupported Firestore compatibility path: ${compatRef.path}`);
};

const convertDocument = (kind, data) => (kind === "member" ? memberToLegacy(data) : data);

const snapshotFromDocument = (snapshot, kind, field = null) => {
  if (!snapshot.exists()) return new CompatSnapshot(null, snapshot.id);
  const data = convertDocument(kind, snapshot.data() || {});
  return new CompatSnapshot(field ? data[field] : data, snapshot.id);
};

const snapshotFromQuery = (snapshot, kind) => {
  const children = snapshot.docs.map((item) => [
    item.id,
    kind === "members" ? memberToLegacy(item.data() || {}) : item.data() || {}
  ]);
  return new CompatSnapshot(
    Object.fromEntries(children),
    null,
    children
  );
};

export const get = async (targetRef) => {
  if (!isFirestoreRef(targetRef)) return realtime.get(targetRef);
  const target = resolveFirestoreTarget(targetRef);
  if (["members", "bookmarks", "qaChoices"].includes(target.kind)) {
    return snapshotFromQuery(await getDocs(target.target), target.kind);
  }
  return snapshotFromDocument(
    await getDoc(target.target),
    target.kind === "memberField" ? "member" : target.kind,
    target.field
  );
};

const normalizeTimestamp = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return serverTimestamp();
};

const memberPatchToFirestore = (patch = {}) => {
  const result = {};
  const direct = [
    "displayName",
    "email",
    "achievements",
    "rewardedAchievements",
    "qaChoiceCount",
    "totalTimeSeconds",
    "campaign",
    "character"
  ];
  direct.forEach((field) => {
    if (patch[field] !== undefined) result[field] = patch[field];
  });
  if (patch.Campaign !== undefined) result.campaign = patch.Campaign;
  if (patch.Character !== undefined) result.character = patch.Character;

  if (patch.profile && typeof patch.profile === "object") {
    result.profile = { ...patch.profile };
    PROFILE_FIELDS.forEach((field) => {
      if (patch[field] !== undefined) result.profile[field] = patch[field];
    });
  } else {
    PROFILE_FIELDS.forEach((field) => {
      if (patch[field] !== undefined) result[`profile.${field}`] = patch[field];
    });
  }

  if (patch.badges && typeof patch.badges === "object") {
    result.badges = { ...patch.badges };
    BADGE_FIELDS.forEach((field) => {
      if (patch[`Badge${field}`] !== undefined) {
        result.badges[field] = Number(patch[`Badge${field}`]);
      }
    });
  } else {
    BADGE_FIELDS.forEach((field) => {
      if (patch[`Badge${field}`] !== undefined) {
        result[`badges.${field}`] = Number(patch[`Badge${field}`]);
      }
    });
  }

  if (patch.lastLoginAt !== undefined) result.lastLoginAt = normalizeTimestamp(patch.lastLoginAt);
  result.updatedAt = serverTimestamp();
  return result;
};

const bookmarkToFirestore = (value = {}) => ({
  path: String(value.path || ""),
  title: String(value.title || ""),
  savedAt: serverTimestamp()
});

export const update = async (targetRef, value) => {
  assertWritesEnabled();
  if (!isFirestoreRef(targetRef)) return realtime.update(targetRef, value);
  const target = resolveFirestoreTarget(targetRef);
  if (target.kind === "member") {
    return updateDoc(target.target, memberPatchToFirestore(value));
  }
  if (target.kind === "bookmark") {
    return setDoc(target.target, bookmarkToFirestore(value), { merge: true });
  }
  throw new Error(`Unsupported Firestore update path: ${targetRef.path}`);
};

export const set = async (targetRef, value) => {
  assertWritesEnabled();
  if (!isFirestoreRef(targetRef)) return realtime.set(targetRef, value);
  const target = resolveFirestoreTarget(targetRef);
  if (target.kind === "bookmark") return setDoc(target.target, bookmarkToFirestore(value));
  if (target.kind === "member") return setDoc(target.target, memberPatchToFirestore(value), { merge: true });
  throw new Error(`Use submitQaChoice for Firestore path: ${targetRef.path}`);
};

export const remove = async (targetRef) => {
  assertWritesEnabled();
  if (!isFirestoreRef(targetRef)) return realtime.remove(targetRef);
  const target = resolveFirestoreTarget(targetRef);
  if (["bookmark", "qaChoice"].includes(target.kind)) return deleteDoc(target.target);
  throw new Error(`Unsupported Firestore delete path: ${targetRef.path}`);
};

export const onValue = (targetRef, onNext, onError) => {
  if (!isFirestoreRef(targetRef)) return realtime.onValue(targetRef, onNext, onError);
  const target = resolveFirestoreTarget(targetRef);
  return onSnapshot(
    target.target,
    (snapshot) => {
      if ("docs" in snapshot) onNext(snapshotFromQuery(snapshot, target.kind));
      else onNext(snapshotFromDocument(snapshot, target.kind, target.field));
    },
    onError
  );
};

export const runTransaction = async (targetRef, updater) => {
  assertWritesEnabled();
  if (!isFirestoreRef(targetRef)) return realtime.runTransaction(targetRef, updater);
  const target = resolveFirestoreTarget(targetRef);
  let resultValue = null;
  let committed = false;
  await runFirestoreTransaction(targetRef.db, async (transaction) => {
    const currentSnapshot = await transaction.get(target.target);
    let current = currentSnapshot.exists() ? currentSnapshot.data() : null;
    if (target.kind === "member") current = current ? memberToLegacy(current) : null;
    if (target.kind === "counter") current = current?.lastAllocated ?? null;
    const next = updater(current);
    if (next === undefined) return;
    if (next === null) {
      if (currentSnapshot.exists()) transaction.delete(target.target);
      committed = true;
      resultValue = null;
      return;
    }
    if (target.kind === "member") {
      const mapped = memberPatchToFirestore(next);
      if (currentSnapshot.exists()) transaction.update(target.target, mapped);
      else transaction.set(target.target, mapped, { merge: true });
    } else if (target.kind === "bookmark") {
      transaction.set(target.target, bookmarkToFirestore(next));
    } else if (target.kind === "counter") {
      transaction.set(target.target, {
        lastAllocated: Number(next),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } else {
      transaction.set(target.target, next);
    }
    committed = true;
    resultValue = next;
  });
  return { committed, snapshot: new CompatSnapshot(resultValue) };
};

const formatMemberNo = (number) => {
  const digits = String(number).padStart(8, "0");
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
};

export const ensureMemberDocument = async (db, user) => {
  if (!isFirestoreBackend() || !db || !user?.uid) return null;
  assertWritesEnabled();
  const memberRef = doc(db, "members", user.uid);
  const counterRef = doc(db, "system", "memberNumbers");
  await runFirestoreTransaction(db, async (transaction) => {
    const existing = await transaction.get(memberRef);
    if (existing.exists()) return;
    const counter = await transaction.get(counterRef);
    if (!counter.exists()) throw new Error("Member number counter is missing");
    const next = Number(counter.data()?.lastAllocated) + 1;
    if (!Number.isSafeInteger(next) || next <= 0) throw new Error("Invalid member number counter");
    transaction.update(counterRef, { lastAllocated: next, updatedAt: serverTimestamp() });
    transaction.set(memberRef, {
      schemaVersion: 1,
      memberId: user.uid,
      memberNo: formatMemberNo(next),
      memberNoNumber: next,
      displayName: user.displayName || "",
      email: user.email || "",
      profile: { photo: null },
      badges: Object.fromEntries(BADGE_FIELDS.map((field) => [field, 10])),
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
  });
  const snapshot = await getDoc(memberRef);
  return snapshot.exists() ? memberToLegacy(snapshot.data()) : null;
};

const encodeQaKey = (value) =>
  String(value || "").replace(/%/g, "%25").replace(/\//g, "%2F").replace(/\./g, "%2E");

export const submitQaChoice = async (db, uid, questionPage, choice) => {
  if (!isFirestoreBackend()) throw new Error("submitQaChoice is Firestore-only");
  assertWritesEnabled();
  if (!uid || !questionPage || !["C1", "C2"].includes(choice)) {
    throw new Error("Invalid QA choice");
  }
  const pageKey = encodeQaKey(questionPage);
  const choiceRef = doc(db, "members", uid, "qaChoices", pageKey);
  const statsRef = doc(db, "qaStats", pageKey);
  let created = false;
  await runFirestoreTransaction(db, async (transaction) => {
    const existingChoice = await transaction.get(choiceRef);
    if (existingChoice.exists()) return;
    const statsSnapshot = await transaction.get(statsRef);
    const stats = statsSnapshot.exists()
      ? statsSnapshot.data()
      : { questionPage, c1: 0, c2: 0, total: 0 };
    transaction.set(choiceRef, {
      questionPage,
      choice,
      createdAt: serverTimestamp()
    });
    transaction.set(statsRef, {
      questionPage,
      c1: Number(stats.c1 || 0) + (choice === "C1" ? 1 : 0),
      c2: Number(stats.c2 || 0) + (choice === "C2" ? 1 : 0),
      total: Number(stats.total || 0) + 1,
      updatedAt: serverTimestamp()
    });
    created = true;
  });
  return created;
};

export const getQaStats = async (db, questionPage) => {
  if (!isFirestoreBackend()) return null;
  const pageKey = encodeQaKey(questionPage);
  const snapshot = await getDoc(doc(db, "qaStats", pageKey));
  return snapshot.exists() ? snapshot.data() : { c1: 0, c2: 0, total: 0 };
};

const canvasToBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Unable to encode profile photo"))),
      "image/webp",
      quality
    );
  });

const prepareAvatar = async (file) => {
  if (!file?.type?.startsWith("image/")) throw new Error("Profile photo must be an image");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_AVATAR_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.88;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > MAX_AVATAR_BYTES && quality > 0.42) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }
  if (blob.size > MAX_AVATAR_BYTES) throw new Error("Profile photo is still larger than 2 MiB");
  return blob;
};

export const uploadProfilePhoto = async (app, db, uid, file) => {
  if (!isFirestoreBackend()) throw new Error("uploadProfilePhoto is Firestore-only");
  assertWritesEnabled();
  const blob = await prepareAvatar(file);
  const path = `profile-photos/${uid}/avatar.webp`;
  await uploadBytes(storageRef(getStorage(app), path), blob, {
    contentType: "image/webp",
    cacheControl: "private,max-age=3600"
  });
  await updateDoc(doc(db, "members", uid), {
    "profile.photo": {
      path,
      contentType: "image/webp",
      size: blob.size,
      updatedAt: serverTimestamp()
    },
    updatedAt: serverTimestamp()
  });
  return URL.createObjectURL(blob);
};

export const loadProfilePhoto = async (app, photo) => {
  if (!isFirestoreBackend() || !photo?.path) return null;
  const bytes = await getBytes(storageRef(getStorage(app), photo.path), MAX_AVATAR_BYTES);
  return URL.createObjectURL(new Blob([bytes], { type: photo.contentType || "image/webp" }));
};
