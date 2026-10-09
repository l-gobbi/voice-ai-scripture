# World-Class Strategy & Differentiation (October 2026 Research Pass)

**Author**: Research Agent
**Date**: 2026-10-09
**Status**: Completed
**Question (product owner, translated intent)**: "Based on everything you researched today, research even more, and think of other things we might do to make this app the best in the world. I know the app that might be number one right now, the Bible Memory App, is focused only on English speakers, and its voice verification is for Pro users only."
**Context**: This note builds on today's notes and does not repeat them. They are cited as:
- the **October note**: `feature-and-improvement-opportunities.md`, with its IDs such as V3, S1, C7;
- the **SRS note**: `spaced-repetition-sm2-vs-fsrs.md` (N1–N7, X1–X6, L1–L5);
- the **notification note**: `notification-and-platform-surfaces.md` (R1–R5);
- the **onboarding note**: `onboarding-first-run-experience.md` (stages 0–6);
- **CB**: `competitive-benchmarks-and-feature-opportunities.md`;
- **MR**: the workspace note `docs/research/02-market-research-and-feature-opportunities.md`;
- ADRs 0001–0016.

Vocabulary follows `CONTEXT.md`.

**Evidence conventions** (the same as today's notes)
- **Verified / read by me**: read in the primary source on 2026-10-09, with the URL inline.
- ***sub-agent***: collected verbatim from the primary page by a delegated research agent. **re-checked** marks a verdict-driving row I fetched again myself.
- **First-party claim**: a company describing its own product. It is primary for "what they say", not independent proof.
- **Secondary**: press, third-party hosts, or a Wayback copy of a primary page (flagged as such).
- **Inference**: my reasoning from verified facts. **Speculative**: thin evidence; a hypothesis to test.
- **UNVERIFIED**: no primary source could be found or reached.
- Store numbers are per storefront on 2026-10-09. App Store rating counts are per country; Play counts are global.

---

## 1. TL;DR

**The owner's two assumptions** (§2):
1. *"English-only"* is **outdated**. The Bible Memory App has had a 17-language interface since May 2026 and NVI-PT since Sep 2026, and is launching a Latin-American Spanish plan at US$ 14.99/yr that is already live in the stores. In Brazil, though, it is effectively absent: **23 App Store ratings, against 32,777 in the US**.
2. *"Voice is Pro-only"* is **correct**. Free "Lite" has no speech recognition, caps users at 50 verses and shows ads. Voice costs R$ 49,90/yr (PRO Yearly, if that legacy product still includes speech recognition as its Jan 2025 PRO feature list says) to R$ 299,90/yr (Unlimited) in Brazil. Its own users say the voice grading "lets you slide when you mess up and docks you when you don't mess up".

**The bets, ranked** (impact × confidence ÷ effort, judged from §4–§7):

1. **Conferência confiável em português.** Build a consented Brazilian recitation corpus, publish the grading accuracy (target < 2% false fails), grade the spoken reference, and keep voice free on-device. It answers the category's #1 complaint, and nobody else can measure it (§7.1, §6.3).
2. **A Bíblia da sua igreja.** Ship open texts now. License ARC 2009 / ARA / NAA (SBB) or NVI (Biblica Brasil), and detect "you recited the ARC wording" instead of marking it wrong (§7.2).
3. **Plano da igreja + WhatsApp.** Célula and EBD verse plans as links and QR codes, then an aggregate-only leader view (k ≥ 5). The plans hook into CPAD's weekly "Texto Áureo" and club programmes, and spread through status-sized share cards (§7.3, §7.8).
4. **Capítulos inteiros.** Book Programmes that encode Andrew Davis's method (one new verse a day, yesterday ×10, old verses together, 100-day consolidation) with chunked verification (§7.4).
5. **Modo caminhada, para todos.** An eyes-free loop with spoken corrections, for walkers, drivers, blind users, and the 29% of Brazilians who are functionally illiterate (INAF 2024) (§7.5).
6. **Privacy and craft as the brand.** On-device by default, no ads, no login to start, a bell-like sound, and a bundled serif. Award-grade quiet (§7.9, §7.10).
7. **Spanish second (Q3 2027).** RV1909 (public domain) plus open modern texts, an es-419 corpus, and a price at or under the incumbent's US$ 14.99 (§5.3–5.4).

**Positioning (pt-BR).** Para cristãos brasileiros que querem guardar a Palavra no coração, *[nome do app]* é o app de memorização bíblica que ouve você recitar e confere cada palavra, em português. A conferência por voz é grátis para sempre, funciona no seu celular, até sem internet, e é afinada com vozes brasileiras. Comece hoje com traduções abertas e, à medida que as licenças forem assinadas, recite na tradução da sua igreja. Sozinho, em família ou com a sua célula: você recita, o app confere, e a revisão espaçada faz o versículo ficar. Sem anúncios, sem cadastro obrigatório, e seus versículos são só seus.

**Positioning (en).** For Brazilian Christians who want to hide God's Word in their hearts, *[app name]* is the scripture-memory app that listens while you recite and checks every word, in Portuguese. Voice checking is free forever, runs on your own phone (even offline) and is tuned on Brazilian voices. Start today with open translations and, as licences are signed, recite in your church's translation. Alone, with your family or with your small group: you recite, the app checks, and spaced review makes it stay. No ads, no forced sign-up, and your verses stay yours.

**Surprising findings**
- The incumbent's Spanish plan (US$ 14.99/yr, about 30% of its English price, including voice) is already purchasable in the Spain, Brazil and Mexico App Stores, even though its website still says "próximamente". Portuguese is the obvious next move for them (§2.1, §10).
- **Bible Loop** (Life.Church, YouVersion's family) already accepts *spoken* recitation, has 1M+ installs and offers streak freezes. It is English-only for now (§4.1).
- **64 million Brazilians** ran out of mobile data in the last three months (CGI.br 2025). Offline-first is a market requirement, not a nicety (§5.2).
- ADR 0015's 500 recitations/day cloud ceiling allows **US$ 2.50 per install-month**, more than the whole cloud cost of about 200 typical users. The average user costs about US$ 0.012/month (§6.3).
- Since June 2026 the Brazil storefront has its own Apple fee table: the standard rate fell from 30% to **21% + 5%**, small developers still pay 15% (now **10% + 5%**), and apps may use their own payment processor at 10% (small developers) with no Apple processing fee. Google Play takes **Pix** even for subscriptions; the App Store in Brazil does not (§6.1).
- No faith or memorization app has won or been a finalist at the Apple Design Awards in 2024–2026. The craft lane is open (§7.10).

---

## 2. Verifying the owner's assumptions about the Bible Memory App

**Method.** Everything in this section is first-party and was read by me on 2026-10-09: Apple's lookup API and App Store pages for the US, BR, MX, ES and PT storefronts, the Google Play listing (US and BR), biblememory.com (home, `/pro`, `/app`, `/es/unlimited`, `/pages/iphone-app`, `/bulletin/4129`) and the JavaScript bundle that renders its "Lite vs. Unlimited" comparison table, and the App Store customer-reviews RSS feed.

### 2.1 Claim 1: "It is focused only on English speakers"

**Verdict: wrong as stated, right in practice for Brazil.** The app is not English-only any more. It localized its interface in 2026, sells Spanish texts, and is launching a cheaper Spanish plan that includes speech recognition. Portuguese, however, gets only one translation, a machine-sounding European-Portuguese store text and almost no Brazilian users.

| Layer | What the first-party sources show | Source |
|---|---|---|
| **Interface languages** | 17 listed languages: "English, Amharic, Arabic, Filipino, French, German, Hindi, Italian, Korean, Polish, Portuguese, Russian, Spanish, Swahili, Tamil, Turkish, Vietnamese". The 9.2 and 9.3 notes (May 24 and Jun 4, 2026) say: "The Bible Memory App is now available in 15+ languages with 50+ international typing keyboards". | App Store US "Languages" and Version History; `languageCodesISO2A` in the [lookup API](https://itunes.apple.com/lookup?id=496790833&country=br) |
| **Scripture texts, Spanish** | Reina-Valera 1960 for years ("& in Spanish with Reina-Valera 1960"). v9.5 (Sep 21, 2026) added "NBLA: Nueva Biblia de las Américas", "NVI-S: Nueva Versión Internacional" and "RVR09: Reina-Valera 1909". | [App Store US](https://apps.apple.com/us/app/the-bible-memory-app/id496790833) description and Version History |
| **Scripture texts, Portuguese** | One: "NVI-PT: Nova Versão Internacional" (v9.5, Sep 21, 2026). No ARA, ARC, NAA or NVT. | Same |
| **Spanish plan** | "Bible Memory Unlimited en español … Todas las funciones PRO y Bible Intelligence, con dos Biblias de pago en español incluidas. Desde US$1.99 al mes. Plan anual por US$14.99 o de por vida por US$49.99." It explicitly includes "practica con reconocimiento de voz y audio" and is "Un precio más accesible para la comunidad de habla hispana de América Latina". The web page still says "Disponible próximamente … todavía no se aceptan pagos". | [biblememory.com/es/unlimited](https://biblememory.com/es/unlimited); [biblememory.com/pro](https://biblememory.com/pro) ("¿Memorizas en español? … desde US$1.99 al mes") |
| **…and it is already live in the stores** | App Store ES: "Unlimited en español anual 17,99 €", "mensual 1,99 €", "de por vida 59,99 €". App Store BR: "Spanish Unlimited Yearly R$ 99,90", "Monthly R$ 12,90", "Lifetime R$ 299,90". App Store MX: "Unlimited en español de por vida $999.00" (MXN). The MX/ES description says: "Las ofertas en español se muestran en dispositivos cuyo idioma es español." | App Store [ES](https://apps.apple.com/es/app/bible-memory/id496790833), [BR](https://apps.apple.com/br/app/the-bible-memory-app/id496790833), [MX](https://apps.apple.com/mx/app/bible-memory/id496790833) "In-App Purchases" |
| **Store copy** | Spanish storefronts have a rewritten Spanish description ("Haz de la memorización bíblica un hábito con Bible Memory…"). The BR storefront shows a European-Portuguese text ("guiá-lo-á", "Multiutilizador") that still claims "mais de 3 milhões de versículos" (the site counter says 26,868,107) and lists only English translations plus RVR1960. | Lookup API `description` for `country=mx`, `es`, `br` |
| **Reach (App Store ratings, 2026-10-09)** | US 4.80 from **32,777**; MX 4.72 from **103**; ES 4.78 from **27**; **BR 4.83 from 23**; PT 5.0 from 2. Google Play (one global count): 4.7 (US view) / 4,8 (BR view), "6.44K reviews", "100K+ downloads", updated Sep 16, 2026. | Lookup API per `country`; [Play US](https://play.google.com/store/apps/details?id=com.millennialsolutions.scripturetyper&hl=en&gl=US), [Play BR](https://play.google.com/store/apps/details?id=com.millennialsolutions.scripturetyper&hl=pt-BR&gl=BR) |
| **Speech recognition in pt or es** | **UNVERIFIED.** No first-party page says which languages the recognizer accepts. The Spanish plan's "practica con reconocimiento de voz" implies Spanish voice practice is intended. Nothing mentions Portuguese. | — |
| **AI layer (Bible Intelligence) in Spanish** | A Mexican reviewer, 2026-10-04: "solo genera estudio en Inglés … sería una mejora excelente que lo pusieran en Español." (user claim) | [App Store MX reviews RSS](https://itunes.apple.com/mx/rss/customerreviews/page=1/id=496790833/sortby=mostrecent/json) |

Brazilian reviews show the gap from the user's side (App Store BR, all 3 written reviews in the feed):
- 2020-05-05, ★5: "Quando vao incluir a versao NVI em português?"
- 2021-12-12, ★1, "Somente em inglês.": "Uma pena, o App serve apenas para quem estuda em inglês…"
- 2025-07-02, ★5: "É possivel transcrever o texto em português. Você não vai poder importar, e verdade… A referência ficará em ingles…"
  ([App Store BR reviews RSS](https://itunes.apple.com/br/rss/customerreviews/page=1/id=496790833/sortby=mostrecent/json))

*Inference:* the owner's instinct about Brazil is right: 23 BR ratings against 32,777 US ratings means the incumbent has essentially no Brazilian base. But the premise "English-only" is outdated. The company localized the UI in May 2026, added NVI-PT in September 2026, and is launching a Latin-American Spanish plan at about 30% of the English price. **Portuguese looks like the obvious next step for them, so the window is months, not years** (§10).

### 2.2 Claim 2: "Its voice verification is for Pro users only"

**Verdict: correct.** Speech recognition is a paid feature. The free tier ("Bible Memory Lite") does not include it, and it also shows ads and caps the library at 50 verses.

| Evidence | Quote | Source |
|---|---|---|
| Comparison table (the data behind "Compare all features: Lite vs. Unlimited") | `{label:"Speech Recognition",platform:"apps"}`: no `lite:!0` flag, so it renders "−" under "Lite / Free" and "✓" under "Unlimited / Paid". The only row flagged for Lite is "3-Step Memorization System". "No Ads" is also Unlimited-only. | biblememory.com JS bundle `16a1sn_j72nbs.js`, loaded by [biblememory.com](https://biblememory.com/) |
| Product page | "Go Unlimited to remove ads and unlock speech recognition, flashcards, audio recording, AI-powered Bible Intelligence, every premium translation, family sharing, and more." | [biblememory.com/pages/iphone-app](https://biblememory.com/pages/iphone-app) |
| FAQ | Unlimited includes "the complete PRO memorization system (speech recognition, heat maps, audio recording, and flashcards on iOS & Android, plus unlimited verses…)". | [biblememory.com](https://biblememory.com/) FAQ |
| Older PRO sale page (Jan 1, 2025) | PRO features: "No Ads", "Unlimited Verses: Access an extensive library beyond the 50 free verses", "Speech Recognition: Practice speaking verses aloud and receive instant feedback." | [biblememory.com/bulletin/4129](https://biblememory.com/bulletin/4129) |
| A 2026 user confirms the cap | "it only allows you 50 free verses" (★4, 2026-07-24) | [App Store US reviews RSS](https://itunes.apple.com/us/rss/customerreviews/page=1/id=496790833/sortby=mostrecent/json) |
| Platforms | Speech recognition is an "apps" feature (iOS, Android, Mac), not web. | Comparison table above |

**What "Pro" costs (store prices on 2026-10-09).** The store still sells the older PRO products next to the 2026 "Unlimited" plan. By the FAQ's definition, PRO includes speech recognition.

| Product | US | Brazil (App Store BR) | Mexico (MXN) | Spain |
|---|---|---|---|---|
| Bible Memory PRO (one-off, as listed) | $9.99 | R$ 59,90 | $199.00 | 9,99 € |
| PRO Monthly | $1.99 | — (not in the top-10 list shown) | $39.00 | 1,99 € |
| PRO Yearly | — (not shown) | **R$ 49,90** | $199.00 | — |
| PRO Lifetime | $19.99 | R$ 129,90 | $399.00 | — |
| **Unlimited Yearly** | **$49.99** | **R$ 299,90** | $999.00 | — |
| Unlimited (web) | $9.99/mo, $49.99/yr, $149.99 lifetime | — | — | — |
| Unlimited en español | US$1.99/mo, US$14.99/yr, US$49.99 lifetime (web, "próximamente") | R$ 12,90/mo, R$ 99,90/yr, R$ 299,90 lifetime | Lifetime $999.00 | 1,99 €/mo, 17,99 €/yr, 59,99 € lifetime |
| Bible Intelligence (AI) | $5.99/mo; "PRO + Intelligence" $5.99 | "PRO +Intelligence" R$ 249,90 | $129.00 / $999.00 | 59,99 € |

Sources: "In-App Purchases" / "Compras dentro do app" sections of the App Store pages for [US](https://apps.apple.com/us/app/the-bible-memory-app/id496790833), [BR](https://apps.apple.com/br/app/the-bible-memory-app/id496790833), [MX](https://apps.apple.com/mx/app/bible-memory/id496790833) and [ES](https://apps.apple.com/es/app/bible-memory/id496790833), plus [biblememory.com/pro](https://biblememory.com/pro) and [/es/unlimited](https://biblememory.com/es/unlimited). Apple shows at most ten IAPs per storefront, so "—" means "not shown", not "not sold". Prices change, so re-check them before quoting them.

*Inference:* for a Brazilian, the cheapest way to get voice grading from the Bible Memory App is PRO Yearly at R$ 49,90/yr, *if* that legacy product still unlocks speech recognition. The headline plan is Unlimited at R$ 299,90/yr. The owner's positioning, "voice verification free for everyone", is therefore a real difference in Brazil. In Spanish markets it is weaker, because Spanish Unlimited costs US$14.99/yr.

### 2.3 What the incumbent's own users say about its voice grading

The paid voice feature has a quality problem. Recent US reviews (App Store US RSS, most recent 150 reviews: 120 ★5, 13 ★4, 2 ★3, 6 ★2, 9 ★1):
- "the voice to text feature is TERRIBLE. Do Not Buy the pro version for that feature. It lets you slide when you mess up and docks you when you don't mess up." (★4, 2026-06-03)
- "It couldn't figure out the word unto … By all means it has the verse to compare with. It knows the vocabulary to pick from. Let it use that vocabulary. Let it even favor it." (★1, "Voice review needs help", 2026-03-26)
- "One improvement would be to the voice recognition part of the app. Quoting verses aloud would be so much better if it were more consistent." (★4, 2026-07-08)
- "the audio recognition is not great." (★4, 2026-05-24)
- And the upside: "this app, with the voice recognition is a game changer. In 11 months i have memorized more than i ever did in my entire life." (★5, 2026-05-29); "My wife has refused for years to help me with reviewing my verses." (★5, 2026-04-21)

*Inference:* two messages for the strategy. **Voice review is wanted** (people pay for it and praise it). **Grading accuracy is the weak point** of the market leader, in English, on archaic words like "unto". That is exactly the October note's scoring-integrity and ASR-tolerance work (`feature-and-improvement-opportunities.md` #1, #9, V3, V6). The "use the verse's vocabulary" request also supports V3's proper-noun-only `contextualStrings`, with a caution: biasing towards the *whole* verse would hide real slips.

---

## 3. What "best in the world" means, measurably

"Best" has to be something we can measure and publish. Below are nine dimensions, how to measure each one, where the incumbents stand today (store numbers from Apple's lookup API and Play listings, read 2026-10-09), and a 12-month target. Targets are proposals (*inference*), not benchmarks.

| # | Dimension | Metric | Incumbents today (first-party numbers) | 12-month target |
|---|---|---|---|---|
| 1 | **Loved where we play** | Store rating and rating count *in Brazil*; Play installs | **No scripture-memory app has a Brazilian base.** App Store BR ratings: Bible Memory App 4.83 from 23; Remember Me 4.78 from 23; Versify 5.0 from 8; VerseLocker 0; Fighter Verses 3. Play (global counts): Remember Me "1 mi+" installs, 21.8K ratings; Bible Memory App 100K+, 6.44K; VerseLocker 100K+; Versify 50K+. The bar for "Bible app" in Brazil is YouVersion: 4.93 from **1,561,905** BR App Store ratings, 100M+ Play installs. | ≥ 4.8★ on both stores, **≥ 1,000 App Store BR ratings** (more than every scripture-memory app combined) and ≥ 50K Play installs |
| 2 | **People come back** | D1 / D7 / D30 return; share of days with all due verses reviewed | Nobody publishes retention. The only benchmark in today's notes is health apps' "15-day and 30-day retention rates were 3.9% … and 3.3%" (Baumel et al. 2019, cited in `onboarding-first-run-experience.md` §4). | Baseline in Q4 2026, then +X pp per experiment (onboarding note §9) |
| 3 | **Verses actually stay** | Share of "learned" verses recited within the error budget at 30 / 90 / 180 days; observed vs desired retention | Incumbents publish **counts, not retention**: the Bible Memory App's site counter read "26,868,107 Verses Memorized" and its FAQ says "30 million+" ([biblememory.com](https://biblememory.com/)). Nobody publishes verified recall after months. | Observed retention within ±3 points of the 0.90 target (`spaced-repetition-sm2-vs-fsrs.md` §1, X3), and **publish it**: "X% of verses learned in our app are still recited word-perfect after 6 months" |
| 4 | **Grading you can trust** | Agreement between the app's word marks and a human judge on a pt-BR recitation test set; false-fail rate on correct recitations | Nobody publishes it. Users of three competitors complain that correct recitations are marked wrong (§4.3 A). | ≥ 97% word-level agreement and **< 2% false fails** on the pt-BR set (October note V8, expanded in §7.1) |
| 5 | **Languages served with voice grading** | Languages where the voice grade works on a built-in Bible text | Bible Memory App: interface in 17 languages, voice languages undocumented (§2.1). Every *established* Bible voice-grader is English-only (Versify, Bible Loop). MemoryVerses claims pt/es (unverified), and generic memorizers grade any pasted text (§4.2). | pt-BR (Q4 2026), es-419 (2027), en |
| 6 | **Accessible** | Full VoiceOver/TalkBack flows; Apple Accessibility Nutrition Labels declared; usable without reading | A blind user on Versify: "I'm Blind. Make This More Accessible. The games are unplayable." (★3, 2025-10-18, [RSS](https://itunes.apple.com/us/rss/customerreviews/page=5/id=1597230197/sortby=mostrecent/json)) | Every core flow usable eyes-free (§7.5) |
| 7 | **Fair price** | Voice grading price; Pro price as a share of Brazil's minimum wage (R$ 1.621,00, [Decreto 12.797/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm)) | Bible Memory App: voice is paid (PRO Yearly R$ 49,90 = 3.1% of a minimum wage; Unlimited R$ 299,90 = 18.5%). Remember Me, Versify and VerseLocker are free, but none grades pt-BR speech. | Voice grading **free for everyone**; Pro ≤ 4% of a monthly minimum wage per year (§6) |
| 8 | **Private** | Audio leaves the phone only with explicit consent; App Store label for the core loop | Engraved and ReciteWell promise on-device audio (onboarding note §5). The Bible Memory App is account-centric with server sync. | On-device by default; "Data Not Collected" for the core loop (§7.9) |
| 9 | **Fast on the phones Brazilians own** | Cold start and memory on a low-end Android; works offline and on a spent data plan | — | Cold start < 2 s on an entry Android; full core loop offline (October note D1, E-R7) |

*Inference:* the cheapest credible claim to "best in the world" is **#3 plus #4**: verified long-term recall and grading accuracy. No incumbent measures either publicly, and both follow from work already planned (the review log, M1/N1, and the test set, V8).

---

## 4. Competitor teardown 2.0

**Method.** The Bible Memory App rows were collected and checked by me (§2). The other rows come from a research sub-agent reading Apple's lookup API, App Store pages, the App Store review RSS and Google Play listings on 2026-10-09 (*sub-agent*). I re-fetched Remember Me's Play listing ("1 mi+ downloads", "21,8 mil avaliações"). Facts already in `feature-and-improvement-opportunities.md` §5 (the "October note") and `onboarding-first-run-experience.md` §5 are cited, not repeated.

### 4.1 The table

| App | App Store ★ / ratings (US · BR) | Play installs · ratings | Last update | Voice grading? | Languages (UI · texts) | Free vs paid | BR price |
|---|---|---|---|---|---|---|---|
| **The Bible Memory App** | 4.80 / 32,777 · 4.83 / 23 | 100K+ · 6.44K | 2026-09-24 | Yes, **paid** (PRO/Unlimited) | 17 UI · English + 4 Spanish + NVI-PT + RST | Lite: 50 verses, ads, no voice | PRO Yearly R$ 49,90; Unlimited R$ 299,90 |
| **Remember Me** (Poimena, Swiss nonprofit) | 4.68 / 327 · 4.78 / 23 | **1M+** · 21,848 (site claims "2+ million downloads", first-party) | 2026-08-31 | **No** (record and self-check; hands-free TTS) | 23 UI incl. PT, ES · copy-paste from online Bibles | "100% free. No ads. No limit." ([remem.me](https://www.remem.me/), via the pricing sub-agent) | Free |
| **Versify** | 4.94 / 14,869 · 5.0 / 8 | 50K+ · 3,866 | 2026-06-06 | Yes (dictation "speaking game") | EN · ESV, NIV, NASB, NLT, CSB, BSB, LSV, KJV | Free, no ads | Free |
| **VerseLocker** (Scripture Memory Fellowship) | 4.84 / 625 · 0 | 100K+ · 1,563 | 2026-09-26 | No (listen on loop) | 27 UI incl. PT, ES | Free | Free |
| **Fighter Verses** (Truth78) | 4.91 / 2,123 · 5.0 / 3 | 10K+ · 699 | 2026-09-11 | No ("record yourself … then compare") | EN, FR, DE, ES · 11 incl. LBLA, RVR60 (paid) | Paid app | R$ 29,90 + add-ons R$ 6,90 |
| **Verses – Bible Memory** | 4.66 / 3,939 · 5.0 / 2 | not on Play | **2020-03-13** | "Speak Out (Beta)" (seen only in reviews) | EN | Still sells Basic/Pro | Basic R$ 18,90; Pro R$ 36,90 |
| **Bible Loop** (Life.Church, YouVersion's family) | — (not collected) | **1M+** | — | **Yes**: level 4 "You must type or speak the entire verse from memory" | **English only** ("At this time, Bible Loop is only available in English") | Free, no account; weekly leaderboard; "3 Streak Freezes every week" | — |
| **Memverse** | no iOS app | Memverse Mobile 1K+, last update **2019-02-09** | — | Web Voice Review (October note) | EN | Free | — |
| **Scripture Typer** | — | — | — | Now a desktop typing tutor (October note) | — | — | — |
| **Bible Memory Kids** (Millennial Apps) | 4.35 / 375 · 0 | no Play listing | 2026-09-19 | No (parent records the child) | EN · ESV | Paid app | R$ 59,90 |
| **Engraved** | 5.0 / 2 · 0 | 10+ | 2026-09-30 | Yes, on-device | EN | Free | Free |
| **ReciteWell** | 0 · 0 | none | 2026-03-05 (v1.0, never updated) | Yes, on-device Whisper | EN · KJV, WEB | 25 verses free | R$ 29,90/mo; R$ 249,90/yr |
| **OneNineteen** | 5.0 / 2 · 0 | none | 2026-06-17 | Yes | EN · KJV free, others Plus | 7-day trial, 15 verses | not sold in BR |
| **Lantern** | 4.67 / 12 · 0 | 100+ | 2026-10-04 | "Speak the Passage" | **UI EN, PT, RU, SR, ES** · English texts only | Free | Free |
| **MemoryVerses** | 4.96 / 25 · 0 | 100+ | 2026-08-31 | Yes ("Recite o Versículo … veja sua pontuação") | Play listing claims "Spanish and Portuguese" texts, **unverified** | Free + supporter IAP | R$ 19,90/mo; R$ 149,90/yr |
| **VersoTranca / VerseAnchor** (HK) | 4.10 / 10 · 4.60 / 5 | 10K+ · 197 | 2026-07-07 | No (record, listen) | 12 UI incl. PT, ES | Very limited free tier | R$ 9,90/mo; R$ 39,90/yr; R$ 99,90 lifetime |
| **Memorize By Heart** (generic text) | 4.79 / 2,439 · 4.92 / 26 | 100K+ · 1,845 | 2026-10-06 | Yes, against any pasted text | 26 UI incl. PT, ES | Free tier ("tres por día") + Premium | not captured |
| **Memory** (Janus Works, BR) | — | "0+" | 2026-10-07 | No (self-rated) | pt · Bíblia Livre, RV1909, WEB/KJV | Free + Plus | — |
| **YouVersion** (for scale) | 4.91 / 13,822,731 · 4.93 / 1,561,905 | 100M+ · 9,297,724 | 2026-10-06 | No (Lite: tap-to-fill memorization) | 63 UI | Free, donation-funded | Free |

Sources: per-app lookup API (`itunes.apple.com/lookup?id=<id>&country=us|br`), App Store pages for IAP lists, and Play listings (`hl=pt-BR&gl=BR`), all read 2026-10-09 by the sub-agent; Bible Memory App and Remember Me Play re-read by me. Apple shows at most ten IAPs per storefront. Bible Loop rows come from YouVersion's help centre ([memory verse levels](https://help.youversion.com/l/en/article/voabe8h9uq-memory-verse-levels), [Bible Loop](https://help.youversion.com/l/en/article/qgjz41tr8k-bible-loop), [streak freezes](https://help.youversion.com/l/en/article/54dm9fget9-streak-freezes); first-party claims, features sub-agent) and its Play listing (`app.bible.daily.verses.video`). The main YouVersion Bible App has no memorization feature; only Bible App Lite and Bible Loop do (sub-agent check of all 279 English help articles).

**What the table says** (*inference*)
1. **The two big free apps (Remember Me, VerseLocker) are localized but do not grade speech.** The one paid app that grades speech (Bible Memory App) is localized but charges for voice. Versify and Bible Loop accept speech for free, but in English only. **Nobody combines free voice grading, Portuguese UI and a Brazilian Bible text.**
   - **Watch Bible Loop.** It is YouVersion's family (Life.Church), already has 1M+ installs, accepts spoken recitation and has no account. If YouVersion localizes it into Portuguese, it becomes the strongest competitor overnight (§10).
2. **The 2025–26 wave of voice apps is tiny.** None has more than 25 ratings in any storefront. The voice idea is validated, the market is not taken.
3. **Abandonware still charges.** Verses (not updated since 2020) and Memverse Mobile (2019) are still listed. Reliability and visible maintenance are a differentiator.

### 4.2 Verdict on the October note's "pt-BR lane is open"

**It holds, with qualifiers** (sub-agent finding, checked against the listings above):
- No Bible-memory app with real traction (≥ 1K ratings or ≥ 10K installs) automatically scores spoken pt-BR against a built-in Brazilian translation (ARA, ARC, NVI or NAA).
- **But** generic memorizers grade speech against *any* pasted text in Portuguese (Memorize By Heart, 100K+ installs; Memorizun, "reconhecimento de fala").
- **And** three tiny Bible apps come close and need hands-on testing: MemoryVerses ("Recite o Versículo"), Lantern (PT UI, Speak mode) and Ilum (ACF text, "recite-o de memória", mechanism unstated).
- **Spanish has the same structure.** No established app grades spoken Spanish against RVR1960. The Bible Memory App's Spanish plan (§2.1) may soon.

### 4.3 What users ask for: review mining

**Sample.** App Store RSS, up to 10 pages per app and storefront (br, mx, es, ar, co, pt, us), plus the three reviews Play shows per listing (pt-BR and es-419 views). Across the apps the sub-agent sampled, only **31** non-US App Store reviews exist, and only 4 are in Portuguese. The Bible Memory App adds 15 more (3 BR, 12 MX; §2.1). **Brazilian and Spanish-speaking voices are on Google Play**, which matches the Android share in §5.2. Quotes are verbatim and ≤ 40 words. *Sub-agent* rows, except the Bible Memory App ones from my own RSS pull (§2).

**A. "I said it right and it marked me wrong" (the strongest signal for a voice product).** Verses: 29 reviews mention Speak Out, about 20 negative.
- Verses, US, ★4, 2024-04-21: "the 'Speak the Verse' function often doesn't get my words right. I am therefore penalized and my memorization rating drops even though I spoke the verse correctly." ([RSS p3](https://itunes.apple.com/us/rss/customerreviews/page=3/id=939461663/sortby=mostrecent/json))
- Verses, US, ★3, 2024-11-18: "difficult to use on 'longer' portions of scripture … it resets and/or skips and marks incorrectly words that have been spoken." (same page)
- Bread, US, ★1, 2026-09-17: "the second verse that I recited was recited perfectly, and the app crossed through the words… and said that they were missing." ([RSS](https://itunes.apple.com/us/rss/customerreviews/page=1/id=6757946016/sortby=mostrecent/json))
- Memorize By Heart, MX Play, ★5, 2021-03-29: "La función de dictado y la de reconocer la voz parecen no funcionar muy bien" ([Play MX](https://play.google.com/store/apps/details?id=com.memorize_by_heart&hl=es-419&gl=MX))
- Bible Memory App, US: "It lets you slide when you mess up and docks you when you don't mess up." (§2.3)

**B. "Put it in Portuguese / Spanish, with our Bible."**
- Bible Memory App, BR Play, ★4, 2025-10-11: "coloquem traduções brasileiras por favor" ([Play BR](https://play.google.com/store/apps/details?id=com.millennialsolutions.scripturetyper&hl=pt-BR&gl=BR))
- Versify, BR Play, ★4, 2024-08-05: "Queria que tivesse em português! Ótimo app" ([Play BR](https://play.google.com/store/apps/details?id=com.tarkowr.versify&hl=pt-BR&gl=BR))
- BibleMe, BR Play, ★1, 2025-05-14: "poderia ser um ótimo aplicativo para memorizar mais está em inglês" ([Play BR](https://play.google.com/store/apps/details?id=com.efireapps.bibleme&hl=pt-BR&gl=BR))
- BibleMe, BR Play, ★5, 2024-12-11 (reviewer in Angola): "my native language is Portuguese… Add Portuguese please" (same)
- Bible Memory App, MX Play, ★2, 2020-05-23: "Si no he podido memorizar la Biblia en español, creen que me meteré a hacerlo en inglés?" ([Play MX](https://play.google.com/store/apps/details?id=com.millennialsolutions.scripturetyper&hl=es-419&gl=MX))
- RVR1960 is requested by name in four reviews, e.g. Dayly, MX, ★3, 2026-08-16: "me gustaría que agregaran la versión Reina Valera 1960" ([RSS](https://itunes.apple.com/mx/rss/customerreviews/page=1/id=6791455219/sortby=mostrecent/json))

**C. Free and ad-free is valued; paywalls and silence are punished.** "Free / no ads" appears in 57 of 505 Versify reviews and 31 of 226 VerseLocker reviews.
- Remember Me, BR Play, ★5, 2025-10-30: "Não tem anúncios e é totalmente gratuito!" ([Play BR](https://play.google.com/store/apps/details?id=me.remem.app&hl=pt-BR&gl=BR))
- VersoTranca, BR Play, ★5, 2026-03-03: "Poderia ser um pouco mais em conta para popularizar" ([Play BR](https://play.google.com/store/apps/details?id=bzn.bible.memorise.verselock&hl=pt-BR&gl=BR))
- Verses, US, ★1, 2026-02-06: "Had the paid subscription, got a new phone and could never log back in… zero response. Lost all saved progress" ([RSS p1](https://itunes.apple.com/us/rss/customerreviews/page=1/id=939461663/sortby=mostrecent/json))

**D. Voice and hands-free are wanted.**
- Versify, US, ★5, 2026-01-08: "THEY LISTENED!!! They have added a dictation feature" ([RSS p4](https://itunes.apple.com/us/rss/customerreviews/page=4/id=1597230197/sortby=mostrecent/json))
- Remember Me, US, ★1, 2022-03-25: "the audio stopped when the screen timed out… With the old version I could listen hands-free (walking, driving.)" ([RSS p2](https://itunes.apple.com/us/rss/customerreviews/page=2/id=1600128209/sortby=mostrecent/json))
- Lantern, US Play, ★5, 2026-08-23: "The Speak the Passage mode is amazing and unlike anything that other bible memory apps offer!" ([Play](https://play.google.com/store/apps/details?id=com.lanternbible.app&hl=en&gl=US))

**E. Passages that build and stay together.**
- Bible Memory App, US, ★4, 2026-06-03: "I have mastered psalm 95:7-10, but if I do them all perfectly except v8, then they will be forever out of sync and won't pop up on the same day." (§2.3 source)
- VerseLocker, US, ★3, 2024-01-02: "for memorizing a collection or passage… there is no way for it to build on itself." ([RSS p2](https://itunes.apple.com/us/rss/customerreviews/page=2/id=1544933853/sortby=mostrecent/json))
- Versify, US, ★3, 2026-07-11: "doesn't work well for large passages or chapters." ([RSS p1](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1597230197/sortby=mostrecent/json))

**F. Sync yes, forced sign-up no.**
- VerseLocker, US, ★1, 2024-11-22: "First screen: create an account. Nope. You don't need my information." ([RSS p2](https://itunes.apple.com/us/rss/customerreviews/page=2/id=1544933853/sortby=mostrecent/json))
- Versify, US, ★5, 2025-04-06: "make it somehow available to make an account so i can access my verses across devices" ([RSS p9](https://itunes.apple.com/us/rss/customerreviews/page=9/id=1597230197/sortby=mostrecent/json))

**G. Together, not alone.**
- Versify, US, ★5, 2025-10-02: "if we could get the ability to learn a verse as a group and keep friends accountable" ([RSS p5](https://itunes.apple.com/us/rss/customerreviews/page=5/id=1597230197/sortby=mostrecent/json))
- Bible Memory App, US, ★5, 2026-04-21: "My wife has refused for years to help me with reviewing my verses." (§2.3)

**H. Kids, accessibility and simplicity.**
- Bible Memory Kids, US, ★3, 2024-02-19: "My six year old has had speech issues and struggles to read. This app is very helpful for him!" ([RSS](https://itunes.apple.com/us/rss/customerreviews/page=1/id=1418700508/sortby=mostrecent/json)). The app averages 3.31★ over 51 reviews.
- Versify, US, ★3, 2025-10-18: "I'm Blind. Make This More Accessible." (§3)
- Remember Me, BR Play, ★2, 2024-01-07: "estou com dificuldades em saber usar os recursos do aplicativo" ([Play BR](https://play.google.com/store/apps/details?id=me.remem.app&hl=pt-BR&gl=BR))

**I. Thin evidence (say so).** "Backlog guilt" appears **once** in about 2,400 reviews (Fighter Verses, 2016). Ads, offline use and memorizing the reference appear once or twice each. See §11 for what that changes.

### 4.4 Unmet needs, ranked by evidence

| # | Unmet need | Evidence weight | Who serves it today |
|---|---|---|---|
| U1 | **Voice grading that does not punish correct recitations** | Strong: 4 apps, about 25 reviews | Nobody does it well |
| U2 | **Portuguese (and Spanish) end to end**: UI, Brazilian translations, voice | Strong: 16 pt/es reviews + 4 RVR1960 requests, on top of the zero-traction BR numbers | Partly: Remember Me (UI, no grading), Bible Memory App (paid, NVI-PT only) |
| U3 | **Free and ad-free, with fair paywalls** | Strong: about 100 mentions | Remember Me, Versify, VerseLocker (no pt grading) |
| U4 | **Hands-free / listen-and-recite** | Moderate | Remember Me, VerseLocker (no grading) |
| U5 | **Passages that build and stay in sync** | Moderate | Lantern (tiny), Bible Memory App (verse-level sync issue) |
| U6 | **Sync without a forced account** | Moderate | — |
| U7 | **Groups and accountability** | Moderate | Bible Memory App groups (account-based), Remember Me campaigns |
| U8 | **Kids, blind users, low readers** | Weak but specific | Bible Memory Kids (3.3★) |

---

## 5. Market and language opportunity

### 5.1 Portuguese first: the audience

| Fact | Number | Source (all read 2026-10-09) |
|---|---|---|
| Evangelicals in Brazil, aged 10+ | **47,418,024 (26.85%)**, up from 21.7% in 2010 | IBGE Censo 2022, preliminary sample results, [SIDRA table 9537](https://sidra.ibge.gov.br/tabela/9537) (re-checked by me via the [API](https://apisidra.ibge.gov.br/values/t/9537/n1/all/v/140,1000140/p/2022/c133/all/c2/6794/c58/95253)); [IBGE release PDF](https://agenciadenoticias.ibge.gov.br/media/com_mediaibge/arquivos/3f1708b5d315aca50d5a7d8764469c45.pdf): "Evangélicos Aumento de 5,2 pontos percentuais, passando de 21,7% em 2010 para 26,9% em 2022." |
| Catholics in Brazil, aged 10+ | **100,216,153 (56.75%)** | same |
| Where evangelicals are densest | North 36.8%, Centre-West 31.4%; Acre 44.4% | same PDF, pp. 6, 9 |
| Religious establishments in Brazil | "579 mil Religiosos" (vs 264 thousand schools, 247 thousand health sites); all faiths | IBGE CNEFE deck, p. 16 ([PDF](https://agenciadenoticias.ibge.gov.br/media/com_mediaibge/arquivos/1902352705220d57ced6e2992f1452f9.pdf)) (*sub-agent*) |
| Angola, Censo 2024 | Protestant **12,024,481 (34.9%)**, Catholic 44.2% | [INE Angola](https://ine.gov.ao/Arquivos/arquivosCarregados/Carregados/Publicacao_638996687409619846.pdf), Quadro 24 (*sub-agent*) |
| Mozambique, Censo 2017 | Evangélica/Pentecostal **4,124,710 (15.3%)**; Zione/Sião 4,199,108 | INE Moçambique Quadro 11, archived xlsx (*sub-agent*) |
| Portugal, Censos 2021 | Protestant/Evangélica 186,832 (≈2.1%) | **Secondary** (INE unreachable): [Aliança Evangélica](https://aliancaevangelica.pt/site/evangelicos-em-portugal-segundo-o-censos-2021/) |
| **Portuguese-speaking evangelical/Protestant total** | **≈ 64.2M** (68.4M with Mozambique's Zione churches) | Arithmetic: 47,418,024 + 12,024,481 + 4,124,710 + 457,716 (Anglican) + 186,832 = 64,211,763 |

*Caveat on the sum:* the age bases differ (Brazil 10+, Angola 2+, Mozambique all ages, Portugal 15+), and so do the years (2017–2024) and category definitions. Treat ≈ 64M as an order of magnitude, not a clean count.

**Which Bible Brazilians actually carry.** SBB's own App Store listing says which churches use which of its translations (first-party, [Bíblia SBB](https://apps.apple.com/br/app/b%C3%ADblia-sbb/id1502745081), read by me):
- "Almeida Revista e Corrigida 1969, utilizada pelas igrejas: Igreja Pentecostal Deus é Amor, Igreja Cristã Maranata, Congregação Cristã no Brasil"
- "Almeida Revista e Corrigida 2009, utilizada pelas igrejas: Assembleia de Deus, Igreja do Evangelho Quadrangular, Igreja Internacional da Graça de Deus"
- "Almeida Revista e Atualizada 1993, utilizada pela Igreja Presbiteriana, Igreja Batista, Igreja Metodista, Igreja Luterana, Igreja Adventista"
- "Nova Almeida Atualizada 2017 … uma versão mais atualizada da tradução de Almeida"; NTLH 2000 for evangelism and youth.

*Inference:* the Almeida family (ARC/ARA/NAA, all © SBB) is what most Brazilian evangelicals memorize. NVI-PT (Biblica) is the main modern alternative, and it is the one the Bible Memory App licensed. This is why licensing is a strategic bet (§7.2), not a back-office task.

### 5.2 The phones, the data plans and the readers

| Fact | Number | Source |
|---|---|---|
| Mobile OS share, Brazil, Sep 2026 | **Android 78.78%, iOS 21.21%** (Android was 83.09% in Sep 2025) | StatCounter, read through Wayback snapshots because the domain is blocked locally ([2026-10-04 snapshot](http://web.archive.org/web/20261004052044/https://gs.statcounter.com/os-market-share/mobile/brazil)) (*sub-agent*) |
| Vendors, Aug 2026 | Samsung 29.43%, Apple 24.54%, Motorola 20.87%, Xiaomi 12.88% | StatCounter via Wayback (*sub-agent*) |
| Android versions, Aug 2026 | Android 12 or lower ≥ 14% (12: 7.77%, 11: 6.15%) | StatCounter via Wayback (*sub-agent*). Matters because Android continuous recognition and on-device APIs need 13/12+ (October note §3.1). |
| People 10+ with their own phone | 89.8% (167.4M), 2025 | IBGE PNAD Contínua TIC, [SIDRA 7373](https://sidra.ibge.gov.br/tabela/7373) (*sub-agent*) |
| Internet users online **only** by phone | 34.2% (57.7M), 2025 | [SIDRA 7337](https://sidra.ibge.gov.br/tabela/7337) (*sub-agent*) |
| Ran out of mobile data in the last 3 months | "64 milhões de indivíduos afirmaram que o pacote de dados de seu plano de celular acabou pelo menos uma vez nos últimos três meses" (≈39% of phone owners) | CGI.br, TIC Domicílios 2025 press deck, 9 Dec 2025 ([PDF](https://cetic.br/media/analises/tic_domicilios_2025_principais_resultados.pdf), read by me) |
| Instant messaging | 92% of internet users "Mandou mensagens instantâneas" (2025) | same deck |
| **Functional illiteracy (INAF 2024)** | "cerca de 40,8 milhões de jovens e adultos brasileiros (29%) podem ser considerados analfabetos funcionais" (ages 15–64). Levels: analfabeto 7%, rudimentar 22%, elementar 36%, intermediário 25%, proficiente 10%. Ages 50–64: 51% (secondary, UNICEF). | [Relatório Inaf Brasil 2024](https://alfabetismofuncional.org.br/wp-content/uploads/2026/04/relatorio-inaf-digital.pdf) (re-checked by me); Ação Educativa / Conhecimento Social |

*Inference:* the product has to be **Android-first, offline-first, light on data and usable by people who read with difficulty**. A text-heavy, typing-first, account-first, English-first incumbent fails all four. A voice-first app is the natural fit for the 29% who are functionally illiterate, *if* feedback is spoken as well as shown (§7.5).

### 5.3 Spanish second

| Fact | Number | Source |
|---|---|---|
| Spanish-speaking Latin American Protestants | **≈ 65–68M** (16–17% of ≈ 407M) | Arithmetic by the market sub-agent: Pew 2014 Protestant share × Pew 2020 population, per country. Largest: Mexico 11.4M, Guatemala 7.1M, Argentina 6.8M, Colombia 6.6M, Peru 5.6M. Excludes Cuba, Spain and US Hispanics. [Pew 2014](https://www.pewresearch.org/religion/2014/11/13/religion-in-latin-america/); [Pew 2020 composition](https://www.pewresearch.org/religion/feature/religious-composition-by-country-2010-2020/) |
| Mexico, INEGI Censo 2020 | "Protestante/Cristiano evangélico 14 095 307" (11.2%) | [INEGI](https://www.inegi.org.mx/contenidos/programas/ccpv/2020/doc/Censo2020_Principales_resultados_EUM.pdf), p. 80 (*sub-agent*) |
| Trend | Pew's 2024 resurvey (report 21 Jan 2026): Protestant shares flat or up 1–3 points; Brazil 29% | [Pew PDF](https://www.pewresearch.org/wp-content/uploads/sites/20/2026/01/PR_2026.01.21_religion-in-latin-america_report.pdf) (*sub-agent*) |

*Caveat on the estimate:* it applies 2014 *adult* Protestant shares to 2020 *all-age* populations, and Pew notes small Protestant subsamples. INEGI's 11.2% for Mexico (all ages, broader category) sits above Pew's 9% for Mexican adults. ≈ 65–68M is an order of magnitude.

**Texts.** Checked at the source (eBible.org details pages; *sub-agent*, RV1909 re-checked by me):
- **Reina-Valera 1909: public domain** ("Dominio Público", [eBible](https://ebible.org/find/details.php?id=spaRV1909)). Close in wording to the RVR1960 most evangelicals know.
- **RVR1960: licensed.** The American Bible Society manages the rights: "Do I need written permission to include the GNT/CEV/RVR60 in a Bible Study app for mobile phones? Yes, this usage requires written permission and may involve royalties or other fees." ([ABS](https://www.americanbible.org/rights-and-permissions/), *sub-agent*; the page blocked me).
- **Open modern texts:** Biblica Open Nueva Biblia Viva (CC BY-SA 4.0), Palabra de Dios para ti (CC BY 4.0, Asociación Bíblica Latinoamericana), Versión Biblia Libre (CC BY-SA 4.0). La Biblia en Español Sencillo was marked "Public Domain" in an eBible build dated 9 Oct 2026, but its details page still shows CC BY 4.0. Treat it as CC BY until the author confirms.

**Speech.** Apple's on-device dictation list includes "Portuguese (Brazil)" and "Spanish (Chile) … (Colombia) … (Mexico) … (Spain) … (United States)", and `DictationTranscriber` uses the same models ([iOS feature availability](https://www.apple.com/ios/feature-availability/#dictation-on-device); [DictationTranscriber](https://developer.apple.com/documentation/speech/dictationtranscriber); *sub-agent*). The SpeechTranscriber locale list is still not published as text (as the October note found). On Android, Google's ML Kit GenAI speech recognition (alpha) lists "pt-BR (beta)" and "es-ES (beta)" in basic mode ([ML Kit](https://developers.google.com/ml-kit/genai/speech-recognition/android), *sub-agent*).

### 5.4 What it would take to be the best in Portuguese, then in Spanish

**Best in Portuguese (the bar to clear by mid-2027)**
1. A voice grade that Brazilians trust, measured on Brazilian voices (§7.1).
2. The text they memorize at church: Almeida (ARC/ARA/NAA) or NVI, plus open texts (BLIVRE, ONBV) with honest labels (§7.2; October note L1–L3).
3. Native pt-BR copy everywhere, starting with store listings, permission strings and notifications (onboarding note §3.3; notification note R1).
4. Android-first quality on entry phones, offline and on a spent data plan (§5.2).
5. A church loop that works through WhatsApp (§7.3).

**Then Spanish (2027)**
1. RV1909 (public domain) plus one open modern text on day one; pursue RVR1960 through ABS.
2. An es-419 recitation test set (Mexico, Colombia, Argentina, Central America).
3. Grading tolerance for Spanish (clitics *dámelo*, *seseo* homophones *casa/caza*, digits).
4. A price for Latin America at or below the Bible Memory App's US$14.99/yr (§2.2).

**Other languages (later, speculative):** French (Louis Segond 1910, public domain) for francophone Africa, which pairs with the Lusophone African audience; Korean (1910, public domain); Russian (Synodal, public domain). Hindi, Swahili and Tagalog have CC BY-SA texts, but their on-device speech recognition must be checked first.

---

## 6. Pricing and unit economics

### 6.1 Store mechanics in Brazil (verified 2026-10-09)

*Pricing sub-agent rows; the two that drive the arithmetic were re-checked by me.*

- **Apple commission on the Brazil storefront** is now separate from the global rate (DPLA Attachment 12, since 2026-06-18): **10% + 5% payment processing = 15%** for Small Business Program members and subscriptions after year one; 21% + 5% otherwise. ([Apple: App distribution in Brazil](https://developer.apple.com/support/app-distribution-in-brazil/), re-checked: "10% Transactions from participants in the App Store Small Business Program … 5% Payments processed by Apple In-App Purchase").
- **Since iOS 26.5, apps may offer their own payment processor or link out to the web in Brazil**, after a CADE settlement approved on 2025-12-23. Apple's checkout must still be shown at least as prominently. The fee is 21% (10% for small businesses) with your own processor, 15% (10%) on web sales within 7 days of a link tap. Under-18 users get no link-outs. ([Apple payment options in Brazil](https://developer.apple.com/support/payment-options-on-the-app-store-in-brazil/); [CADE](https://www.gov.br/cade/pt-br/assuntos/noticias/cade-forma-maioria-pela-homologacao-de-tcc-em-investigacao-sobre-praticas-da-apple-no-ios)).
- **Google Play: 15%** on subscriptions ([Play Console Help](https://support.google.com/googleplay/android-developer/answer/112622)). A new fee model reaches "the rest of the world" by 2027-09-30.
- **Pix works on Google Play, including subscriptions**: "Você pode usar o PIX para comprar apps e conteúdo digital e renovar assinaturas automaticamente no Google Play" ([Google Play Help, BR](https://support.google.com/googleplay/answer/2651410?hl=pt-BR&co=GENIE.CountryCode%3DBR), re-checked). PicPay, Mercado Pago and cash top-ups are also listed.
- **The App Store in Brazil does not take Pix**: only "Apple Account balance … Apple Pay … Most credit cards" ([Apple Support 111741](https://support.apple.com/en-us/111741)). Pix on iOS would need your own processor under the new Brazil terms.
- **Taxes are the developer's job.** Apple does not remit Brazilian indirect taxes and withholds on payments leaving Brazil (DPLA Schedule 2 Exhibits B/C). Non-Brazilian developers also bear the 10% CIDE (from 2025-05-16) and 3.5% IOF ([Apple news](https://developer.apple.com/news/?id=wim4cztw), [IOF](https://developer.apple.com/news/?id=yo2104n5)). On Google, Brazil-based accounts can be paid in BRL. Otherwise Google withholds 25% (15% IRRF + 10% CIDE) ([Google](https://support.google.com/product-documentation/answer/15152514)). **Publishing from a Brazilian CNPJ avoids the cross-border withholding**, which is one more reason to settle the October note's open question 8 (publisher identity).
- **BRL price points in use** follow a pattern: US$0.99 → R$ 6,90, US$1.99 → R$ 12,90, US$9.99 → R$ 59,90, US$49.99 → R$ 299,90 (140 apps compared in the US and BR stores; observed, not an Apple list). Apple lets you choose Brazil as the *base* storefront, so a BRL-native price is possible: "Apple will never change the price in your base country or region" ([Set a price](https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price)).
- **Context:** PTAX on 2026-10-08 was R$ 5,0119 per US$ ([BCB](https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/)). The World Bank's private-consumption PPP factor is 2.58 BRL per international $ (2025), so Brazilian prices feel about twice as heavy as the FX rate suggests.

### 6.2 What people pay today (App Store BR, 2026-10-09)

| App | Price (BRL) | Share of one monthly minimum wage (R$ 1.621) |
|---|---|---|
| Bible Memory App, Unlimited Yearly | R$ 299,90/yr | 18.5% |
| Bible Memory App, PRO Yearly | R$ 49,90/yr | 3.1% |
| Bible Memory App, Spanish Unlimited Yearly | R$ 99,90/yr | 6.2% |
| Hallow, annual | R$ 249,90/yr | 15.4% |
| ReciteWell, annual | R$ 249,90/yr | 15.4% |
| Dwell, yearly | R$ 104,90/yr | 6.5% |
| Bíblia JFA Offline, Premium Anual (383K ratings) | R$ 79,99/yr | 4.9% |
| Glorify, annual | R$ 69,90/yr | 4.3% |
| VersoTranca, Anual | R$ 39,90/yr | 2.5% |
| YouVersion, Remember Me, Versify | free | 0% |

Sources: App Store BR "Compras dentro do app" sections (pricing sub-agent; Bible Memory App by me). One Brazilian Bible app (Mobidic) sells **donations as IAPs** ("Doação Mensal" R$ 9,90), which is a local precedent for a donation tier.

### 6.3 Unit economics of "voice verification free for everyone" (arithmetic shown)

**Inputs**
- On-device recognition: **US$ 0** marginal cost (October note §3.1; ADR 0011).
- Cloud: Groq `whisper-large-v3-turbo` at **US$ 0.04/hour**, billed with a 10-second minimum (October note §3.2; Groq's page was read via Wayback there, so this is a secondary copy).
- Proxy: Cloudflare Workers Paid, "minimum charge of $5 USD per month", "10 million included per month", "no additional charges for data transfer (egress)" ([Cloudflare](https://developers.cloudflare.com/workers/platform/pricing/), read by me). Any edge function works; this one is used for the arithmetic only.
- FX: R$ 5,0119 per US$.
- **Assumptions (mine, to be replaced by the review log):** recitations per active day, average seconds and active days per month, as in the table.

**Cloud cost per recitation** = 0.04 × max(seconds, 10) / 3600.

| Usage profile (assumption) | Recitations/day × seconds × active days/month | US$/recitation | US$/user-month | US$/user-year | R$/user-year |
|---|---|---|---|---|---|
| Typical: 5 due verses × 2 attempts | 10 × 12 s × 9 | 0.000133 | 0.012 | **0.144** | 0.72 |
| Committed daily | 20 × 15 s × 25 | 0.000167 | 0.083 | 1.00 | 5.01 |
| Passage memorizer | 60 × 25 s × 28 | 0.000278 | 0.467 | 5.60 | 28.07 |
| **Abuse ceiling today** (ADR 0015: 500/day) | 500 × 15 s × 30 | 0.000167 | **2.50** | 30.00 | 150.36 |

**Revenue per annual Pro subscriber** (example price R$ 59,90/yr):
- After the store fee (15% on both stores, §6.1): 59.90 × 0.85 = **R$ 50,92**.
- After Brazilian tax, assuming **10% of gross** (a placeholder; confirm the regime with an accountant): 50.92 − 5.99 = **R$ 44,92 ≈ US$ 8.96**.

**Break-even conversion** (subscribers needed per monthly active user so that subscriptions pay for cloud voice):
- Worst case, every user on cloud with typical use: 0.144 / 8.96 = **1.6%**.
- With a usage mix of 80% typical, 15% committed and 5% passage: 0.8 × 0.144 + 0.15 × 1.00 + 0.05 × 5.60 = **US$ 0.545 per cloud user-year**.
  - Every user on cloud: 0.545 / 8.96 = **6.1%**.
  - On-device by default, 25% opting in to cloud: 0.25 × 0.545 = 0.136 → 0.136 / 8.96 = **1.5%**.
- Fixed costs (assumptions): Apple Developer Program US$ 99/yr (not re-checked in this pass) + proxy US$ 60/yr + about US$ 40 (domain, misc.) ≈ US$ 199/yr ≈ R$ 997/yr → **22 annual subscribers**. API.Bible Pro "From $29 per month" (October note §6) would add US$ 348/yr → **39 more subscribers**.

**Verdict (*inference*).**
1. **Yes, free voice grading is sustainable, because the default engine is free.** With on-device recognition as the default (October note V3/S2), the marginal cost of a free user is zero. Cloud is a quality upgrade whose cost is cents per user per year at typical use.
2. **The real cost risk is the tail, not the average.** One install running at ADR 0015's 500/day ceiling costs US$ 2.50/month, about a third of a subscriber's yearly net. A stolen key (October note C1) is unbounded. **Move the limits server-side (S1) and cut the free cloud allowance** to something like 60 cloud recitations/day, after which the app falls back to on-device. That still never blocks the learner.
3. **Passage memorizers are the expensive users** (US$ 5.60/yr on cloud). Long passages should default to on-device, chunked recognition (§7.4). Cloud for long passages can be a Pro perk.
4. **The money goes to licences and people, not ASR.** One SBB or Biblica licence will likely cost more than all the cloud transcription for years. Price Pro to fund licences (§7.2).

### 6.4 Recommended model (*inference*)

| Tier | What it includes | Price idea |
|---|---|---|
| **Grátis, para sempre** | Unlimited on-device voice grading; **cloud "alta precisão" as an opt-in (with consent) up to a daily cap, e.g. 60 cloud recitations/day, after which the app silently uses on-device recognition (never blocked)**; spaced repetition; Echo, Cloze and Blind; open texts (BLIVRE, ONBV, KJV, WEB, BSB, RV1909); topical collections; church plans as a member; offline; no ads, ever | R$ 0 |
| **Apoiador / Pro** | Uncapped cloud recognition, including long passages; licensed translations (ARA/ARC/NAA/NVI) once signed; passage and chapter programmes; backup and sync; family profiles; detailed insights | Test R$ 9,90/mo vs R$ 59,90/yr (≈ US$ 12/yr, under the Bible Memory App's Spanish US$14.99). Use Play's Pix and price experiments (one-time products only, so test the lifetime price there). |
| **Igreja** | Leader tools and aggregate dashboards; bulk member licences | Per church per year. Precedent: the Bible Memory App sells "30% off (10+) or 40% off (50+)" bulk licences |
| **Doação** | Monthly or one-off support with no extra features | IAP donations (Mobidic precedent) |

**The YouVersion Platform fork.** A fully free app with *no* monetization could apply to the YouVersion Platform, which offers "licensed access to hundreds of trusted Bible translations, including the NIV". Its rules are strict: apps must "Be free to the end user", "Not include advertising, sponsorships, or other monetization", and "Scripture may not be used in a way that enables revenue generation, directly or indirectly". Also, "Bible texts are not automatically accessible through Platform, the Publisher must opt in" ([youversion.com/platform](https://www.youversion.com/platform), read by me). Whether SBB or Biblica opted in their Portuguese texts is **UNVERIFIED** (the catalogue needs a developer account). This is a real strategic choice: **a ministry model with licensed texts for free, or a business model that pays for licences** (§12, Q1).

---

## 7. Differentiating bets

Each bet lists the user value, the evidence, feasibility on Expo SDK 57 / RN 0.86, effort (S ≈ days, M ≈ 1–3 weeks, L ≈ 1–3 months for one developer), risks, the metric that proves it, and how it fits the brand. Work already specified in today's notes is referenced by ID, not repeated. Domain terms follow `CONTEXT.md` (Verse, Recitation, Verification, Diff Token, Blind Recitation, Topical Pack, Quiet-Time Reminder). New terms are proposed in **bold italics**.

### 7.1 Verification you can trust, in Brazilian Portuguese ("Conferência confiável")

- **User value.** "I said it right and it marked me right." This is the single most repeated complaint about every voice competitor (§4.3 A), including the paid market leader (§2.3).
- **What is new here** (beyond the October note's #1, #9, V1–V8, C2 and C8):
  1. **A Brazilian recitation corpus, built as a product asset.** V8 proposed 50–100 clips. To be the best in Portuguese, grow it to a few thousand consented clips: every region (North and Centre-West have the densest evangelical populations, §5.1), ages 15–70, phones from entry Androids to iPhones, and quiet rooms, cars, buses and church halls. Include *misrecitations on purpose* (skipped clause, synonym, ARC-vs-ARA wording) so the false-pass rate is measured too.
  2. **Publish the number.** A "Como conferimos" page: word-level agreement with human judges and the false-fail rate, per engine (on-device iOS, on-device Android, cloud). Nobody in the category publishes one (§3, row 4).
  3. **Grade the spoken reference instead of punishing it.** Andrew Davis: "it is well worth the extra effort to memorize the verse numbers as if they were part of each verse" (p. 15). The Navigators: "say the topic, reference, verse, and then the reference again out loud" ([Navigators PDF](https://www.navigators.org/wp-content/uploads/2021/02/navigators-how-to-memorize-scripture.pdf), p. 2). Today a spoken reference counts as `added` Diff Tokens and can fail a perfect "Jesus wept." (October note A3). **Product rule:** detect a reference at the start or end, score it as its own ***Reference Recall*** result, and keep it out of the verse's word score. This answers the October note's open question 6.
  4. **Archaic and proper-noun vocabulary lists in Portuguese.** The incumbent's most detailed 1★ review asks the recognizer to "use that vocabulary. Let it even favor it" (§2.3). Use per-verse proper nouns and archaic forms (ARC: *vós*, *haveis*, *Jeová*) as biasing hints only. Never pass the whole verse, which would mask real slips (October note V3).
- **Evidence for the data sources.** Common Voice Portuguese v27 is CC0 with 188.84 validated hours, and MLS Portuguese is CC BY 4.0. Both are fine for general engine checks, but neither contains recited scripture. CORAA is CC BY-NC-ND, so it cannot be used commercially (market sub-agent, [Common Voice](https://mozilladatacollective.com/datasets/cmu5wui2w00e8nq07idithpm6), [MLS](https://www.openslr.org/94/), [CORAA](https://github.com/nilc-nlp/CORAA)). No open-licensed Portuguese read-Bible audio was found. **The corpus has to be collected**, which is exactly why it is a moat (§8).
- **Feasibility.** No native work beyond V1–V3. Collection needs a consent flow, a short retention policy and a storage bucket behind the S1 proxy.
- **Effort:** M (tooling) plus ongoing operations.
- **Risks.**
  - Recordings of recited scripture plus a voice are sensitive data under LGPD (Art. 5 II, Art. 11; October note §3.4). Use explicit, separate consent and delete-on-request. Exclude minors.
  - Leniency hides real slips. Measure the false-pass rate as well.
- **Metric:** ≥ 97% word agreement and < 2% false fails on the held-out set; fewer "contestar" overrides (C8) per 100 recitations.
- **Brand fit.** This is the reverent version of "accuracy": *we listen carefully*. Use "conferir" in copy, never "nota" or "pontuação".

### 7.2 The Bible Brazilians actually memorize ("A Bíblia da sua igreja")

- **User value.** Recite the wording you hear on Sunday. A familiar verse in an unfamiliar translation fails in Blind Recitation because people produce the wording they know (onboarding note §6.4).
- **Evidence.**
  - SBB's own listing maps translations to churches. ARC 2009 is the Assembleia de Deus Bible; ARA 1993 serves Presbyterians, Baptists, Methodists, Lutherans and Adventists; ARC 1969 serves CCB, Deus é Amor and Maranata (§5.1).
  - The Bible Memory App chose **NVI-PT** for its Portuguese entry (§2.1).
  - Brazilian reviewers ask for exactly this: "coloquem traduções brasileiras por favor" (§4.3 B).
  - NVI's printed copyright page allows quoting "sem que passe de quinhentos (500) versículos e sem a necessidade de permissão por escrito do editor", within limits ([Mundo Cristão NVI edition, p. 4](https://www.mundocristao.com.br/wp-content/uploads/2023/08/Biblia-365-NVI.pdf), read by me). That covers a share card or a curated collection, **not** an app that fetches any verse on demand. That needs a licence from Biblica Brasil.
  - SBB enforces its rights: its EULA forbids commercial use without written permission (October note §6.1). A secondary source reports SBB refused the SWORD project (**secondary, unverified**).
- **The play.**
  1. **Now:** ship open texts honestly labelled (BLIVRE, the full ONBV), as in October note L1–L3.
  2. **In parallel,** approach **Biblica Brasil** (NVI) and **SBB** (ARC/ARA/NAA). SBB's own app has 3.58★ from 31 iOS ratings and 3,8★ / 50 mil+ on Play, and its listing describes **no memorization feature** (read by me). Offering memorization *for SBB's texts* is a partnership pitch, not only a licence request (*speculative*).
  3. Handle **interference** explicitly. When a user's Blind Recitation matches another translation's wording, say so ("Você recitou como na ARC") instead of marking the words as missed. This is a pure diff-side feature: compare against an alternate text the app holds.
- **Feasibility.** The `BibleProvider` seam exists (ADR 0007). Licensed texts may come with DRM, refresh and TTS limits ("AI driven text-to-speech are not allowed for copyright content without prior written consent", API.Bible terms, October note §6.1). For those texts, Echo Mode can use the learner's own recorded voice instead of TTS.
- **Effort:** S (open texts) to L (business negotiation).
- **Risks:** cost (§6.3: one licence will dominate costs); refusal; terms that forbid offline use.
- **Metric:**
  - Share of Brazilian users reciting in their church's translation.
  - First-attempt Blind pass rate on "familiar" verses (Sl 23:1, Jo 3:16) before and after.
- **Brand fit.** Neutral across denominations. The app serves *your* church's Bible and does not pick a side.

### 7.3 Church, célula and Sunday-school plans ("Plano da igreja")

- **User value.** Memorize *together*: the célula's verse of the week, the EBD lesson's golden verse, a church-wide passage for the year.
- **Evidence.**
  - Users ask for group accountability (§4.3 G).
  - The leader's market already exists:
    - The Bible Memory App's 2026 Church Memory Challenge offers plan types "One verse per week / Memorize a passage together / Monthly verse for all ages / Sermon series memory plan" ([page](https://biblememory.com/church-memory-challenge), first-party).
    - It sells bulk licences: "20% OFF 1+ … 30% OFF 10+ … 40% OFF 50+" ([page](https://biblememory.com/bulk-licenses)).
  - Three first-party privacy models exist:
    - **Bible Memory App:** leaders "see every clubber's progress" ([/awana](https://biblememory.com/awana)).
    - **Remember Me:** "All metrics are aggregate and anonymous. You cannot see individual participant progress, names, or activity." ([campaigns](https://www.remem.me/docs/guides/campaigns/))
    - **YouVersion:** "Anonymous, aggregated data … Available once five or more people tap 'Set As My Church'" ([churches](https://www.youversion.com/churches)).
  - Brazilian programmes already have a weekly memory verse:
    - **CPAD Lições Bíblicas:** every adult lesson has a "TEXTO ÁUREO" (example: Lição 1, 4 Oct 2026, Dt 1.8). Children's editions have "PARA MEMORIZAR" and "MEMORIZANDO" sections. The teacher app has 500 mil+ downloads. *Which translation the adult lessons use is not stated by CPAD.* ([CPAD](https://www.cpad.com.br/revista-licoes-biblica-professor-4-tri-955004/p))
    - **OANSE:** "Os Flamas aprendem cerca de 100 versículos Bíblicos por ano".
    - **APEC's Clube de Boas Novas** includes "memorização de versículos".
    - **Embaixadores do Rei** requires a memorized verse to advance a rank.
    - Sources: features sub-agent, first-party pages.
  - 579 thousand religious establishments (§5.1).
- **The play.**
  1. **v1, no accounts (extends October C7 and P1).** A plan is a deck link with a start date and weekly cadence. It shows a QR for the church screen and shares to WhatsApp with a card (§7.8). Each member's progress stays on their phone.
  2. **v2, opt-in sync plus leader view: aggregate-only, k ≥ 5.** Show collection progress, the "most difficult verses" and weekly activity, never names. This matches YouVersion and Remember Me and suits LGPD's sensitive-data status for religious practice. It deliberately rejects the Bible Memory App's per-member tracking.
  3. **Celebrate the group, not individuals.** "Nossa célula guardou 12 versículos este mês". No individual leaderboards. Bible Loop's weekly leaderboard is the opposite of the brand, and individual ranking is risky for minors (§7.6).
- **Feasibility.** v1 is client-only (deck sharing exists). v2 needs accounts, a database and in-app account deletion (Apple 5.1.1(v); onboarding note §3.5): an ADR-level change to ADR 0002.
- **Effort:** M (v1), L (v2).
- **Risks:**
  - Denominational neutrality (plans are user-created, so this is fine).
  - Redistributing copyrighted text in plan links: share references, and let each member's app fetch the text (October note C7 risk).
  - Moderation of public plans.
- **Metric:**
  - Churches with ≥ 5 active members on a plan.
  - Joins per shared plan link.
  - D30 return of plan members vs solo users.
- **Brand fit.** A ***Church Plan*** (Plano da igreja), not a "challenge". Use the pt-BR glossary from the onboarding note (Q5).

### 7.4 Passages, chapters and whole books ("Capítulos inteiros")

- **User value.** Keep a passage together, and build it day by day until a chapter, then a book, is "hidden in the heart".
- **Evidence.**
  - Users: "I have mastered psalm 95:7-10, but if I do them all perfectly except v8, then they will be forever out of sync" (Bible Memory App, §4.3 E). Lantern's "Speak the Passage" is praised as "unlike anything that other bible memory apps offer" (§4.3 D).
  - **Andrew M. Davis's method**, from his own booklet (archived 2015 PDF, [Wayback](https://web.archive.org/web/20151106163741/http://www.fbcdurham.org/wp-content/uploads/2015/07/Scripture-Memory-Booklet-for-Publication-Website-Layout.pdf); PDF page numbers):
    - "Perhaps you can start at one verse per day, six days per week." (p. 14)
    - Day 1: "Read Ephesians 1:1 out loud ten times … Then cover the page and recite it ten times." (p. 16)
    - From day 3: "Recite yesterday's verse … ten times", then "Recite Ephesians 1:1-2 together once", then the new verse. (p. 16)
    - "Always give priority in your mind to the retaining of old verses even over the learning of new ones." (p. 15)
    - "recite the entire book from memory for one hundred consecutive days … while in the shower, while driving, while washing dishes" (p. 18). Then "stick the book in a slot (Monday morning, let's say), and recite on Monday morning for the rest of your life." (p. 19)
    - For long books: "Limit the amount of time you spend on the 'old verses altogether' stage to fifteen or twenty minutes." (p. 20)
  - Rubin 1977: recall of passages runs in chained units bounded by breath pauses (SRS note §6). Tom Meyer keeps "eight words or less on each line … an eye's glance" ([his article](https://www.christianpost.com/voices/how-to-memorize-scripture.html)). The Navigators: "continue to add each additional phrase, one by one" (Navigators PDF, p. 2).
- **The play: a *Book Programme* (Programa de livro) that encodes Davis in the scheduler.**
  1. **Daily new verse:** Echo with the text shown, read aloud (Level 1), then Blind ×N (Level 3). N is adaptive, not a fixed 10, because the grade replaces counting.
  2. **Yesterday's verse:** Blind recitation.
  3. **"Old verses together":** one chained recitation in segments, capped at 15–20 minutes as Davis advises. Use per-chunk Verification (SRS note §7.3; October D2/D3) so a stall in verse 5 doesn't fail verses 6–40.
  4. **A 100-day "consolidation" phase**, then a weekly "slot" (for example, Monday morning), which the Quiet-Time Reminder can honour.
  5. **A built-in weekly rest day** ("one day off per week so you don't get burned out", p. 14).
  6. **Line breaks at breath or clause boundaries, ≤ 8 words,** in Echo and Cloze. *Speculative:* learn each user's breath points from the VAD's pauses (October note §3.3).
- **Feasibility.** No native work. It needs a ***Passage*** aggregate in `VerseEngine`, chunked diffing and recitation segments under the 300 s ceiling (October note D2/D3, C5), and FSRS for early-review credit (SRS note §7.3, L4).
- **Effort:** L.
- **Risks:**
  - Chained scheduling is unproven (SRS note says "speculative; validate with logs").
  - Long sessions push cloud cost, so default to on-device (§6.3).
- **Metric:**
  - Programme starts → day 30 → day 100 completion.
  - Share of chunks within the error budget at day 100 and day 180.
- **Brand fit.** "Programa", not "desafio". It is the most "serious disciple" feature in the category, and it is copy-proof in practice because it depends on grading quality (§7.1).

### 7.5 Hands-free, eyes-free and readable by everyone ("Modo caminhada" and accessibility)

- **User value.** Review while walking, driving or washing dishes (Davis, p. 18). Use the app without seeing the screen or reading well.
- **Evidence.**
  - INAF 2024: 29% of Brazilians aged 15–64 are functionally illiterate, 51% among ages 50–64 (secondary for the age split; §5.2).
  - A blind Versify user: "The games are unplayable" (§3).
  - Apple's Accessibility Nutrition Labels (iOS 26) are "voluntary to start", but "over time, you'll be required to share accessibility support details", and labelled apps "will be considered more relevant in search results" ([Apple](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/), features sub-agent).
  - Two of Apple's criteria fit a voice app directly:
    - Voice Control: "ensure users can start and stop the recording using only their voice".
    - Captions: "text transcripts of audio-only content".
  - Google Play has only optional accessibility tags.
  - Apple's 2025 Inclusivity winner, Speechify, was praised as "a vital resource for people with dyslexia, ADHD, and low vision, as well as anyone who learns best by listening" ([Apple Newsroom](https://www.apple.com/newsroom/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/)).
  - **Do not ship a "dyslexia font."** OpenDyslexic showed "no improvement in reading rate or accuracy" (Wery & Diliberto 2017, [doi:10.1007/s11881-016-0127-1](https://doi.org/10.1007/s11881-016-0127-1)). Offer large text, spacing and listening instead.
- **The play.**
  1. The October note's hands-free loop (C4, then P8) as ***Modo caminhada***.
  2. **Spoken feedback by default in that mode**: "Faltou: 'e a luz para o meu caminho'", then the corrective replay (M6).
  3. Full VoiceOver/TalkBack flows (P6), with one design problem to solve: **the screen reader's own speech must not be captured as the recitation.** Announce, wait for speech to end, then listen; earbuds recommended (*inference*).
  4. Declare the Apple labels that are honestly met.
- **Feasibility.** RN 0.86 has `announceForAccessibility` and `isReduceMotionEnabled` (October note §4.1). Screen-off review needs the background-recording work in P8 (Android microphone foreground-service rules).
- **Effort:** M (screen-on loop and accessibility pass), L (screen-off).
- **Risks:**
  - Use while driving (keep it voice-only; no reading required; notification note Q3).
  - Mis-captured TTS.
- **Metric:**
  - Share of sessions completed without touching the screen.
  - Moderated test completion with blind and low-literacy participants.
  - Labels declared.
- **Brand fit.** Quiet audio and a single bell-like cue. It is the contemplative version of "hands-free".

### 7.6 Family and children ("Família"): later, and legally gated

- **User value.** Parents teach children verses, and EBD and clubs ask children to memorize weekly (§7.3).
- **Evidence and constraints.**
  - Bible Memory Kids averages 3.31★ over 51 reviews (§4.3 H). Awana has no current app and no published licensing route for third parties; its name "may only be used by churches or organizations that are actively using Awana program materials" ([Awana copyright](https://www.awana.org/copyright-information/)). Awana Brasil reports "mais de 12.446 crianças … em 233 igrejas" (archived page).
  - **ECA Digital (Lei 15.211/2025) is in force since 17 March 2026** and covers services "de acesso provável" by children ([Lei 15.211](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm)). It requires:
    - the most protective configuration by default (Art. 7);
    - defaults "que evitem o uso compulsivo" (Art. 8 IV);
    - default limits on "recompensas pelo tempo de uso, notificações" (Art. 17 §4º II);
    - the ability to disable non-essential AI features (Art. 17 §4º VIII).
  - **Decreto 12.880/2026, Art. 9** (read by me) lists as compulsive-use mechanisms: "III - a oferta de recompensas pelo tempo de uso; e IV - o aparecimento de notificações excessivas" ([Decreto](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/D12880.htm)).
  - LGPD Art. 14 §1º requires consent from a parent for a child's data.
  - Decreto Art. 22 exempts editorially controlled "literário" content providers from age verification, *if* they offer child profiles and parental supervision. **Whether a scripture app qualifies is our reading, not a ruling.**
- **The play.**
  - A ***Family Mode*** on the parent's phone: the parent's device listens to the child reciting, with no child account, no cloud processing of child audio, no streak rewards and no reminders addressed to the child.
  - Short verses, songs later (Fighter Verses has songs; music licensing is separate).
  - Avoid any Awana branding. The Bible Memory App's approach ("not affiliated with or endorsed by Awana"; churches enter their own club verses) is the only precedent.
- **Consequence for the adult product.** If youth groups or EBD make child use "provável", default limits on streak rewards and reminders apply to those users. The SRS note's proposal to retire the per-verse streak (§7.4 there) then becomes **a compliance aid, not just UX**.
- **Feasibility.** Client-side profiles in local storage; no native work.
- **Effort:** M, plus legal review.
- **Risks:** regulatory interpretation; ANPD enforcement (fines up to 10% of Brazilian revenue, capped at R$ 50M per infraction, Art. 35).
- **Metric:**
  - Family sessions per week.
  - Parent-reported verses learned.
  - Zero complaints and zero regulatory findings.
- **Brand fit.** Gentle and parent-led, which is exactly the "zero gaudy gamification" stance of PRODUCT.md.

### 7.7 Meditation and understanding, without putting AI in charge ("Entender o versículo")

- **User value.** Know what the verse means and where it sits, then pray it. Memorization without meaning was an old critique ("Flashcards rip verses out of context", workspace market note).
- **Evidence: how the leaders handle AI (first-party).**
  - **YouVersion:** "We do not, however, use AI to generate new, AI-created content. … The Biblical text in the Bible App will always be original and unchanged." ([privacy policy, archived 2026-10-06](https://web.archive.org/web/20261006130517/https://www.bible.com/privacy)) Its Platform terms bar developers from using the tools "with any AI Technology to engage in open-ended chat with a User" ([platform terms](https://platform.youversion.com/terms)).
  - **Hallow:** "All prayer content on Hallow is and will continue to be created by a human being" ([blog](https://hallow.com/blog/thoughts-on-ai/)); AI is "clearly labeled with an 'AI' tag"; it "cannot provide spiritual direction, hear confessions or write prayers" ([Hallow AI](https://hallow.com/blog/hallow-ai/)). Users in other languages "continue to see Magisterium AI instead" ([FAQ](https://help.hallow.com/en/articles/13601993-hallow-ai-faq)).
  - **Logos:** "we look up each verse in the Bible you've specified to ensure that you can be confident that the text on screen is precisely what the Bible says"; "All AI tools are marked with a sparkle icon" ([Logos](https://support.logos.com/hc/en-us/articles/35181728416397-How-Logos-uses-AI)).
  - **Bible Memory App:** "Bible Intelligence" uses an LLM ([bulletin 4124](https://biblememory.com/bulletin/4124)). No guardrails are described, and a Mexican user says it only generates English (§2.1).
  - **ERLC (2019):** "We deny that humans can or should cede our moral accountability or responsibilities to any form of AI" (archived, features sub-agent).
  - All quotes via the features sub-agent.
- **Position (*inference*).**
  1. **v1 has no generative text at all.** After a successful Blind Recitation, show:
     - cross-references from OpenBible.info: "About 340,000 cross references", "draws primarily from public-domain sources, especially the Treasury of Scripture Knowledge", licensed CC BY ([OpenBible](https://www.openbible.info/labs/cross-references/), read by me). They are references only, so they work with any translation, including pt-BR.
     - a short context note and one meditation question for the top ~500 verses, **written and reviewed by people** (pastors or seminary students, credited).
  2. **v2 (optional):** drafts may be *batch-generated offline* by an LLM, then reviewed by people, labelled "rascunho revisado por …", and shipped as static content.
     - No chat.
     - No AI-written prayers.
     - Never AI-produced Scripture text: verse text always comes from the licensed or open source.
     - Never in Verification (ADR 0001).
     - Users can switch it off (ECA Digital Art. 17 §4º VIII).
  3. **Cost:** static content means near-zero marginal cost. No LLM price is quoted here because none was verified in this pass.
- **Feasibility.** Static JSON assets; no native work.
- **Effort:** M (content operations, not code).
- **Risks:**
  - Doctrinal disputes: keep notes historical and contextual, not denominational.
  - Volunteer content quality.
- **Metric:**
  - Share of recitations followed by "Meditar".
  - Reported theological errors (target 0).
  - Trust survey.
- **Brand fit.** It completes the "memorize, meditate, recite" promise of PRODUCT.md, and it makes "sem IA inventando texto bíblico" a selling point in Portuguese, where the leader's AI does not even speak the language.

### 7.8 WhatsApp-native sharing ("Compartilhar")

- **User value.** Share a verse you have learned, invite your célula to a plan, put the church's verse of the week on a screen.
- **Evidence.**
  - CETIC.br TIC Domicílios 2025: 92% of internet users "Mandou mensagens instantâneas" ([C5](https://cetic.br/pt/tics/domicilios/2025/individuos/C5/)).
  - WhatsApp's developer docs describe a share extension (iOS) and the standard `ACTION_SEND` intent (Android). **No API posts to Status.** The user picks "My Status" in the share sheet (reported by the press only; WhatsApp FAQs, features sub-agent).
  - Instagram Stories sharing needs a Facebook App ID: "Beginning in January 2023, you must provide a Facebook AppID to share content to Instagram Stories" ([Meta](https://developers.facebook.com/documentation/instagram-platform/sharing-to-stories)).
  - WhatsApp Business API reminders were already rejected on cost (notification note §3.9).
- **The play.**
  1. Status-sized (9:16) **share cards**: verse, reference, translation credit and a quiet line such as "Guardei esta Palavra no coração". Optionally, "Recitei de cor e conferi palavra por palavra" for users who want it.
  2. **Plan and deck links** (P1) and **QR** for church screens.
  3. Rendered on-device with a view-capture library (Expo documents `react-native-view-shot` for SDK 57, [docs](https://docs.expo.dev/versions/v57.0.0/sdk/captureRef/)) and passed to the RN `Share` API.
- **Feasibility:** S–M; Universal and App Links need the domain (P1, notification note Q).
- **Risks:**
  - Text licensing on images: an NVI single-verse image is within the 500-verse quotation rule with "NVI" credit; SBB texts need permission.
  - Boastful tone: keep the score off the card by default.
- **Metric:**
  - Installs per 100 shares.
  - Share of plan joins arriving from WhatsApp.
- **Brand fit:** parchment-style card, serif type, no badges.

### 7.9 Privacy as a promise ("Seus versículos são seus")

- **User value.** What I memorize and how I pray is mine.
- **Evidence.**
  - LGPD classes religious conviction as sensitive data (October note §3.4).
  - Engraved and ReciteWell sell on-device privacy (onboarding note §5).
  - The Bible Memory App requires an account and syncs everything (§2).
  - Users push back on forced sign-up (§4.3 F).
  - Apple's 2026 Delight and Fun winner grug was praised for "no login, no cloud syncing, nothing extraneous" ([Apple Design Awards](https://developer.apple.com/design/awards/)).
- **The play.**
  - Turn the October note's S1–S4 and the onboarding note's §6.3 into a public, plain-language **Compromisso de privacidade**:
    - on-device by default;
    - no ads ever;
    - no account to start;
    - cloud only with consent;
    - telemetry opt-in;
    - Bible references never sent to analytics.
  - Aim for an App Store privacy label of "Data Not Collected" for the core loop.
- **Effort:** S on top of S1–S4.
- **Metric:**
  - Privacy-label category.
  - Share of users choosing cloud consent.
  - Zero LGPD complaints.
- **Brand fit:** it *is* the brand. Quiet, private, reverent.

### 7.10 Craft that wins awards ("Silêncio, som e tipografia")

- **Evidence from award winners** (Apple Design Awards 2024–2026, Google Play Best of 2024–2025; features sub-agent):
  - **One simple core idea.** Google's 2024 theme: "the beauty of simplicity, highlighting apps that excel in their core function".
  - **Gentle motivation without comparison.** Gentler Streak: "emphasizing the focus on individual progression rather than comparison against others".
  - **Sound as craft.** CapWords: "each flash card transition is accompanied by a real-world sound … (and helps the word stick)".
  - **Accessibility named explicitly.** Speechify and Guitar Wiz.
  - **No faith or memorization app has won or been a finalist in 2024–2026.** The category is open.
  - In Brazil, Google's "Melhor para Crescimento Pessoal" went to Disciplined (2024) and Fit Path (2025).
- **The play.**
  - A **single soft listening cue** (a bell) and a completion tone for eyes-free mode.
  - Settle haptics with one light tick *before* recording starts (October note P4; iOS mutes haptics while dictation is active).
  - **Bundle a serif** with full Portuguese diacritics instead of system Georgia/`serif`, so scripture renders the same on every Android. Literata is OFL on Google Fonts (license file read by me).
  - Breath-unit line breaks (§7.4).
  - Dark Sanctuary theme (P5).
  - Then **apply**: Apple Design Awards (Inclusivity / Social Impact) and Google Play Best of Brazil (Personal Growth).
- **Effort:** S–M.
- **Metric:**
  - Rating ≥ 4.8.
  - Editorial featuring in BR.
  - Award shortlist.
- **Brand fit:** DESIGN.md's "printed beauty of an open Bible", made audible.

### 7.11 Bolder ideas (speculative, labelled)

1. ***Prayer-partner mode* (Modo dupla).** One phone, two people: the partner holds the phone and sees the Diff Tokens while the other recites. It digitizes the oldest method of all ("My wife has refused for years to help me with reviewing my verses", §2.3) and fits the Navigators' "In just ten minutes you can give each other enough accountability" (Navigators PDF, p. 2). Effort S. Nobody ships it (October note: "No primary source showed … a 1:1 memory-partner feature").
2. ***Stumble map* (Mapa de tropeços).** With opt-in, aggregated review logs show where people tend to stall in each verse. That informs the cloze targets and the church plan's "most difficult verses" view. It is a data moat (§8).
3. **A verified recall counter.** The incumbent's counter shows "26,868,107 Verses Memorized", self-reported. A public "versículos confirmados de cor após 6 meses" counter would be a stronger and more honest number (§3, row 3).
4. **Offline as a headline.** "Funciona sem internet e sem gastar seu pacote", because 64 million Brazilians ran out of data in three months (§5.2).
5. **A partnership with SBB or Biblica Brasil** (see §7.2): their texts and human audio narration, our memorization.

---

## 8. Moats and defensibility

| Moat | Why it is hard to copy | How to build it | Strength (*inference*) |
|---|---|---|---|
| **pt-BR Verification quality** | Needs a consented corpus of *recited Brazilian scripture*. No open dataset contains it (§7.1), and the incumbents' own users say their grading is poor in English (§2.3, §4.3 A). Tolerance tables (clitics, contractions, archaic ARC forms, numerals) are slow, local craft work. | Corpus v1 → v2 (§9), published accuracy, per-device tuning | **Strong**, for 12–24 months |
| **Church network effects** | A church running a year-long Plano da igreja does not switch mid-plan. Leaders bring members, and members bring their célula. | Plan v1 (no account) → v2 (aggregate leader view), CPAD/EBD and club hooks | **Strong if reached.** Weak until about 100 churches. |
| **Translation catalogue** | Contracts with SBB or Biblica Brasil take months and relationships. SBB is protective (§7.2). | Start the conversations in Q4 2026, offering partnership, not only purchase | **Medium.** Not exclusive (the Bible Memory App already has NVI-PT). |
| **The forgetting dataset** | Opt-in review logs (SRS note §7.7) give verse-level difficulty and "stumble maps". These improve scheduling (FSRS app-wide parameters, SRS note L1) and leader insights, and they grow with use. | M1/N1 now; opt-in upload with LGPD consent later | **Medium**, compounding |
| **Cost and privacy architecture** | On-device recognition makes free voice cost US$ 0 at the margin (§6.3). An account-centric incumbent that *sells* voice would have to cannibalize revenue and re-architect to match "free, private, no login" (*inference*). | Keep on-device the default; cloud as a capped upgrade | **Medium** |
| **Portuguese-native brand** | Native copy, denominational neutrality and church trust take years. The incumbent's BR description is machine-sounding European Portuguese (§2.1). | Native writing, Brazilian reviewers, local partnerships | **Medium** |

**Not moats:** individual features (all copyable), price (the Bible Memory App cut its Spanish price to about 30% of English, §2.2), and open texts (anyone can bundle BLIVRE).

---

## 9. 12-month roadmap (Q4 2026 → Q3 2027)

**Foundation, not repeated here.** These must ship first and are specified in today's notes:
- October note #1–#12, including the two release blockers: #5 (replace the bundled ALMEIDA text) and #7 (server proxy and key rotation).
- SRS note N1–N7.
- Notification note R1–R5.
- Onboarding note stages 0–3.

The items below are what this note **adds** on top.

| Quarter | Theme | New work (this note) | Gate to the next quarter |
|---|---|---|---|
| **Q4 2026** (Oct–Dec) | Trustworthy core, in Portuguese | **Measure first:** buy the Bible Memory App's PRO Yearly (R$ 49,90) and test pt-BR voice hands-on; test MemoryVerses, Lantern and Ilum (§4.2). **Corpus v1:** about 300 consented clips from 30 volunteers in 3 regions (§7.1). **Grading:** Reference Recall (§7.1, item 3). **Licensing:** outreach to Biblica Brasil and SBB (§7.2). **Business:** decide the app name and publish from a CNPJ (§6.1). **Launch:** Android-first public launch in Brazil, with native pt-BR store listing and Play Pix. **Privacy:** the Compromisso de privacidade page (§7.9). | False-fail < 5% on corpus v1; crash-free sessions ≥ 99.5%; D1/D7 baseline measured; ≥ 100 BR ratings at ≥ 4.6★ |
| **Q1 2027** | Together and hands-free | Plano da igreja v1, no accounts (§7.3); WhatsApp share cards and QR (§7.8); Modo caminhada, screen-on (October C4, after E-R2); accessibility pass (P6) and Apple Accessibility Nutrition Labels (§7.5); FSRS shadow mode (SRS X1–X3); corpus v2 (≥ 1,000 clips) and a published "Como conferimos" page | ≥ 20 churches with ≥ 5 active members; ≥ 97% agreement / < 2% false fails; ≥ 80% eyes-free completion in moderated tests |
| **Q2 2027** | Depth | Book Programme v1, Davis-style (§7.4); FSRS cut-over if calibrated (SRS X4–X6); meditation layer v1 with cross-references and human notes for the top 100 verses (§7.7); opt-in sync and accounts (new ADR amending ADR 0002) → Plano da igreja v2 with aggregate-only leader view, k ≥ 5; Pro / Apoiador launch with price experiments (§6.4). **A licensed text goes live only after a signed contract; no marketing before.** | Programme day-30 completion baseline; observed retention within ±3 points of target; paid conversion ≥ 1.5% (covers cloud, §6.3); ≥ 1,000 BR App Store ratings |
| **Q3 2027** | Spanish, family and craft | es-419 launch: RV1909 plus an open modern text, an es corpus, Spanish tolerance rules, LatAm price ≤ US$ 14.99/yr (§5.4); Family Mode **after** a legal opinion on ECA Digital (§7.6); screen-off hands-free (P8) and Live Activity (notification note "Later"); award submissions (§7.10) | es false-fail < 3%; legal sign-off on Family Mode; rating ≥ 4.8 on both stores |

**Contingency: if the Bible Memory App ships Portuguese voice, or Bible Loop launches in Portuguese.**
- Pull Plano da igreja v1 and the licensing work forward.
- Lead with what they cannot match quickly: free voice, privacy with no login, and *published* Brazilian grading accuracy.
- Run and publish a fair head-to-head on the corpus.

---

## 10. Risks: what could make us lose

| # | Risk | Likelihood | Impact | Early signal | Mitigation |
|---|---|---|---|---|---|
| 1 | **The Bible Memory App goes Portuguese**: pt plan, pt store copy, voice in pt | **High.** Precedent: UI in 17 languages (May 2026), NVI-PT (Sep 2026), and a Spanish Unlimited plan at about 30% of the English price already live in the stores (§2) | High | A "Unlimited em português" IAP on App Store BR; new pt-BR description | Speed; church network; grading quality; free voice (§9 contingency) |
| 2 | **YouVersion localizes Bible Loop or adds voice to Lite** | Medium | **Very high.** YouVersion has "nearly 100 million installs" in Brazil (first-party, Oct 2026) and 1.56M App Store BR ratings | Bible Loop in pt; a "fale o versículo" feature in Lite | Depth they don't do (scheduling, passages, church plans with memory); privacy; consider complementing YouVersion (YouVersion login and Platform) if the ministry model is chosen |
| 3 | **YouVersion Platform enables free ministry competitors** with licensed texts | Medium | Medium | New free pt memory apps showing NVI or ARA | Grading quality and corpus; church relationships |
| 4 | **Licensing fails or is too costly** (SBB, Biblica) | Medium | High | No reply or prohibitive terms within 6 months | Open texts plus interference handling (§7.2); a partnership pitch; NVT via API.Bible as fallback (October note L6) |
| 5 | **Recognition quality on entry Androids** (Android ≤ 12 is ≥ 14% of devices; pt-BR on-device availability varies) | Medium | High | Rising "infra failure" and false-fail rates by device in the logs | Corpus by device class; capped cloud fallback; never grade infrastructure failures (October V1/V2) |
| 6 | **Cost blow-up or abuse**: keys in the bundle; 500/day ceiling = US$ 2.50 per install-month | Medium (until S1 ships) | Medium | Unexplained cloud spend | S1 proxy, server-side caps, lower free cloud cap (§6.3) |
| 7 | **Vendor and platform uncertainty**: Groq pricing seen only via Wayback; SpeechTranscriber's pt-BR support unpublished; Google's new fee model reaches Brazil by 2027-09-30 | Medium | Low–Medium | Price-page changes | Multi-vendor seam (ADR 0006); re-verify prices quarterly |
| 8 | **Regulation**: LGPD sensitive data; ECA Digital enforcement (fines up to R$ 50M per infraction); Apple 5.1.2(i) disclosure for third-party AI | Low–Medium | High | ANPD guidance updates | On-device default, consent flows (S2), Family Mode only after counsel; no rewards-for-time or excessive notifications for minors |
| 9 | **Store-policy friction**: background microphone and foreground-service rules (P8); minors and link-out rules in Brazil's new payment terms (§6.1) | Medium | Medium | Review rejections | Screen-on first; Apple IAP only for under-18s |
| 10 | **Theological trust**: an AI text, a grading error on a sacred word, or perceived denominational bias | Low | High | Social-media complaints | No generative text in v1; human-reviewed content; translation-neutral plans (§7.7) |
| 11 | **Doing too much** with a small team | High | High | Roadmap slips | The sequence in §9; each quarter has one theme and one gate |

---

## 11. Corrections to today's notes

| # | Earlier claim (where) | What is true on 2026-10-09 (source) |
|---|---|---|
| 1 | The Bible Memory App's speech recognition is paid, "which tier is unconfirmed" (October note §5.1, §8 #2); the onboarding note says "paid Unlimited feature" | **Confirmed paid, in both tiers.** It is not in free "Lite" (comparison-table data), and Lite also caps users at 50 verses and shows ads. It was listed under PRO in Jan 2025 ([bulletin 4129](https://biblememory.com/bulletin/4129)) and under Unlimited in 2026. BR prices: PRO Yearly R$ 49,90; Unlimited R$ 299,90 (§2.2). |
| 2 | The incumbent is framed as English-first, with "NVI-PT added Sep 2026" (October note §1.2 #4, §5.1) | **Incomplete.** It also localized its UI into 17 languages (v9.2/9.3, May–Jun 2026), added BSB, NBLA, NVI-S, RVR09 and RST in v9.5, and launched "Unlimited en español" (US$ 14.99/yr; live in the ES, BR and MX stores) (§2.1). |
| 3 | "No app was found that scores spoken pt-BR against a Brazilian Bible" (October note §1.2 #4, §5.1; onboarding note §5 note 7) | **Holds only with qualifiers** (§4.2). MemoryVerses claims pt/es with a scored "Recite o Versículo" (unverified, 100+ installs). Generic memorizers grade speech against any pasted text (Memorize By Heart, 100K+ installs). |
| 4 | "No primary source showed a streak freeze or 1:1 memory-partner feature in any competitor" (October note §5.2) | **Half wrong.** Bible Loop (Life.Church) gives "3 Streak Freezes every week" ([help](https://help.youversion.com/l/en/article/54dm9fget9-streak-freezes)). No 1:1 partner feature was found. |
| 5 | YouVersion's memorization = Bible App Lite (October note §5.1, §8 #7) | **Incomplete.** The main Bible App has none, but Bible Loop (1M+ installs, English-only, no account) accepts *spoken* recitation at level 4 (§4.1). |
| 6 | "SRS backlog guilt" is the #1 churn driver; "over 60% of SRS dropouts" (`competitive-benchmarks-and-feature-opportunities.md` §3.3; workspace `02-market-research…` Pattern C, Opportunity #2) | **Not supported by review evidence.** It appears once in about 2,400 reviews (§4.3 I), and the incumbent has shipped a daily review limit since v8.4 (2025-06-06), with an option to disable it in v8.5. The October note already flagged "60%" as uncited (§8 #20). Keep catch-up as hygiene (M7, C6), not a headline bet. |
| 7 | YouVersion "700M+ downloads" (CB, MR; uncited per October note §8 #20) | First-party: "one billion device installs across its family of Bible apps" (Oct 2025), +160M in 2026, and "nearly 100 million installs" in Brazil ([YouVersion news](https://www.youversion.com/news/anxiety-hope-and-healing-youversion-reveals-what-brazilians-are-searching-for-in-the-bible-this-year), Oct 2026; features sub-agent). |
| 8 | Versify: 8 translations and only "basic speech recognition" (CB §2) | Translations now include BSB and LSV. A dictation-based speaking feature shipped ("THEY LISTENED!!! They have added a dictation feature", Jan 2026 review). |
| 9 | Verses: "no voice recitation" (MR §2) | It had a graded "Speak Out (Beta)" that drew about 20 negative reviews. Not updated since 2020-03-13 but still selling subscriptions (§4.1). |
| 10 | WhatsApp reach as "on the home screen of 64.8%" (notification note §3.9, secondary) | Primary alternative: CETIC.br TIC Domicílios 2025, 92% of internet users send instant messages ([C5](https://cetic.br/pt/tics/domicilios/2025/individuos/C5/)). |
| 11 | Licensing outreach: SBB, with Tyndale/NVT as fallback (October note L6) | **Add Biblica Brasil (NVI)**, the incumbent's Portuguese choice. NVI's 500-verse quotation allowance covers share cards and curated lists, not on-demand fetching (§7.2). |
| 12 | ADR 0015's 500/day cloud ceiling is cheap (October note §8 #18 confirms the per-recitation cost) | True per recitation, but the ceiling allows **US$ 2.50 per install-month** (§6.3). The free cloud cap should be lower and enforced server-side. |
| 13 | Bible Memory App Pro prices (CB: "$29.99/yr or $69.99"; MR: "$9.99/yr or $29.99 lifetime") | The October note fixed the US prices. BR prices are in §2.2. The web sells only Unlimited ($9.99/mo, $49.99/yr, $149.99 lifetime). |
| 14 | ReciteWell "$39.99/yr" (October note §5.2) | Correct, but it has not been updated since v1.0 (2026-03-05). OneNineteen is not sold in Brazil. |

The onboarding note's "Engraved and ReciteWell list English only" and the October note's "Remember Me … 1M+ Play installs" were **re-confirmed**.

---

## 12. Open questions for the product owner

1. **Ministry or business?** A fully free app with no monetization could use the YouVersion Platform's licensed texts, under its rule of "no subscriptions, purchases, or upgrades … advertising, sponsorships, or other monetization". A freemium business must license texts itself (§6.4). Which identity do you want?
2. **Publisher.** Will the app be published from a Brazilian CNPJ? That avoids cross-border withholding (CIDE 10%, IOF 3.5%, Google's 25%) and answers the October note's Q8 (§6.1).
3. **Which text to license first?** ARC 2009 (Assembleia de Deus), ARA 1993 (historic Protestant churches), NAA, or NVI (the incumbent's choice)? What budget? Should we pitch SBB a *partnership* (their texts and audio, our memorization)?
4. **Hands-on test.** May we buy the Bible Memory App's PRO Yearly (R$ 49,90) and test whether its voice works in Portuguese, plus MemoryVerses, Lantern and Ilum? This closes the last UNVERIFIED item in §2.
5. **Children.** Are children or EBD classes in scope? If so, we need a legal opinion on ECA Digital (Decreto 12.880 Art. 22's "literário" exemption) before Family Mode (§7.6).
6. **Free cloud cap.** Free cloud up to about 60 recitations/day, then on-device (§6.3–6.4)? Should long passages use cloud in the free tier?
7. **Accounts.** Leader dashboards and sync need accounts. When should ADR 0002 be amended (proposed: Q2 2027)?
8. **Leader privacy.** Is aggregate-only with k ≥ 5 acceptable to pastors who may want per-member tracking, as the Bible Memory App offers (§7.3)?
9. **Spoken references.** Grade the reference as its own result (proposed, §7.1) rather than ignore it?
10. **AI.** Do you accept "no generative text in v1", human-reviewed context only (§7.7)? Who reviews the content: a small theology council?
11. **Spanish timing.** Q3 2027, or only after pt-BR hits its gates?
12. **Corpus.** Who recruits the recitation volunteers (churches you know?), and what retention period should the consent promise (§7.1)?
13. **Pricing test.** R$ 9,90/mo vs R$ 59,90/yr, plus a donation option and church licences (§6.4)?

---

## 13. Sources

All accessed **2026-10-09** unless noted. *Sub-agent* rows were collected verbatim from the primary page by delegated research agents. Rows marked *re-checked* were fetched again by me. Prices, ratings and reviews change, so re-check them before quoting externally.

**The Bible Memory App (all read by me)**
- App Store lookup API: <https://itunes.apple.com/lookup?id=496790833&country=us> (also `br`, `mx`, `es`, `pt`)
- App Store pages: <https://apps.apple.com/us/app/the-bible-memory-app/id496790833>, <https://apps.apple.com/br/app/the-bible-memory-app/id496790833>, <https://apps.apple.com/mx/app/bible-memory/id496790833>, <https://apps.apple.com/es/app/bible-memory/id496790833>
- Reviews RSS: <https://itunes.apple.com/us/rss/customerreviews/page=1/id=496790833/sortby=mostrecent/json> (pages 1–3; also `br`, `mx`)
- Google Play: <https://play.google.com/store/apps/details?id=com.millennialsolutions.scripturetyper&hl=pt-BR&gl=BR>
- biblememory.com: <https://biblememory.com/>, <https://biblememory.com/pro>, <https://biblememory.com/app>, <https://biblememory.com/es/unlimited>, <https://biblememory.com/pages/iphone-app>, <https://biblememory.com/bulletin/4129>, <https://biblememory.com/bible-memory-groups>, <https://biblememory.com/bulk-licenses>, <https://biblememory.com/awana>, <https://biblememory.com/church-memory-challenge> (*sub-agent*), <https://biblememory.com/bulletin/4124> (*sub-agent*)

**Competitors and reviews** (*sub-agent* unless noted)
- Apple lookup API and App Store pages for: Verses 939461663, Remember Me 1600128209, Versify 1597230197, VerseLocker 1544933853, Fighter Verses 411711646, YouVersion 282935706, Bible Memory Kids 1418700508, Engraved 6791640543, ReciteWell 6759792785, OneNineteen 6774433572, Speak 6779264233, Bread 6757946016, Lantern 6760799408, MemoryVerses 6761134446, Yada 6785284874, VersoTranca 6740823561, Memorize By Heart 1436935583
- App Store review RSS pattern: `https://itunes.apple.com/<cc>/rss/customerreviews/page=<n>/id=<id>/sortby=mostrecent/json`
- Google Play listings: `org.bible.remember_me` (re-checked), `me.remem.app`, `com.tarkowr.versify`, `com.audioverse.smf.audioverse`, `com.fighterverses.android`, `com.sirma.mobile.bible.android`, `bzn.bible.memorise.verselock`, `com.lanternbible.app`, `com.memoryverses.app`, `com.efireapps.bibleme`, `com.memorize_by_heart`, `com.janus.memory`, `app.bible.daily.verses.video`
- YouVersion help (Bible Loop, Lite, streaks): <https://help.youversion.com/l/en/article/voabe8h9uq-memory-verse-levels>, <https://help.youversion.com/l/en/article/qgjz41tr8k-bible-loop>, <https://help.youversion.com/l/en/article/54dm9fget9-streak-freezes>, <https://help.youversion.com/l/en/article/h8owck8of7-verse-memorization>
- Bíblia SBB (read by me): <https://apps.apple.com/br/app/b%C3%ADblia-sbb/id1502745081>, <https://play.google.com/store/apps/details?id=org.ubs.ibep.brazil.sbb&hl=pt-BR&gl=BR>
- Remember Me: <https://www.remem.me/>, <https://www.remem.me/docs/guides/campaigns/>, <https://www.remem.me/pt/docs/audio/>

**Market and language** (*sub-agent* unless noted)
- IBGE Censo 2022 religion: <https://sidra.ibge.gov.br/tabela/9537> (API re-checked), <https://agenciadenoticias.ibge.gov.br/media/com_mediaibge/arquivos/3f1708b5d315aca50d5a7d8764469c45.pdf>
- IBGE CNEFE deck: <https://agenciadenoticias.ibge.gov.br/media/com_mediaibge/arquivos/1902352705220d57ced6e2992f1452f9.pdf>
- IBGE PNAD Contínua TIC: <https://sidra.ibge.gov.br/tabela/7373>, <https://sidra.ibge.gov.br/tabela/7337>, <https://sidra.ibge.gov.br/tabela/7325>, <https://sidra.ibge.gov.br/tabela/7305>
- INE Angola Censo 2024: <https://ine.gov.ao/Arquivos/arquivosCarregados/Carregados/Publicacao_638996687409619846.pdf>
- INE Moçambique 2017 (archived): <http://web.archive.org/web/20200511135310/http://www.ine.gov.mz/iv-rgph-2017/mocambique/03-religiao/quadro-11-populacao-por-religiao-segundo-area-de-residencia-idade-e-sexo-mocambique-2017.xlsx/at_download/file>
- Portugal Censos 2021 (secondary): <https://aliancaevangelica.pt/site/evangelicos-em-portugal-segundo-o-censos-2021/>
- Pew Research: <https://www.pewresearch.org/religion/2014/11/13/religion-in-latin-america/>, <https://www.pewresearch.org/religion/feature/religious-composition-by-country-2010-2020/>, <https://www.pewresearch.org/wp-content/uploads/sites/20/2026/01/PR_2026.01.21_religion-in-latin-america_report.pdf>
- INEGI Censo 2020: <https://www.inegi.org.mx/contenidos/programas/ccpv/2020/doc/Censo2020_Principales_resultados_EUM.pdf>
- StatCounter via Wayback: <http://web.archive.org/web/20261004052044/https://gs.statcounter.com/os-market-share/mobile/brazil>, <http://web.archive.org/web/20260924231229/https://gs.statcounter.com/vendor-market-share/mobile/brazil>, <http://web.archive.org/web/20260906171541/https://gs.statcounter.com/os-version-market-share/android/mobile-tablet/brazil>
- CGI.br TIC Domicílios 2025 (read by me): <https://cetic.br/media/analises/tic_domicilios_2025_principais_resultados.pdf>; tables <https://cetic.br/pt/tics/domicilios/2025/individuos/C5/>, <https://cetic.br/pt/tics/domicilios/2025/individuos/C7/>
- INAF 2024 (re-checked): <https://alfabetismofuncional.org.br/wp-content/uploads/2026/04/relatorio-inaf-digital.pdf>
- eBible: <https://ebible.org/find/details.php?id=spaRV1909> (re-checked), `spaonbv`, `spapddpt`, `spavbl`, `spabes`, `porbr2018`, `poronbv`, `porbrbsl`, `hin2017`, `swhulb`, `tglulb`, `kor`, `fraLSG`, `russyn`; catalogue <https://ebible.org/Scriptures/translations.csv>
- American Bible Society rights (RVR60): <https://www.americanbible.org/rights-and-permissions/>
- Apple on-device dictation languages: <https://www.apple.com/ios/feature-availability/#dictation-on-device>; DictationTranscriber: <https://developer.apple.com/documentation/speech/dictationtranscriber>; ML Kit GenAI speech: <https://developers.google.com/ml-kit/genai/speech-recognition/android>
- Speech datasets: <https://mozilladatacollective.com/datasets/cmu5wui2w00e8nq07idithpm6>, <https://www.openslr.org/94/>, <https://github.com/nilc-nlp/CORAA>
- NVI copyright page (Mundo Cristão edition; read by me): <https://www.mundocristao.com.br/wp-content/uploads/2023/08/Biblia-365-NVI.pdf>
- OpenBible.info cross-references (read by me): <https://www.openbible.info/labs/cross-references/>

**Pricing, payments and stores** (*sub-agent* unless noted)
- Apple Brazil terms (re-checked): <https://developer.apple.com/support/app-distribution-in-brazil/>; <https://developer.apple.com/support/payment-options-on-the-app-store-in-brazil/>; <https://developer.apple.com/news/?id=dhwadr2x>; <https://www.apple.com/newsroom/2026/06/apple-announces-changes-to-ios-in-brazil/>
- CADE: <https://www.gov.br/cade/pt-br/assuntos/noticias/cade-forma-maioria-pela-homologacao-de-tcc-em-investigacao-sobre-praticas-da-apple-no-ios>
- Apple pricing and taxes: <https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price>, <https://developer.apple.com/support/terms/apple-developer-program-license-agreement/>, <https://developer.apple.com/app-store/small-business-program/>, <https://developer.apple.com/news/?id=wim4cztw>, <https://developer.apple.com/news/?id=yo2104n5>, <https://support.apple.com/en-us/111741>
- Google Play: <https://support.google.com/googleplay/answer/2651410?hl=pt-BR&co=GENIE.CountryCode%3DBR> (re-checked, Pix), <https://support.google.com/googleplay/android-developer/answer/112622>, <https://play.google.com/supported-locations>, <https://support.google.com/googleplay/android-developer/answer/16643292>, <https://support.google.com/googleplay/android-developer/answer/13821247>, <https://support.google.com/product-documentation/answer/15152514>, <https://android-developers.googleblog.com/2026/03/a-new-era-for-choice-and-openness.html>
- Minimum wage: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12797.htm>
- BCB PTAX: <https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/>; World Bank PPP: <https://api.worldbank.org/v2/country/BRA/indicator/PA.NUS.PRVT.PP>
- Cloudflare Workers pricing (read by me): <https://developers.cloudflare.com/workers/platform/pricing/>
- YouVersion Platform (read by me): <https://www.youversion.com/platform>; YouVersion funding statement: <https://blog.youversion.com/2020/07/youversion-bible-app-behind-the-scenes-your-permissions-data-privacy-and-safety/>

**Features, methods, law and craft** (*sub-agent* unless noted)
- YouVersion churches and AI: <https://www.youversion.com/churches>, <https://web.archive.org/web/20261006130517/https://www.bible.com/privacy>, <https://platform.youversion.com/terms>, <https://www.youversion.com/news/bible-app-reaches-one-billion-installs>, <https://www.youversion.com/news/anxiety-hope-and-healing-youversion-reveals-what-brazilians-are-searching-for-in-the-bible-this-year>
- Hallow: <https://hallow.com/blog/hallow-ai/>, <https://hallow.com/blog/thoughts-on-ai/>, <https://help.hallow.com/en/articles/13601993-hallow-ai-faq>
- Logos: <https://support.logos.com/hc/en-us/articles/35181728416397-How-Logos-uses-AI>
- ERLC (archived): <https://web.archive.org/web/20240520001856/https://erlc.com/resource-library/statements/artificial-intelligence-an-evangelical-statement-of-principles/>
- Awana: <https://www.awana.org/copyright-information/>, <https://www.awana.org/membership-agreement/>; Awana Brasil (archived): <https://web.archive.org/web/20260711170519/https://awanalatinoamerica.org/brasil-portugues/>
- CPAD: <https://www.cpad.com.br/revista-licoes-biblica-professor-4-tri-955004/p>, <https://www.cpad.com.br/revista-jardim-de-infancia-professor-935004/p>, <https://play.google.com/store/apps/details?id=br.com.cpad.lbm.mestre>
- APEC: <https://www.apec.com.br/site/clube-de-boas-novas-apec/>; OANSE: <https://sites.google.com/oanse.org.br/oanse-brasil/clubes>; Embaixadores do Rei: <https://memoria.embaixadoresdorei.org/uploads/2/0/8/1/20813448/guia_dos_embaixadores_do_rei.pdf>
- Andrew M. Davis, *An Approach to Extended Memorization of Scripture* (archived 2015 PDF): <https://web.archive.org/web/20151106163741/http://www.fbcdurham.org/wp-content/uploads/2015/07/Scripture-Memory-Booklet-for-Publication-Website-Layout.pdf>
- Tom Meyer: <https://www.christianpost.com/voices/how-to-memorize-scripture.html>
- The Navigators: <https://www.navigators.org/resource/topical-memory-system/>, <https://www.navigators.org/wp-content/uploads/2021/02/navigators-how-to-memorize-scripture.pdf>
- Apple Design Awards: <https://www.apple.com/newsroom/2024/06/apple-announces-winners-of-the-2024-apple-design-awards/>, <https://www.apple.com/newsroom/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/>, <https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/>, <https://developer.apple.com/design/awards/>
- Google Play Best of: <https://blog.google/products/google-play/google-play-best-apps-games-2024/>, <https://blog.google/products-and-platforms/platforms/google-play/best-apps-games-2025/>, <https://blog.google/intl/pt-br/os-melhores-apps-e-jogos-de-2024-no-google-play/>, <https://blog.google/intl/pt-br/produtos/android-chrome-play/os-melhores-apps-e-jogos-do-google-play-de-2025/>
- Apple Accessibility Nutrition Labels: <https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/>; Google Play accessibility tags: <https://support.google.com/googleplay/android-developer/answer/9859673>
- LGPD: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm>; ECA Digital: <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm>; Decreto 12.880/2026 (re-checked): <https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/D12880.htm>; ANPD ECA Digital FAQ: <https://www.gov.br/anpd/pt-br/assuntos/eca-digital/perguntas_respostas_eca_digital_30072026.pdf/@@display-file/file>
- WhatsApp developer FAQs: <https://faq.whatsapp.com/425247423114725/?locale=en_US&cms_platform=iphone>, <https://faq.whatsapp.com/511210730860677/?locale=en_US&cms_platform=android>; Instagram Stories: <https://developers.facebook.com/documentation/instagram-platform/sharing-to-stories>
- Expo `react-native-view-shot` (SDK 57, read by me): <https://docs.expo.dev/versions/v57.0.0/sdk/captureRef/>; Literata licence (read by me): <https://raw.githubusercontent.com/google/fonts/main/ofl/literata/METADATA.pb>
- Dyslexia fonts: Wery & Diliberto (2017), Annals of Dyslexia, <https://doi.org/10.1007/s11881-016-0127-1>; Rello & Baeza-Yates (2013), ASSETS, <https://doi.org/10.1145/2513383.2513447>

**Today's notes this builds on**
- `feature-and-improvement-opportunities.md` ("October note")
- `spaced-repetition-sm2-vs-fsrs.md` ("SRS note")
- `notification-and-platform-surfaces.md` ("notification note")
- `onboarding-first-run-experience.md` ("onboarding note")
- `competitive-benchmarks-and-feature-opportunities.md` ("CB")
- `../../../docs/research/02-market-research-and-feature-opportunities.md` ("MR")
- ADRs 0001–0016
