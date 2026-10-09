# Domain Name Options (October 2026 Research Pass)

**Author**: Research Agent
**Date**: 2026-10-09
**Status**: Completed
**Question (product owner, translated intent)**: "Find a good domain for the app, starting from liberados.com.br."
**Context**: The domain will serve the Universal Links / App Links verification files from the small stateless edge function (ADR 0019), so that shared Deck links open the app (ADR 0020). People will read it aloud in church and see it in WhatsApp messages. The public app name is still open (ADR 0019, "Consequences"). Positioning comes from `world-class-strategy-and-differentiation.md` §1: *"você recita, o app confere"*, *"guardar a Palavra no coração"*, free on-device voice checking, churches sharing Decks over WhatsApp.

**Evidence conventions** (the same as the other notes from today)
- **Verified**: read by me in the primary source on 2026-10-09. Every availability result carries its check time in UTC (Brasília time is UTC−3). All checks ran between **20:07 and 20:25 UTC (17:07–17:25 BRT)**.
- **Inference**: my reasoning from verified facts.
- **Opinion**: my judgement of name quality. It is not a fact.
- **liberados' claim**: something liberados.com.br states that I could not confirm on a registro.br page.
- Availability changes by the minute. **Re-check a name right before paying for it.** One name from the liberados snapshot, `decorai.com.br`, was listed as free on 30/09 and had been registered by someone else on 07/10.

---

## 1. TL;DR

**Top 5.** Each one can be registered today as an ordinary R$ 40/year registration, with no release-process lottery.

| # | Domain | Availability (verified 2026-10-09) | How to get it | Why (opinion) |
|---|---|---|---|---|
| 1 | **recitei.com.br** | Available per the Registro.br search page at 20:25 UTC ("Domínio disponível para registro. R$ 40,00 por 1 ano"). `recitei.app`, `recitei.com` and `recitei.app.br` are also unregistered. | Normal registration at registro.br, R$ 40 for 1 year. Add `recitei.app` at a registrar (about US$ 15/yr) as the defensive pair. | 7 letters, one word, no accents. "Recitei!" is what the learner says after a passing recitation, which is "você recita, o app confere" told from the user's side. All four extensions are free, so the name can be owned outright. |
| 2 | **recitaverso.com.br** | Available (20:15 UTC). `.app`, `.com` and `.app.br` are also unregistered. | Normal registration, R$ 40/yr. | The most self-explanatory option ("recita verso"), and it reads the same in Spanish. At 11 letters it is long. |
| 3 | **falaverso.com.br** | Available (20:14 UTC). `.app`, `.com` and `.app.br` are also unregistered. | Normal registration, R$ 40/yr. | The safest to spell from hearing: no c/s or accent traps. Voice-first ("fala"). Shares "Verso" with two small pt-BR devotional apps. |
| 4 | **versovivo.com.br** | Available (20:14 UTC). `.app` and `.app.br` are unregistered. **`.com` was registered on 2026-06-16** by someone else. | Normal registration, R$ 40/yr. | Easy to say, alliterative, a quiet nod to Hebrews 4:12, and the same in Spanish. It sits close to "Verbo Vivo App" and the "Verso" apps, and the `.com` is gone. |
| 5 | **recitar.com.br** | Available (20:18 UTC). `.app` and `.app.br` are unregistered. **`.com` was registered on 2023-06-29.** | Normal registration, R$ 40/yr. | A plain dictionary verb, clear when spoken and the same in Spanish. It is generic and weak as a brand, and Quran-recitation apps fill that search term. |

**What liberados.com.br gave us.** It mirrors Registro.br's monthly **processo de liberação**. Its current data is the **September 2026 round** (09/09 15:00 to 16/09 15:00, 125,453 names). The **October list does not exist yet**: Registro.br publishes it two days before the 14/10 round, i.e. on 12/10. In the September list:
- the best on-theme name still free is **`palavria.com.br`**. It is now an ordinary R$ 40 registration, but **`palavria.com` is a live Portuguese "frases e contos" site with the same name**, which is a real brand conflict;
- **`acertei.com.br`** ("I got it right") is **locked**. Two or more people asked for it in September, so it returns in the 14/10 round, where it is likely to lock again.

Nothing from liberados beat the brainstormed names (§3).

