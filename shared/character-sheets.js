import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  deleteObject,
  getBytes,
  getStorage,
  ref as storageRef,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";
import { optimizeCharacterPortrait } from "./portrait-image.js?v=20260925-portrait-thumb-1";

export const MAX_CHARACTER_NAME_LENGTH = 120;
export const MAX_CHARACTER_PORTRAIT_BYTES = 5 * 1024 * 1024;

const SUPPORTED_PORTRAIT_TYPES = new Map([
  ["image/webp", "webp"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"]
]);

const timestampToIso = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

export const normalizeCharacterName = (value) =>
  String(value || "").normalize("NFC").replace(/\s+/g, " ").trim().slice(0, MAX_CHARACTER_NAME_LENGTH);

export const defaultCharacterName = (date = new Date(), language = "zh") => {
  const parts = new Intl.DateTimeFormat(language === "zh" ? "zh-TW" : "en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date).replace(/\s+/g, " ");
  return `${language === "zh" ? "未命名角色" : "Unnamed Character"} ${parts}`;
};

export const characterKeyForName = (name) => encodeURIComponent(normalizeCharacterName(name));

const storageKeyForCharacterName = (name) => {
  const bytes = new TextEncoder().encode(normalizeCharacterName(name));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const characterNameFromKey = (characterKey) => {
  try {
    return decodeURIComponent(characterKey);
  } catch (error) {
    return characterKey;
  }
};

const assertSignedIn = (user) => {
  if (!user?.uid) throw new Error("Sign in before saving a character sheet");
};

const characterDocRef = (db, uid, characterKey) =>
  doc(db, "members", uid, "characters", characterKey);

export const listCharacterSheets = async (appOrDb, uid) => {
  const db = typeof appOrDb?.type === "string" ? appOrDb : getFirestore(appOrDb);
  const snapshot = await getDocs(collection(db, "members", uid, "characters"));
  return snapshot.docs
    .map((item) => {
      const data = item.data() || {};
      return {
        key: item.id,
        memberId: uid,
        characterName: normalizeCharacterName(data.characterName) || characterNameFromKey(item.id),
        className: String(data.className || ""),
        race: String(data.race || ""),
        createdAt: timestampToIso(data.createdAt),
        updatedAt: timestampToIso(data.updatedAt)
      };
    })
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
};

export const listAllCharacterSheets = async (appOrDb) => {
  const db = typeof appOrDb?.type === "string" ? appOrDb : getFirestore(appOrDb);
  const memberSnapshot = await getDocs(collection(db, "members"));
  const members = memberSnapshot.docs.map((item) => {
    const data = item.data() || {};
    return {
      memberId: item.id,
      memberNo: String(data.memberNo || ""),
      email: String(data.email || ""),
      displayName: String(data.profile?.title || data.displayName || data.email || item.id)
    };
  }).sort((a, b) => {
    const memberNo = (a.memberNo || "9999-9999").localeCompare(b.memberNo || "9999-9999");
    return memberNo || a.displayName.localeCompare(b.displayName, "zh-Hant");
  });
  const lists = await Promise.all(members.map(async (member) => {
    const characters = await listCharacterSheets(db, member.memberId);
    return characters.map((character) => ({
      ...character,
      memberNo: member.memberNo,
      memberEmail: member.email,
      memberDisplayName: member.displayName
    }));
  }));
  return lists.flat();
};

export const loadCharacterSheet = async (appOrDb, uid, characterKey) => {
  const db = typeof appOrDb?.type === "string" ? appOrDb : getFirestore(appOrDb);
  const snapshot = await getDoc(characterDocRef(db, uid, characterKey));
  if (!snapshot.exists()) return null;
  const record = snapshot.data() || {};
  const loadPortrait = async () => {
    if (!record.portrait?.path) return "";
    try {
      const bytes = await getBytes(
        storageRef(getStorage(), record.portrait.path),
        MAX_CHARACTER_PORTRAIT_BYTES
      );
      return URL.createObjectURL(new Blob([bytes], {
        type: record.portrait.contentType || "image/webp"
      }));
    } catch (error) {
      console.warn("Failed to load character portrait", error);
      return "";
    }
  };
  return {
    key: snapshot.id,
    ...record,
    createdAt: timestampToIso(record.createdAt),
    updatedAt: timestampToIso(record.updatedAt),
    portraitUrl: "",
    loadPortrait
  };
};

const blobFromSource = async (source) => {
  if (source instanceof Blob) return source;
  if (typeof source !== "string" || !source) return null;
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Could not read portrait (${response.status})`);
  return response.blob();
};

const validatePortrait = (blob) => {
  if (!blob || !SUPPORTED_PORTRAIT_TYPES.has(blob.type)) {
    throw new Error("Portraits must be PNG, JPEG, or WebP images");
  }
  if (blob.size <= 0 || blob.size > MAX_CHARACTER_PORTRAIT_BYTES) {
    throw new Error("Portraits must be no larger than 5 MB");
  }
};

export const saveCharacterSheet = async ({
  app,
  user,
  currentKey = "",
  characterName,
  sheetData,
  existingPortrait = null,
  portraitAction = "keep",
  portraitSource = null
}) => {
  assertSignedIn(user);
  const uid = user.uid;
  const name = normalizeCharacterName(characterName);
  if (!name) throw new Error("Character name is required");
  const characterKey = characterKeyForName(name);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const destination = characterDocRef(db, uid, characterKey);
  const destinationSnapshot = await getDoc(destination);
  let portrait = existingPortrait || null;
  let uploadedPath = "";
  let uploadedPortraitUrl = "";

  if (portraitAction === "upload") {
    const sourceBlob = await blobFromSource(portraitSource);
    validatePortrait(sourceBlob);
    const blob = await optimizeCharacterPortrait(sourceBlob);
    validatePortrait(blob);
    const extension = SUPPORTED_PORTRAIT_TYPES.get(blob.type);
    const portraitKey = storageKeyForCharacterName(name);
    uploadedPath = `character-portraits/${uid}/${portraitKey}/portrait-${Date.now()}.${extension}`;
    await uploadBytes(storageRef(storage, uploadedPath), blob, {
      contentType: blob.type,
      cacheControl: "private,max-age=31536000,immutable"
    });
    portrait = {
      path: uploadedPath,
      contentType: blob.type,
      size: blob.size,
      updatedAt: serverTimestamp()
    };
    uploadedPortraitUrl = URL.createObjectURL(blob);
  } else if (portraitAction === "remove") {
    portrait = null;
  }

  const cleanData = JSON.parse(JSON.stringify(sheetData || {}));
  delete cleanData.portraitSrc;
  delete cleanData.portraitUrl;

  try {
    await setDoc(destination, {
      schemaVersion: 1,
      memberId: uid,
      characterName: name,
      className: String(cleanData.class1Other || cleanData.class1 || "").slice(0, 120),
      race: String(cleanData.raceOther || cleanData.race || "").slice(0, 120),
      data: cleanData,
      portrait,
      createdAt: destinationSnapshot.exists()
        ? destinationSnapshot.data().createdAt
        : serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    if (uploadedPath && uploadedPath !== existingPortrait?.path) {
      deleteObject(storageRef(storage, uploadedPath)).catch(() => {});
    }
    throw error;
  }

  if (currentKey && currentKey !== characterKey) {
    await deleteDoc(characterDocRef(db, uid, currentKey));
  }

  if (
    existingPortrait?.path &&
    existingPortrait.path !== portrait?.path &&
    (portraitAction === "upload" || portraitAction === "remove")
  ) {
    deleteObject(storageRef(storage, existingPortrait.path)).catch((error) => {
      if (error?.code !== "storage/object-not-found") {
        console.warn("Failed to remove the previous character portrait", error);
      }
    });
  }

  return {
    key: characterKey,
    characterName: name,
    portrait: portrait ? { ...portrait, updatedAt: new Date() } : null,
    portraitUrl: uploadedPortraitUrl
  };
};
