# 84: Translations & Copyright Screen

**What to build:**
A screen listing every bundled translation with its full name, licence and exact required notice, read from the Scripture Catalog's metadata:
- the ONBV notice verbatim;
- the Bíblia Livre credit;
- the BSB's public-domain status with a courtesy credit;
- the WEB trademark note.

It is reachable from the Home Screen menu and from a link next to the translation options when adding a verse. It follows DESIGN.md and the per-language copy convention. See `spec-open-translations.md` and ADR 0018.

**Blocked by:** 80: Add the Open-Licensed Bibles

**Status:** done

- [x] The screen shows one entry per bundled translation with name, licence and notice from catalog metadata (no hard-coded duplicate notices).
- [x] It opens from the Home Screen menu and from the add-verse translation picker.
- [x] Screen tests assert the ONBV notice text verbatim and the Bíblia Livre credit.