**Other findings**
- **`voice-scripture.app` is not registered.** Google Registry RDAP returned 404 at 20:13 UTC. It could be bought, but an English, hyphenated name ("voice, hífen, scripture, ponto app") is the opposite of what a Brazilian congregation can say aloud. I do not recommend it. The code constant should move to the chosen domain (§5.4).
- **The "Recite" root is getting crowded in English.** Two App Store apps called **"Recite: Bible Verse Memory"** (2026-07-14) and **"Recite: Bible Memory"** (2026-07-30) appeared in July 2026, both with 0 ratings, plus a web app at `recitebible.com` ("Recite out loud… watch each word light up"). None uses the Portuguese "Recitei", but the overlap should be known (§4.2).
- **"Decorei" and "Guardei" are taken everywhere that matters.** `decorei.app` is a live pt-BR study app (R$ 19,90/mês), and every useful "guardei" domain is held by someone else (§4).
- **A person can register `.com.br` and `.app.br` with a CPF** (Registro.br's category page, CPF filter). The holder can be moved to a CNPJ later with Registro.br's "Transferência de Titularidade" procedure (§2.4).

---

## 2. How liberados.com.br and the Registro.br release process work

### 2.1 What liberados.com.br is (primary source: its own pages)

- **What it shows** (home page, snapshot "gerado em 09/10/2026 16:53"): "Todo mês o Registro.br devolve ao mercado os domínios que não foram renovados. Na última rodada foram 125.453". The footer says: "Sem vínculo com o Registro.br, o NIC.br ou o CGI.br". It is an independent tool, not the registry.
- **What it lists**: the names from Registro.br's monthly release list, enriched with live status checks. The tabs are "Joias", "Sem competição", "Disputados", "Voltam na próxima rodada", "Em leilão", "Elegíveis ao leilão", "Vão a leilão na próxima rodada", "Livre agora", "Todos consultados" and "Toda a rodada".
- **Where its data comes from** (its `/regras-do-br/` and `/api-registrobr/` pages): Registro.br's three public list files, the availability endpoint behind the registro.br search box (`registro.br/v2/ajax/avail/raw/<domínio>`), and RDAP (`rdap.registro.br`).
- **The data files I used.** The page itself loads two files:
  - `/dados.json` (generated 2026-10-09 19:53 UTC): 20,710 scored names with their last-seen status. The counts were 18,210 LIVRE, 1,786 REGISTRADO, 665 AGUARDANDO_LIBERACAO, 42 LIVRE_COM_TICKET and 7 INDISPONIVEL. It also holds a 150-name "prévia do leilão" for October.
  - `/todos.json`: all 125,453 names of the round.
- **What it shows for the current round**: "Rodada atual: de 09/09/2026 15:00 a 16/09/2026 15:00. Próxima: 14/10/2026". The countdown reads "Sai a lista 12/10 · Abre a rodada 14/10, 15h · Fecha a rodada 21/10, 15h", with the caveat "Datas pela regra da segunda quarta-feira; o Registro.br pode mudar uma delas por feriado."

### 2.2 The release process, from Registro.br's own pages

Source: [registro.br/dominio/processo-de-liberacao](https://registro.br/dominio/processo-de-liberacao/), read 2026-10-09 20:09 UTC (the site renders with JavaScript, so I read it in a browser). All quotes are verbatim.

- **What it is**: "Este processo tem como objetivo disponibilizar novamente nomes de domínios que tenham sido removidos por não renovação, solicitação de cancelamento, constatação de irregularidades nos dados cadastrais do titular ou que tenham sido reservados."
- **Calendar**: "Os próximos processos de liberação ocorrerão em **14/10/2026 e 11/11/2026**. A lista dos domínios que participarão do processo será publicada **2 dias antes do seu início**."
- **The window**: "As candidaturas aos nomes de domínio deverão ser efetivadas no intervalo entre o momento inicial e o final do processo." The page does not give the times. The official list file does. The header of [lista-processo-liberacao.txt](https://registro.br/dominio/lista-processo-liberacao.txt) (fetched 20:12 UTC) reads: "Processo de liberação no período de 2026-09-09T15:00:00-03:00 a 2026-09-16T15:00:00-03:00", which is **seven days, 15h to 15h Brasília**. The rule "second Wednesday of the month" is **liberados' claim** (they say 5 of 103 rounds started on the following Thursday).
- **How to apply**: "Para candidatar-se a um nome de domínio, deve-se solicitar o registro seguindo as instruções em cadastrando novos domínios." In other words, you request the name like an ordinary registration while the window is open. The application costs nothing until you win.
- **Limits**: "As candidaturas ao processo de liberação são limitadas em função do perfil do titular e podem variar de 3 a 200". **liberados' claims**: a new account tends to sit near 3, and an application cannot be cancelled once made.
- **Data must be real**: "Candidaturas com dados discrepantes (nome, razão social ou demais dados) podem ser penalizadas."
- **The single applicant is invisible**: "A interface de verificação de disponibilidade de domínios somente informará que existem tickets para um domínio em processo de liberação caso este possua mais de um candidato." *Inference*: when the search shows no tickets, read it as "zero or one applicant". If one already exists and you apply, the name locks for both of you.
- **What happens when several people ask for the same name** (verbatim, "Resultado"):
  - "os nomes que não tiverem candidatos voltarão ao espaço de nomes livres, seguindo as regras usuais de registro de domínios;"
  - "os nomes que tiverem apenas um candidato serão a ele atribuídos, desde que solucione as demais pendências, caso existam;"
  - "os nomes que tiverem dois ou mais candidatos e não tenham passado por processo competitivo, **NÃO serão liberados** e ficarão aguardando o próximo processo de liberação;"
  - "os nomes que tenham passado por processo competitivo serão registrados por seus novos titulares mediante pagamento da oferta vencedora, exclusivamente através de boleto bancário ou Pix. O valor da oferta inclui a manutenção pelo período de 1(um) ano."

  So two or more applicants means **no draw**: the name locks and comes back the next month. A competition (auction) is used only for names that have locked repeatedly: "Inicialmente, apenas alguns domínios que já tenham participado de sucessivos processos de liberação sem resolução entrarão em processo competitivo." The figure "three consecutive locks" is **liberados' claim**, citing NIC.br.
- **The auction ("processo competitivo")**:
  - It starts when "dois ou mais candidatos são constatados" on an eligible name, and runs "6 dias ou mais (para que a data final coincida em dia útil)".
  - New tickets are accepted until one day before the end, then "pelo menos, 24h para realizar novas ofertas".
  - A bid in the last 10 minutes extends the auction by 10 minutes. Past 18h, it continues the next business day at 15h.
  - No outbid alerts are sent ("sugerimos verificar o andamento do processo ao menos 10 (dez) minutos antes do prazo final").
- **Bid amounts**: "O menor valor possível para oferta é **R$50,00**." Minimum increments: R$ 50 up to R$ 1,000; R$ 100 up to R$ 5,000; R$ 200 up to R$ 10,000; R$ 500 up to R$ 20,000; R$ 1,000 up to R$ 50,000; R$ 5,000 up to R$ 200,000; R$ 10,000 up to R$ 500,000; R$ 20,000 above that.
- **Payment deadline and penalty**: "o não cumprimento da oferta realizada dentro do prazo de **15 (quinze) dias** após a conclusão do processo, provocará **restrição de 6 meses** na participação de novos processos de liberação." The restriction also reaches any ID or holder that can be "correlacionáveis, por alguma característica técnica".
- **Search messages** during the cycle: "Domínio não pode ser registrado por estar aguardando o início do processo de liberação", "Domínio disponível para registro dentro do processo de liberação até data e hora final", and "Domínio indisponível. Período de candidaturas encerrado no processo de liberação." On 2026-10-09 at 20:25 UTC the search page showed `acertei.com.br` as "Domínio não disponível para registro. Domínio está aguardando o início do processo de liberação".

### 2.3 Prices and payment (Registro.br)

Source: [registro.br/ajuda/pagamento-de-dominio](https://registro.br/ajuda/pagamento-de-dominio/), read 20:10 UTC.

| Period | 1 yr | 2 yrs | 3 yrs | 4 yrs | 5 yrs | 6 yrs | 7 yrs | 8 yrs | 9 yrs | 10 yrs |
|---|---|---|---|---|---|---|---|---|---|---|
| R$ | 40,00 | 76,00 | 112,00 | 148,00 | 184,00 | 220,00 | 256,00 | 292,00 | 328,00 | 364,00 |

- These prices apply to `.com.br`, `.app.br` and "quase todas as categorias".
- **Payment**: "Através de Pix, de cartão de crédito das bandeiras VISA ou MasterCard, por boleto bancário". Auction wins are paid by boleto or Pix only (§2.2).
- **Notices**: "Um aviso de cobrança é enviado para os contatos do domínio no ato de registro e 30 dias antes de cada expiração."
- **If you don't pay** (FAQ 1.4): "O seu domínio será congelado e após um período liberado para novo registro, de acordo com as regras do processo de liberação."
- The search page showed the same prices on 2026-10-09: "R$ 40,00 por 1 ano … R$ 76,00 por 2 anos … R$ 184,00 por 5 anos".
- *Observation, not a published rule*: two names won in the September round and apparently left unpaid, `bibliaia.com.br` and `useverbo.com.br`, show in RDAP as `inactive`, with their expiration date equal to their registration date. **Pay on the day you register.**

### 2.4 Requirements (Registro.br)

- **Who can register**: "O registro de domínios, nas categorias sob o .br, está disponível para pessoas físicas (CPF) e jurídicas (CNPJ) legalmente representadas ou estabelecidas no Brasil com cadastro regular junto ao Ministério da Fazenda" ([/dominio/regras](https://registro.br/dominio/regras/)). The FAQ adds: "pessoa jurídica (CNPJ) ou física (CPF) **maior de idade**, e que possua um contato em território nacional", and a birth date is required to validate the CPF ([/ajuda/registro-de-novos-dominios](https://registro.br/ajuda/registro-de-novos-dominios/), Q1.2 and Q3.7).
- **Can a person register `.com.br`?** **Yes.** On [/dominio/categorias](https://registro.br/dominio/categorias/) with the **CPF** filter active, the list still shows "COM.BR Atividades comerciais" and "APP.BR Aplicativos" (read 20:11 UTC). Restricted categories such as `.org.br` need documents (Q2.6), and `.blog.br` is personal-only (liberados labels it "só pessoa física"). None of these matter here.
- **Changing to a company later**: "Transferência de Titularidade de Domínio: Indicado quando há necessidade de alterar o CNPJ/CPF que detém a titularidade de um ou mais domínios". It is done by sending documents; "O prazo para análise é 2 dias úteis" ([/ajuda/procedimentos-administrativos](https://registro.br/ajuda/procedimentos-administrativos/)). This fits the strategy note's plan to publish from a CNPJ.
- **Syntax and look-alikes** (/dominio/regras):
  - Names must be 2–26 characters, using `a–z`, `0–9`, hyphen and `à á â ã é ê í ó ô õ ú ü ç`.
  - Accented and hyphenated forms are treated as the same name: "O registro de um domínio não é permitido se houver domínio equivalente pertencente a outro titular." *Inference*: whoever holds `recitei.com.br` is the only one who can register hyphenated or accented look-alikes **within `.com.br`** (e.g. `recite-i.com.br`). Each look-alike still costs R$ 40 if you want it to resolve.
  - The protection does **not** cross categories. Registro.br's FAQ (Q2.5) says a name registered in one category "poderá ser registrado em outra categoria" (unless done in bad faith). So holding `recitei.com.br` does not reserve `recitei.app.br` or `recitei.net.br`.
- **DNS**: "são necessários ao menos dois servidores DNS". If you name none, "o domínio será registrado em até 5 minutos com os servidores autoritativos do Registro.br". If you use your own DNS and it fails, "há um prazo de 2 semanas" to fix it (Q1.5).

### 2.5 Deadlines at a glance (October round)

| When | What | Source |
|---|---|---|
| **12/10/2026** (time not stated) | The official list for the October round is published at `registro.br/dominio/lista-processo-liberacao.txt` | registro.br ("2 dias antes"); file URL verified with the September file |
| **14/10/2026, 15:00 BRT** | Applications open (free) | Date: registro.br. Hour: September file header and liberados |
| **21/10/2026, 15:00 BRT** | Applications close | September pattern (7 days); liberados countdown |
| Shortly after closing | Result email. A sole applicant must pay R$ 40 and clear any "pendências". | registro.br "Resultado"; liberados says the September email came at 15:02 |
| From about 21/10 | Names with two or more applicants lock and wait for **11/11/2026** | registro.br |
| Auction (only for names that have locked repeatedly) | 6+ days. Pay within 15 days or face a 6-month ban. | registro.br |

---

## 3. Candidates from liberados.com.br

**Method.** I searched both the official list ([lista-processo-liberacao.txt](https://registro.br/dominio/lista-processo-liberacao.txt), 125,453 names, generated 2026-09-07) and liberados' `todos.json`/`dados.json`. The search terms were: bíblia, versículo/verso, decor-/memoriz-/guard-/lembr-, recit-, palavr-, coração, escritura, salmo, verbo, rhema, logos, voz, escut-, amém, ungido, evangel-, jesus/cristo, plus an exact-word scan (palavra, verso, salmos, recitar, guardei, amém, etc.). Every row below was **re-checked live** at Registro.br (avail endpoint used by the registro.br search page). liberados' own status is shown for comparison.

**Which list.** Every name below comes from the **September 2026 round (09/09–16/09/2026)**, liberados snapshot of 09/10/2026 16:53. The **October list is not published yet** (12/10). The only "upcoming" names knowable today are the 665 that locked in September (AGUARDANDO_LIBERACAO) and the 150-name auction preview for October. Neither set contains an on-theme name beyond the locked rows below.

| Domain | liberados tab (Sept round) | Live status, Registro.br, 2026-10-09 (UTC) | Fit for this app (opinion) | Path and price |
|---|---|---|---|---|
| **palavria.com.br** | "Toda a rodada" (score 30, not individually checked) | **Available** (20:16) | Coined from "palavra". Easy to say ("pa-la-VRI-a"); some will read "palavra + IA". **Conflict**: `palavria.com` is a live pt-BR site, "Palavria — Frases e contos para ler e compartilhar", registered 2026-07-18. `.app` and `.app.br` are unregistered. | Ordinary registration, R$ 40 |
| **acertei.com.br** | "Voltam na próxima rodada" | **Locked**: "aguardando o início do processo de liberação" (20:16; search page 20:25) | "Acertei!" (I got it right) suits the passing moment, but it is generic and quiz/betting-flavoured. | **October round only.** Free to apply 14/10–21/10, R$ 40 if you are the sole applicant. It already had 2+ applicants in September, so expect another lock. |
| escutamos.com.br | "Sem competição" → LIVRE | Available (20:17) | "We listen". It hints at the app listening, but the plural "we" is odd. A Play app called "Escutamos Você INTS" exists. | Ordinary, R$ 40 |
| eubiblia.com.br | "Toda a rodada" | Available (20:16) | The meaning is unclear ("eu Bíblia"), and "Bíblia" carries an accent. | Ordinary, R$ 40 |
| voza.com.br | LIVRE | Available (20:17) | Short ("voz"), but says nothing about Scripture or memory. `voza.app` and `voza.com` are registered. | Ordinary, R$ 40 |
| boamemoria.com.br / lembreai.com.br | "Toda a rodada" | Available (20:17) | Generic memory or reminder names, nothing about Scripture. "Memória" carries an accent. | Ordinary, R$ 40 |
| salmosete.com.br / vivarhema.com.br | "Toda a rodada" | Available (20:17) | "Salmo sete" is too narrow. "Rhema" is spelled ambiguously and widely used by Pentecostal churches. | Ordinary, R$ 40 |
| guardeseucoracao.com.br | "Toda a rodada" | Available (20:17) | Too long (16), and the wrong verse (Pv 4:23, "guard your heart", not "keep the Word"). | Ordinary, R$ 40 |
| letrabiblia / useapalavra / luznapalavra .com.br | "Toda a rodada" | Available (20:18) | Long and generic. | Ordinary, R$ 40 |
| logosapp.com.br | LIVRE | Available (20:17) | **Avoid**: "Logos" is a major Bible-software brand (Faithlife). | — |
| decor.net.br | LIVRE | Available (20:18) | "De cor" means "by heart", from Latin *cor*, heart. But it reads as "décor", and it is `.net.br`. | Ordinary, R$ 40 |
| palavra.blog.br | LIVRE | Available (20:17) | Wrong category for an app (`.blog.br`, personal holders only). | — |
| ungidos / ester / timbre / aprenda .com.br | "Voltam na próxima rodada" | **Locked** (20:16–20:18) | Off-message or generic, and each already had 2+ applicants. | October round lottery |
| decorai.com.br | LIVRE in the snapshot (checked 30/09) | **Registered** by someone else, expires 2027-10-07 (20:10) | — | Gone; shows why every snapshot must be re-checked |
| recorda / verboai / bibliaia / useverbo / versiculodiario / palavradehoje .com.br, amem.app.br | various | **Registered** (20:17–20:25) | — | Gone |
| vozes.org.br | LIVRE | Available (20:25) | `.org.br` needs proof of a non-profit (Registro.br Q2.6). | Not eligible as a person |

*Inference*: liberados is the right tool for **watching** names, but September's list held no strong, conflict-free name for this app. It is worth one more look on **12/10**, when the October list appears (§6, step 9).

---

## 4. Brainstormed candidates

**Method.** Availability for `.com.br` and `.app.br` comes from Registro.br's availability endpoint (the one the registro.br search box uses). For **recitei.com.br** and **acertei.com.br**, I also confirmed the result on the [registro.br search page](https://registro.br/busca-dominio/?fqdn=recitei.com.br) itself. `.com` comes from **Verisign RDAP** and `.app` from **Google Registry RDAP**: 404 means not registered, 200 means registered (with the registration date). I calibrated each source first: `google.com` → 200, a random `.com` → 404, `cash.app` → 200, a random `.app` → 404. An RDAP 404 does **not** reveal registry-premium pricing for `.app`, so confirm the price in the registrar's cart.

**Store check.** I queried the iTunes Search API (country=br) and the Google Play search page (gl=BR, hl=pt-BR) at 20:20–20:22 UTC. This is a quick look for same-name apps, **not a trademark search** (INPI was not searched).

### 4.1 Availability table (all checks 2026-10-09, 20:13–20:24 UTC)

✅ = available / not registered. ❌ = registered (year of registration in brackets where RDAP gave it).

| Name | .com.br | .app.br | .app | .com | Letters | Say-aloud and spelling (opinion) | Store conflicts (BR) |
|---|---|---|---|---|---|---|---|
| **recitei** | ✅ | ✅ | ✅ | ✅ | 7 | "re-si-TÊI"; one word. The only trap is c/s ("resitei"). | None named Recitei. The English "Recite: Bible (Verse) Memory" apps exist (§4.2). |
| **recitaverso** | ✅ | ✅ | ✅ | ✅ | 11 | "re-si-ta-VÉR-so"; heard as two words, typed as one. The c/s trap applies. | None. "Verso" apps exist. |
| **falaverso** | ✅ | ✅ | ✅ | ✅ | 9 | "FA-la VÉR-so"; no ambiguous letters. | None. "Verso: Versículo do Dia" (93 ratings) and Play "Verso: Devocional e Versículo". |
| **versovivo** | ✅ | ✅ | ✅ | ❌ (2026) | 9 | "VÉR-so VI-vo"; no ambiguity. | "Verbo Vivo App" (Ministério Verbo Vivo) plus the "Verso" apps. |
| **recitar** | ✅ | ✅ | ✅ | ❌ (2023) | 7 | Clear, but a plain verb. | Quran-recitation apps dominate the search. No app named Recitar. |
| recitai | ✅ | ✅ | ✅ | ❌ (2025) | 7 | Archaic imperative, heard as "recita aí": charming, but people will type "recitaai"/"recitaí". | None |
| bibliadecor | ✅ | ✅ | ✅ | ✅ | 11 | "Bíblia de cor": clear aloud, but reads as "biblia **decor**" in print. | Bible colouring apps |
| versodecor | ✅ | ✅ | ✅ | ✅ | 10 | Same "decor" print problem. | — |
| seidecor | ❌ | ✅ | ✅ | ❌ (2021) | 8 | "Sei de cor" (I know it by heart): lovely aloud, but same print problem. | — |
| palavria | ✅ | ✅ | ✅ | ❌ (2026) | 8 | See §3. | **palavria.com is a live same-name pt-BR site** |
| memoverso | ❌ | ✅ | ✅ | ❌ (2010) | 9 | — | — |
| recital | ✅ | — | ❌ (2019) | ❌ (1991) | 7 | It means a performance. | "Recital App" (Quran), "Recital-Ask Anything" |
| recita | ❌ | ✅ | ❌ (2026) | ❌ (2001) | 6 | Ideal word, but taken. `recita.app` is a script-rehearsal app called "Recita". | "Learn Quran: Recita e Pesquisa" |
| recite | ❌ | — | ❌ (2019) | — | 6 | — | Two English "Recite" Bible-memory apps |
| recito | ✅ | — | ❌ (2025) | ❌ (2004) | 6 | — | — |
| guardei | ❌ | ❌ (expired 2026-09-14, `inactive`) | ❌ (2024) | ❌ (2014) | 7 | Best biblical echo (NVI Sl 119:11, "Guardei no coração a tua palavra"), but taken. | "iGuardei", "Onde Guardei?" |
| decorei | ❌ | ❌ | ❌ (2026) | ❌ (2001) | 7 | — | **"Decorei"** is a live pt-BR study app at decorei.app |
| memoriza | ❌ (expires 2026-11-17) | — | ❌ (2022) | ❌ (2006) | 8 | — | — |
| tuapalavra | ❌ | — | ✅ | ❌ (2020) | 10 | — | — |
| escondi | ✅ | — | ✅ | ❌ (2011) | 7 | ARC Sl 119:11 ("Escondi a tua palavra"), but "I hid" sounds odd alone. | — |
| ecoa / verso / guarde / confere | ❌ (confere: "reservado pelo Comitê Gestor") | — | ❌ | — | 4–7 | Taken | — |
| bereia (Acts 17:11, the Bereans) | ❌ | — | ❌ (2026) | — | 6 | Taken | — |
| recitabiblia | ✅ | — | ✅ | ✅ | 12 | Long; "Bíblia" accent | — |
| guardanocoracao / decoresalteado / palavraguardada | ✅ / ✅ / ❌ | — | — / — / ✅ | — | 14–15 | Too long; ç and ã | — |
| voice-scripture / voicescripture | — | — | ✅ / ✅ | — / ✅ | 14–15 | English; the hyphen must be spoken ("hífen") | — |
| versevoice / hiddenword | — | — | ✅ / ❌ (2018) | — | 10 | English only | — |

### 4.2 Same-category apps worth knowing about

| App | Store / URL | Facts (verified 2026-10-09) |
|---|---|---|
| Recite: Bible Verse Memory | [App Store](https://apps.apple.com/br/app/recite-bible-verse-memory/id6777379734) (BR and US) | Seller David Gibson, released 2026-07-14, 0 ratings |
| Recite: Bible Memory | [App Store US](https://apps.apple.com/us/app/recite-bible-memory/id6768597787) | Seller Suang How Lau, released 2026-07-30, 0 ratings |
| Recite (web) | [recitebible.com](https://www.recitebible.com/) | Title "Recite — Bible memory verse practice"; "Recite Bible verses out loud and watch each word light up as you say it". Domain registered 2026-05-15. |
| Decorei | [decorei.app](https://decorei.app/) | pt-BR study tool, "R$19,90/mês". Domain registered 2026-04-05. |
| Verso: Versículo do Dia | [App Store BR](https://apps.apple.com/br/app/verso-vers%C3%ADculo-do-dia/id6773788624) | Seller Rafael Ferreira, 93 ratings |
| Verso: Devocional e Versículo | Google Play, `faith.verso.app` | Listed in the Play BR search for "verso vivo" |
| Verbo Vivo App | [App Store BR](https://apps.apple.com/br/app/verbo-vivo-app/id6753727405) | Seller Ministério Verbo Vivo, 2 ratings |
| Palavria | [palavria.com](https://palavria.com/) | "Palavria — Frases e contos para ler e compartilhar". Domain registered 2026-07-18. |

*Inference*: the English "Recite" apps are new and unrated, and they use a different word from the Portuguese "Recitei". They make the "recit-" root less distinctive in English search, but not in pt-BR. The domain-holders and app titles above are facts. Whether any of them holds a registered trademark is **not** checked.

---

## 5. Evaluation and recommendation

### 5.1 Criteria (opinion, weighted for this audience)
1. **It survives one hearing.** A pastor says it once from the pulpit, or someone reads it aloud from a WhatsApp group, and people can type it. No accents, no ç, no hyphen, no letter that can be spelled two ways.
2. **It says what the app does**: you recite, it checks, the Word stays.
3. **It is registrable today** at R$ 40, not through a lottery.
4. **The same name is free on `.app`/`.com`**, so the brand is not split across extensions.
5. **No same-name app** in the BR stores.
6. Bonus: **it reads in Spanish**, the Q3 2027 expansion (strategy note §1, bet 7).

### 5.2 Scoring (opinion; ●●● strong, ●● fair, ● weak)

| Domain | One hearing | Says the job | Today, R$ 40 | Same name on .app/.com | Store conflict | Spanish |
|---|---|---|---|---|---|---|
| **recitei.com.br** | ●● (c/s) | ●●● | ●●● | ●●● (both free) | ●● | ●● ("recité") |
| **recitaverso.com.br** | ●● (length, c/s) | ●●● | ●●● | ●●● | ●●● | ●●● |
| **falaverso.com.br** | ●●● | ●● | ●●● | ●●● | ●● | ● (pt-only "fala") |
| **versovivo.com.br** | ●●● | ●● | ●●● | ●● (.com gone) | ●● | ●●● |
| **recitar.com.br** | ●● | ●● | ●●● | ●● (.com gone) | ●● | ●●● |
| palavria.com.br | ●●● | ● | ●●● | ● (.com is a live namesake) | ● | ● |
| acertei.com.br | ●●● | ●● | ● (lottery) | not checked | ●● | ● |
| voice-scripture.app | ● | ●● (English) | ✅ `.app` only | — | ●●● | ● |

### 5.3 Top 5, with rationale

1. **recitei.com.br** (+ `recitei.app`). It is the learner's own sentence after a successful Blind Recitation, and it pairs naturally with the tagline: *"Recitei: você recita, o app confere."* It also matches the share-card line proposed in the strategy note §7.8 ("Recitei de cor e conferi palavra por palavra"). It is short, has a single stress, and no accents. All four extensions are free, so the brand can be owned outright. Risk: the English "Recite" apps (§4.2) and the c/s spelling. Write it once on screen ("recitei, com C") in the first church announcements.
2. **recitaverso.com.br**. It explains itself to someone who has never heard of the app, is identical in Spanish ("recita verso"), and is free on every extension. It is long for a URL, but fine as a spoken phrase.
3. **falaverso.com.br**. It has the lowest risk of being misspelled after one hearing, and it is voice-first. "Fala" is informal, which suits WhatsApp and is less solemn than the brand's "contemplative quiet" tone. It shares "Verso" with two small devotional apps.
4. **versovivo.com.br**. It has the best sound and works in Spanish, but its `.com` was registered in June 2026 and it sits near "Verbo Vivo".
5. **recitar.com.br**. A safe, clear verb, but a weak brand: generic, harder to protect, and its search results are full of Quran apps. Use it only if the owner wants the plainest possible name.

**Not recommended**: `palavria.com.br` (a live namesake on `.com`), `acertei.com.br` (lottery, generic), and `voice-scripture.app` (English and hyphenated; it is available, but nobody in a Brazilian church will type it correctly).

### 5.4 Naming note: the app name and the domain should match
- **Pick the app name first, then buy exactly that word.** If the app is called "Recitei", the store title becomes something like "Recitei: Memorize a Bíblia" and the links become `https://recitei.com.br/i#…`. A domain that differs from the app name makes people search the store for the wrong word. Today the code is still a placeholder: `app.json` has `"name": "voice-ai-scripture"`, and `src/utils/deckSharing.ts` has `DEEP_LINK_PREFIX = 'https://voice-scripture.app/i#'`. Both should change together once the domain is bought. I did not change any code.
- **The link format already fits ADR 0020's privacy rule.** The Deck payload sits after `#`, and browsers never send the fragment to the server. For the link domain, the edge function serves only `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`, and never sees Deck content. Its other ADR 0019 jobs, the speech-to-text proxy and rate limits, are unaffected.
- **`.com.br` or `.app` for the links?** `recitei.app/i#…` is 3 characters shorter than `recitei.com.br/i#…`. In print the difference is negligible. Spoken, "ponto com ponto br" is what Brazilians expect and trust (opinion). Use `.com.br` as the canonical domain and redirect `.app` to it. `.app` is on the HSTS preload list (`hstspreload.org` reports `"status": "preloaded"` for `app`), so it only works over HTTPS. Universal Links and App Links need HTTPS anyway, so this costs nothing.

### 5.5 Fallback strategy
- **Primary pair (recommended)**: register `recitei.com.br` now (R$ 40, or R$ 76 for 2 years) and `recitei.app` at a registrar (Porkbun lists `.app` at "$14.93 regular registration / renewal", and a lower promotional price of $8.75 was also shown; read 20:24 UTC). Optionally add `recitei.com` (Porkbun lists `.com` at $11.08) and `recitei.app.br` (R$ 40). That totals about R$ 80 plus about US$ 26 a year for the full set. The equivalence rule (§2.4) stops anyone else registering accented or hyphenated look-alikes within `.com.br`, but not the same word in other `.br` categories, which is the reason to consider `recitei.app.br`.
- **If the owner rejects "Recitei"**: the same four-extension set is free for `recitaverso` and for `falaverso`. Buy only the one chosen.
- **Watch, don't chase**:
  - `acertei.com.br` is in the 14/10 round. One free application is cheap, but it already drew 2+ applicants in September.
  - `guardei.app.br` expired on 2026-09-14 and shows as `inactive` in RDAP. It should reach a later release round. Registro.br does not publish when; liberados' "Quando volta" page estimates it. But `guardei.com.br`, `.com` and `.app` all belong to others.
  - `memoriza.com.br` expires on 2026-11-17.
- **Don't** depend on the release process for the primary domain. Its outcome is a lock or a lottery, and a domain is needed before Universal Links can ship (October note P1).

---

## 6. Next steps for the owner (in this order)

1. **Decide the app name** with the product owner: Recitei (recommended), Recita Verso, or Fala Verso. The domain follows the name.
2. **Re-check availability** right before paying. Open `https://registro.br/busca-dominio/?fqdn=recitei.com.br`. It should say "Domínio disponível para registro. R$ 40,00 por 1 ano".
3. **Click "REGISTRAR"** on that page. Log in, or create a Registro.br account ("ACESSAR CONTA"). An adult CPF, birth date, full name, e-mail, phone and Brazilian address are required. Use real data: discrepant data can be penalised. (I entered no data anywhere.)
4. **Choose the period.** I suggest **2 years, R$ 76** (or 5 years, R$ 184) so the domain cannot lapse by accident during launch.
5. **DNS**: keep Registro.br's own DNS servers (the default). The domain is then live within about 5 minutes if there are no pendências. You can point it to the edge provider later.
6. **Pay the same day** by Pix, card (Visa/Mastercard) or boleto. The instructions come in the confirmation e-mail. Expect the "Fatura de Registro" (not a nota fiscal).
7. **Optional, same session**: `recitei.app.br`, another R$ 40.
8. **Buy `recitei.app`** at any ICANN registrar (Porkbun lists US$ 14.93/yr). Check in the cart that it is not priced as premium. Optionally buy `recitei.com` (about US$ 11). Turn on auto-renew and point it as a redirect to `recitei.com.br` once the edge function exists.
9. **Optional: the October round.** On **12/10**, download `https://registro.br/dominio/lista-processo-liberacao.txt` (or use liberados' "Toda a rodada" search) and search for recit, verso, biblia, palavr, decor and guard. Between **14/10 15:00 and 21/10 15:00 BRT**, request any name you want through the same "registrar" flow. It costs nothing to apply, and R$ 40 if you are the only applicant. Your account allows 3 to 200 applications, and an application cannot be withdrawn (liberados).
10. **When the edge function is ready** (ADR 0019):
    - In the Registro.br panel, either change the DNS servers to the provider's (e.g., Cloudflare) or add the provider's records in Registro.br's DNS.
    - Serve `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` over HTTPS.
    - Then update `DEEP_LINK_PREFIX`, `app.json` (`ios.associatedDomains`, Android `intentFilters` with `autoVerify`) and the app's display name together.
11. **When the CNPJ exists**: file a "Transferência de Titularidade" (documents by e-mail; 2 business days of analysis) to move the `.br` domains to the company.
12. **Before the public launch**: run an INPI trademark search for the chosen name (classes 9 and 41 are the usual ones for an app and education; *inference*). This note is not a trademark search.

---

## 7. Sources

All read on **2026-10-09**. Times are UTC.

**Registro.br / NIC.br (primary)**
- Processo de liberação: https://registro.br/dominio/processo-de-liberacao/ (20:09, browser)
- Regras do domínio: https://registro.br/dominio/regras/ (20:10)
- Pagamento de domínio (prices, payment methods, FAQ 1.4, 1.6, 1.10): https://registro.br/ajuda/pagamento-de-dominio/ (20:10)
- Categorias .br (CPF filter shows COM.BR and APP.BR): https://registro.br/dominio/categorias/ (20:11)
- Registro de novos domínios (CPF adult, DNS, 5-minute registration, birth date): https://registro.br/ajuda/registro-de-novos-dominios/ (20:11)
- Procedimentos administrativos (transfer of holder): https://registro.br/ajuda/procedimentos-administrativos/ (20:26)
- Domínio congelado: https://registro.br/ajuda/dominio-congelado/ (20:11)
- Official list, September round (header with dates; 125,453 names): https://registro.br/dominio/lista-processo-liberacao.txt (20:12)
- Auction-eligible list: https://registro.br/dominio/lista-processo-competitivo.txt (20:12)
- Live auctions (empty, "Arquivo gerado em 2026-10-09T17:10:00-03:00"): https://registro.br/dominio/lista-competicao.txt (20:12)
- Availability endpoint used by the registro.br search box: `https://registro.br/v2/ajax/avail/raw/<domínio>` (20:10–20:25). It is undocumented, per liberados.
- Search page confirmations: https://registro.br/busca-dominio/?fqdn=recitei.com.br (20:25), https://registro.br/busca-dominio/?fqdn=acertei.com.br (20:25)
- RDAP: `https://rdap.registro.br/domain/<domínio>` (20:18, for `bibliaia.com.br`, `useverbo.com.br` and `guardei.app.br`)

**liberados.com.br (primary for what it lists; independent of Registro.br)**
- Home: https://liberados.com.br/ (20:07; snapshot "gerado em 09/10/2026 16:53")
- Data: https://liberados.com.br/dados.json (generated 2026-10-09T19:53:18Z), https://liberados.com.br/todos.json (20:07)
- Regras do .br: https://liberados.com.br/regras-do-br/ (20:08; "Atualizado em 02/10/2026")
- Ciclo de vida do .br: https://liberados.com.br/ciclo-de-vida-do-dominio-br/ (20:08)
- Para devs (endpoint and status table): https://liberados.com.br/api-registrobr/ (20:08)

**RDAP and registries**
- Verisign RDAP for `.com`: `https://rdap.verisign.com/com/v1/domain/<name>.com` (20:13–20:23)
- Google Registry RDAP for `.app`: `https://pubapi.registry.google/rdap/domain/<name>.app` (20:13–20:23)
- `.app` HSTS preload status: https://hstspreload.org/api/v2/status?domain=app (20:24)
- `.app` registry page: https://get.app/ → https://www.registry.google/domains/app/ (20:24)
- Example registrar prices: https://porkbun.com/tld/app and https://porkbun.com/tld/com (20:24). These are one registrar's prices; others differ.

**Stores and sites (conflict check, not a trademark search)**
- iTunes Search API: `https://itunes.apple.com/search?term=<name>&country=br&entity=software` (20:20–20:22), plus `country=us` for "recite bible".
- Google Play search: `https://play.google.com/store/search?q=<name>&c=apps&hl=pt-BR&gl=BR` (20:21)
- Sites: https://www.recitebible.com/, https://www.recita.app/en/, https://decorei.app/, https://palavria.com/ (20:22)

**Repo context**: `PRODUCT.md`, `CONTEXT.md`, ADR 0019, ADR 0020, `docs/research/world-class-strategy-and-differentiation.md` §1, `docs/research/feature-and-improvement-opportunities.md` (P1, question 12), `src/utils/deckSharing.ts:20`, `app.json`.

**Not verified**:
- whether any candidate name is a registered trademark (INPI was not searched);
- whether any `.app` name is registry-premium (RDAP does not show prices);
- the exact hour the October list will be published (Registro.br gives only "2 dias antes").
