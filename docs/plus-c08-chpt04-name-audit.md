# Rite of Seclusion: translation and continuity audit

Reviewed 2026-11-18 against `plus-c08/chpt04.md`, the previous chapter's author-confirmed spellings, `pc/pc_lib`, and `npc/data/characters.json`.

- The author confirmed the chapter title **Rite of Seclusion** and the name **Tiara** on 2026-11-18.
- Preserve established names: Ron, Tar'Mo, Sean, Bar'Do, Stan, Emmanuel, Roline Hughes, Midori, Samael, Siri, YHWH, Sister Mari, Bishop Robinson, Dr. Chandra, Laxthos, Peak Temple, Macksohn, and the Great Shield Cathedral of Keinra.
- All 75 Chinese paragraphs remain exactly as supplied, including the source's 蒂雅娜／蒂雅納 variants and typographical inconsistencies. All references to this elder use Tiara in English. The English uses female pronouns for Tiara, matching the source's 師姐 and the author's illustration instructions.
- English and Chinese contain five corresponding scenes with paragraph counts 14 / 25 / 8 / 12 / 16. Ron's four fixed choices and custom-answer option live in the choices config, outside the prose.
- Chapter 4 remains locked. Its later events are not added to public PC/NPC biographies or the world timeline in this update. Appearance indexes include the existing catalog entries actually present in the chapter; Tar'Mo, Sean, the abbot and the other monks do not yet have NPC catalog IDs and are not assigned invented IDs.
- Chapter 3 adds three major world-timeline events, updates the five adventurers' bilingual records and HTML fallback text, and updates Beau, Kubao, Iochi Mari and Roline Hughes. Mari's decision remains pending in those chapter-3 summaries; chapter-4 acceptance is not backdated into chapter 3. Tar'Mo's account is attributed to him, rather than presented as independently verified history.
- Chapter-access settings were read back from Firestore: chapter 3 is public (`lock: 0`); chapter 4 is locked (`lock: 1`). All six character hashes and the admin review hash match the preceding chapter. No answer documents were modified.
- Image reading/thumbnail checksum, metadata, CORS and anonymous access were verified; the original was verified through authenticated read-back and denies anonymous access. The final image uses both canonical character references, contains no text, and portrays Elder Tiara as an elderly blonde Caucasian woman in elder's monastic vestments.
