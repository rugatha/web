// Versioned public assets. Full catalog payloads live in Firebase Storage, not Git.
(() => {
  const bucket = 'rugatha-87e15.firebasestorage.app';
  const version = '2026-11-22-v2';
  const files = {
    spells: { name: 'spells-phb.json', sha256: 'a92660185398b96b9f0d9d2dff00741c9ac0322a3d1135c68246e24be40ceca8', bytes: 1301570 },
    classes: { name: 'class_spells.json', sha256: 'e1440268ea6d4a3c742a6427873ad720b1f502ba2c45d5b3a21d94f67f580538', bytes: 4975 }
  };
  for (const file of Object.values(files)) {
    file.path = `catalogs/spells/${version}/${file.name}`;
    file.url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(file.path)}?alt=media`;
    Object.freeze(file);
  }
  globalThis.RUGATHA_SPELL_CATALOG = Object.freeze({ bucket, version, files: Object.freeze(files),
    spellsUrl: files.spells.url, classesUrl: files.classes.url });
})();
