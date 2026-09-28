import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Authentication and Storage still use UID; only Firestore member paths use memberNo.
export const resolveMemberKey = async (db, uid) => {
  if (!uid) throw new Error("Member UID is required");
  if (/^[0-9]{4}-[0-9]{4}$/.test(uid)) return uid;
  const mapping = await getDoc(doc(db, "memberKeys", uid));
  if (mapping.exists()) {
    const key = mapping.data().memberNo;
    if (!/^[0-9]{4}-[0-9]{4}$/.test(key)) throw new Error("Invalid member number mapping");
    return key;
  }
  // Allows the new client to be deployed before the data migration.
  return uid;
};

export const memberDocument = async (db, uid) => doc(db, "members", await resolveMemberKey(db, uid));
