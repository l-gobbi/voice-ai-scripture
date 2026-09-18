# 17: Dual-Language Topical Packs (Portuguese Collections)

**What to build:**
Expand the topical pack system to support dual-language collections. Adds curated Brazilian Portuguese topical packs (*Paz*, *Fé*, *Esperança* in Almeida) to `src/data/topicalPacks.ts` alongside existing English packs. Updates `PackBrowserModal.tsx` to display language tags (`[EN]` / `[PT]`) and allow filtering or toggling by language so Brazilian users can start memorizing immediately with one tap.

**Blocked by:** Ticket 15 (Translation Metadata in VerseEngine).

**Status:** closed

- [x] In `src/data/topicalPacks.ts`:
  - [x] Add language attribute (`language: 'en' | 'pt'`) and `translation` identifier (`WEB` or `ALMEIDA`) to `TopicalPack` and `PackVerse` types.
  - [x] Add 3 curated Portuguese topical packs:
    - **Paz** (Salmos 23:1, João 14:27, Filipenses 4:6-7) in Almeida.
    - **Fé** (Hebreus 11:1, Romanos 10:17, 2 Coríntios 5:7) in Almeida.
    - **Esperança** (Jeremias 29:11, Romanos 15:13, Isaías 40:31) in Almeida.
  - [x] Tag existing English packs (*Peace*, *Faith*, *Strength*) with `language: 'en'` and `translation: 'WEB'`.
- [x] In `src/components/PackBrowserModal.tsx`:
  - [x] Display language badge (`[EN]` or `[PT]`) on each pack card.
  - [x] Add a segmented language filter tab (`All` / `English` / `Português`) allowing users to quickly view packs in their preferred tongue.
  - [x] When a pack is imported, pass each verse's `translation` to `VerseEngine.addVerse()`.
- [x] Update tests to verify dual-language pack structure and import operations.
