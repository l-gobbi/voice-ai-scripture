# 80: Add the Open-Licensed Bibles

**What to build:**
Bundle Bíblia Livre (`BLIVRE`, CC BY), the full Open Nova Bíblia Viva (`ONBV`, CC BY-SA, replacing the 67-verse stub) and the Berean Standard Bible (`BSB`, public domain), built reproducibly from eBible.org by the Bible build script. Their `{…}`/`[…]` markers are removed and the words kept; ONBV wording is otherwise untouched. The Scripture Catalog knows each translation's metadata (display name, language, licence, required notice, source) and its aliases. The learner can pick these translations when adding a verse. This is the *expand* step: `ALMEIDA` and `KJV` stay for now (ticket 81 removes them). See `spec-open-translations.md` and ADR 0018.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The build script downloads `porbr2018`, `poronbv` and `engbsb` from eBible.org, maps book codes to the canon ids, normalizes whitespace, removes `{}`/`[]` markers keeping the words, and writes datasets in the existing shape plus metadata. If ONBV contains markers, the script reports it rather than rewriting silently.
- [x] The Scripture Catalog bundles BLIVRE, ONBV (full), BSB and WEB alongside the existing texts, exposes per-translation metadata, and canonicalizes aliases ("Bíblia Livre", "blivre", "Berean", "bsb", "nova bíblia viva", …).
- [x] Language detection treats BLIVRE and ONBV as Portuguese and BSB as English.
- [x] The add-verse translation picker offers Bíblia Livre, ONBV, BSB and WEB.
- [x] A dataset integrity test checks every bundled Bible: 66 books, chapter and verse counts against the canon matrix (with an explicit, documented exception list for legitimate versification differences), no `{ } [ ]` characters in any verse, and non-empty metadata.
- [x] Scripture Catalog tests cover passage resolution in each new translation.
