// Versioned public assets. Full catalog payloads live in Firebase Storage, not Git.
(() => {
  const bucket = 'rugatha-87e15.firebasestorage.app';
  const version = '2026-10-18-v1';
  const files = {
    spells: { name: 'spells-phb.json', sha256: '0d1745e0565461a88006fdf68e483c604d471968a051eea61f0ead9a3d0ccd46', bytes: 1155035 },
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
