# Plus c08 chapter 5 content review

Reviewed 2026-11-25 against the author's `chpt05.md`, chapters 1–4, `pc/pc_lib`, and the NPC catalog.

- Title: 心眼 / The Mind's Eye. Five scenes, 87 paragraphs, matching Chinese/English paragraph counts (23, 17, 9, 18, 20). Dates: 15051.05.19–15051.05.21.
- Existing spellings: Beau, Midori, Samael, Siri, YHWH, Ron, Sister Mari, Roline Hughes, Sean, Tar'Mo, Tiara, Bishop Robinson, Dr. Chandra Pyresong, Dr. Vaxon, Laxthos, Keinra, Peak Temple, Macksohn, Great Citadel, Laztek beast.
- New elder transliterations: 紐芬 / Newfen, 李福 / Leef, 德里昂 / Derion, 培亞 / Peya. Spell labels: 寄宿挪移法 / Migrating Host Spell, 共鳴器 / resonator. These are working translations, not claims of prior canonical English names.
- Appearance lists use existing catalog IDs only. The abbot, Sean, Tiara and other elders do not yet have catalog IDs; none were invented for this update. People mentioned only in the recap are not treated as present.
- Chapter 4 is now public. Its major events update the world timeline, Ron's bilingual record, the party's acceptance of Mari, and Roline's arrival/protection at Peak Temple. Tar'Mo's existing profile already covers his chapter-4 actions; no chapter-5 death is added to public profiles or the timeline. Minor emotional changes are omitted.
- Chapter 5 retains all five fixed choices and a sixth custom answer. Earlier chapters retain their four fixed choices and fifth custom answer. The private authoritative question setting stores the fixed option count; absent counts default to four for existing chapters.

Validation: six chapter-access Firestore Emulator tests passed, including five fixed options plus a sixth custom answer and backwards compatibility with existing chapters. Updated rules were deployed. Live read-back confirmed chapter 4 lock 0, chapter 5 lock 1, and identical six-role plus admin credential hashes; answer documents were preserved. Chapter data generation, shell/navigation/path checks and paragraph alignment checks passed. Visual browser QA could not run because the browser access host was unavailable. Website publication is handled by the GitHub Pages workflow after the final source commit.
