# NPC signature storage

The 140 NPC signatures are transparent PNGs stored in Firebase Storage. The browser imports the character-to-public-URL mapping from `npc/npc_page/assets/signature-files.js`.

- Bucket: `rugatha-87e15.firebasestorage.app`
- Object: `public-images/signatures/{normalized-character-id}/{sha256}/signature.png`
- Public access: anonymous downloads only; client listing, writes and deletes are denied.
- Caching: `public, max-age=31536000, immutable`
- `published.json`: source filenames, byte counts, SHA-256 hashes, object paths and public URLs.
- `generation-manifest.json`: original generation descriptions and prompts.

The initial migration uses `node scripts/publish-npc-signatures.mjs --publish --retire` while the local `npc/signatures/` inputs exist. It creates cloud objects without overwriting existing generations, verifies metadata and anonymous download hashes for every signature, writes the URL mapping and audit manifests, then removes local inputs only after all checks pass. It stops without retiring local files if any upload or verification fails.

The generation manifest is retained for provenance; PNGs are not committed to Git. All 140 mapped signatures were in use, so no unused PNGs needed removal. To retrieve an original, download its public URL and check its SHA-256 against `published.json`.

Validation: `npm run test:image-rules` checks access rules; `npm run test:image-browser -- --grep 'published signatures'` decodes every published PNG and checks its integration into representative NPC profiles.
