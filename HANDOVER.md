# Confirmshaming Study — Handover

**CB End-Term · Group 2 · branch `claude/brave-heisenberg-m8zf3f`**

A web app that runs a controlled psychology experiment: a mock storefront where a discount
pop-up appears, and the only thing that changes between participants is the wording of the
decline button. It logs how they respond, questions them, and debriefs them. This document is
what exists, why it's built the way it is, and what's still open.

**Three changes have landed since this app was first built**, each with its own spec doc, each a
patch rather than a rebuild:

- [`Instrument_v2.md`](Instrument_v2.md) replaces the original 36-items-per-block battery with five
  single-item measures per brand, traded for completion on phones. Supersedes PRD §4-5.
- [`change_spec_group_codes.md`](change_spec_group_codes.md) (v3) replaced the app's own
  server-generated assignment sequence with an opaque code in each recruiting link, carrying an
  arm and a recruiter. Supersedes PRD §7's assign endpoint.
- [`change_spec_v4_final.md`](change_spec_v4_final.md) (v4, current) simplifies the link to **arm
  only** (three links, no recruiter), gives each brand **two pop-ups** instead of one — the
  original single, no-cost 15%-off pop-up put acceptance at ceiling, leaving no room for the
  manipulation to show a behavioural difference — and redesigns the storefront to read as a real
  quiet-premium D2C store rather than a prototype.

If you're reading `PRD_confirmshaming_experiment_app.md` too, treat those sections as historical.

| | |
| --- | --- |
| Target N | 45 (15 / 15 / 15 per arm) — see the counterbalancing section for a wrinkle |
| CSV columns | 129 (one row per person; two pop-ups × two blocks now carry their own behavioural columns) |
| Rated items | 8 (4 × two blocks), plus a downstream choice, awareness and a comparative block |
| Pop-ups per session | 4 (2 per brand: checkout + order confirmation) |
| App version | `4.0.0` |
| Bundle | ~70 kB gzipped, plus one external request (Google Fonts) |

---

## Start here: what we're actually measuring

Every participant sees **two** storefronts, each showing **two** discount pop-ups (checkout, then
order confirmation) with identical decline wording within that store. One store's pop-ups always
say a plain *"No thanks."* The other's say one of three loaded variants, assigned
between-subjects. Because each person supplies their own baseline, the primary outcome is a
**within-person difference score** — experimental minus neutral — which strips out every stable
individual difference. That's worth a lot at a sample this size.

The original design had one pop-up per store offering 15% off at no cost — nearly everyone
accepted regardless of condition, so the dependent variable sat at ceiling with no room for the
manipulation to move it. `change_spec_v4_final.md` Part 2 added a second pop-up to each store,
both attaching a real cost to accepting (an email for the checkout one, a follow for the
order-confirmation one) — though neither actually collects anything; accepting just shows a
confirmation message, never a text input.

These four strings are the entire manipulation:

| Condition | Decline wording |
| --- | --- |
| baseline (neutral) | "No thanks" |
| mild | "No thanks, I'll pay full price" |
| strong | "No thanks, I don't need to save money" |
| autonomy | "Not now — I'll decide later" |

Headline, offer, accept label, close "X", button size, contrast, animation and timing are
byte-identical across all four. **Mild and strong are predicted to do different things, not more
of the same thing** — "I'll pay full price" targets a behaviour, "I don't need to save money"
targets a standing attribute of the self. The theory says mild sits near the compliance peak and
strong tips into anger and reactance.

Behavioural measures — decision latency, cancelled taps, whether they used the button or the
"X", dwell time — are the reason this is an app and not a Google Form. They don't exist in a
survey.

---

## Where it stands

| Area | State | Notes |
| --- | --- | --- |
| State machine & full participant flow | ✅ done | Consent → 2 shopping blocks → awareness → comparative → debrief |
| Apps Script + Sheet round-trip | ✅ done | Proven against a local mock of the real `Code.gs` |
| Storefront, product page, pop-up | ✅ done | Inline SVG products, no network images |
| Questionnaire engine (v2) | ✅ done | One screen per block: 4 rated items, fixed order, + downstream choice + optional open-ended |
| Awareness check (screen 10) | ✅ done | Asked once per brand, after both blocks, never quotes a literal decline wording |
| Comparative block (screen 11) | ✅ done | Raw + recoded relative to the experimental brand |
| Admin view + CSV export | ✅ done | `?admin=1&key=…`, live cell counts |
| Group-code assignment | ✅ done | Arm decoded from `?g=` at consent (v4: 3 codes, no recruiter); see `change_spec_v4_final.md` |
| Two pop-ups per brand | ✅ done | Checkout + order-confirmation pop-ups, `p1`/`p2` in the schema; see `change_spec_v4_final.md` |
| Storefront visual redesign | ✅ done | Design tokens, Instrument Sans, 6-product grid; see "Where the bodies are buried" for the one flagged deviation |
| Codebook + R analysis starter | ✅ done | Both generated from the item bank / awareness / comparative modules |
| **Apps Script deployed to Google** | 🟠 open | **The one unverified link.** See "What's actually open." |
| Real-phone QA on mobile data | 🟠 open | Tested in a Pixel 5 emulation only |
| Two pilot runs | 🟠 open | PRD's definition of done |

---

## Running it in fifteen minutes

Node 22 and npm. R only if you want to run the analysis.

**1. Clone and install.**
```bash
git clone https://github.com/mirji98-gif/cbendterm
cd cbendterm
git checkout claude/brave-heisenberg-m8zf3f
npm install
```

**2. Prove the data layer before anything else.** This loads the real generated Apps Script into
a sandbox and asserts things end to end — including that the exported CSV header is
byte-identical to what the app serialises.
```bash
npm run roundtrip
```

**3. Run the app.** It works with no backend configured — arm comes from `?g=<code>` if present,
otherwise a genuine per-participant random draw, and submission fails gracefully into the rescue
screen. Building it requires `VITE_ENDPOINT_URL` to be set (even to a local mock) or the app
reports "endpoint not configured" and every submission fails — see README's Deploy section.
```bash
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run e2e        # full participant in a real browser (builds first)
```

**4. Skip to a condition instead of clicking through.** The overlay shows the assignment, current
step, and the last 14 timestamped events, plus both blocks' pop-up 1 / pop-up 2 choices and
latencies.
```
?debug=1&arm=strong&order=exp_first
```

**5. See the analysis before any data exists.** 45 simulated participants drawn via the real
`GROUP_CODES` table, with a plausible effect built in. Build the slide templates off this.
```bash
Rscript analysis_starter.R analysis/synthetic_sample.csv
```

Full deployment walkthrough — Google Sheet, Apps Script, Vercel, recruiting links — is in
`README.md`, including the three `?g=` links and their code-to-arm mapping. Every column, scale
and recoding rule is in `codebook.md`.

---

## The seven ideas holding it together

If you understand these, the rest of the codebase follows. Each one exists because a specific
thing could otherwise go wrong silently.

### 1. Three small data files, everything else generated

The instrument lives in three files: `src/data/items.ts` (the four rated items and the downstream
choice), `src/data/awareness.ts` (the awareness check), and `src/data/comparative.ts` (the
comparative block, including the brand-relative recoding functions). The codebook, the 99 CSV
columns, and the Sheet header inside `Code.gs` are **all generated from these three**. A recoding
rule cannot drift between the instrument that ran and the analysis that scores it — the drift is
structurally impossible, not merely unlikely.

> Edit any of the three → `npm run gen` → re-paste `Code.gs`

### 2. The condition is one string, and nothing else can become one

`Popup.tsx` reads its headline, subcopy and accept label from `POPUP1_INVARIANT` /
`POPUP2_INVARIANT` constants (one pair per pop-up, since v4 gave each brand two) rather than
receiving them as props — so a per-arm override isn't expressible in the component's interface.
Both buttons share a single class string, so tap target and contrast cannot diverge. They're both
plain outlined buttons: a filled "accept" against an outlined "decline" is itself a dark pattern
and would confound prominence with wording.

> **Flagged, not silently resolved.** `change_spec_v4_final.md` Part 7's redesign literally asks
> for a filled accept button against an outlined decline — which is exactly the pattern its own
> Part 6 (and this section) says is a second dark pattern. Both buttons were kept visually
> identical; only sizing/spacing/tokens were updated for the redesign. See the comment at the top
> of `Popup.tsx` for the full reasoning.

> `src/data/conditions.ts` · `src/screens/Popup.tsx`

### 3. One clock, zeroed on the painted frame

`clock.ts` is the only module in the app that reads a timer. Everything uses
`performance.now()`, which can't jump backwards when a phone syncs its clock. Latency is zeroed
on the first *composited* frame via a double `requestAnimationFrame`, not on mount — measuring at
mount attributes zero cost to rendering and would bias every latency in the study downward.

> `src/instrumentation/clock.ts`

### 4. Checkpoint rows, upserted by participant id

A closed tab sends nothing. So the app posts a partial row after consent and after each block,
keyed by participant id, and the final submit overwrites it. Without this, `abandoned` would
read `FALSE` for 100% of the data — you'd have no attrition number at all, and no partial data
from anyone who dropped at block two.

> `SessionContext.tsx` checkpoints · `Code.gs` `upsert_()`

### 5. One transition table, no router

`session.step` is the only source of truth for what's on screen, and no component computes its
own successor. That's what makes the forced questionnaire order a structural property rather
than a convention — to ask a feeling item after the manipulation item, or to reach the awareness
check right after a single pop-up instead of after both blocks, you'd have to edit the table, not
merely make a mistake in a component.

> `src/machine/steps.ts`

### 6. Comparative answers are recoded relative to CONDITION, not POSITION

Roughly half of participants saw the neutral pop-up on the first brand they visited, half on the
second. The comparative block (screen 11) asks about "Brand 1" / "Brand 2" — presentation
position — but every raw answer is recoded relative to whichever brand carried the experimental
pop-up before it means anything about the manipulation. Get this backwards and every comparative
result is silently wrong for whichever half of the sample had the opposite position/condition
pairing. `src/data/comparative.test.ts` feeds the same raw answer under both `order` values and
asserts the recoded meaning stays fixed to condition while its relationship to position flips.

> `src/data/comparative.ts` · `src/net/serialize.ts` (where the recode is actually applied)

### 7. The link decides the arm, the app never guesses one

Arm is decoded from an opaque `?g=` code at the consent screen — `GROUP_CODES` in
`src/data/groupCodes.ts` is the only place that mapping lives (besides README.md, which stays
out of participants' hands). v4 trimmed this to three codes, one per arm — v3's recruiter
dimension (four recruiters × three arms, twelve codes, a `recruiter_id` column) is gone entirely.
A missing or mistyped code doesn't fall through to any fixed arm — it draws a genuine random one
client-side and records `assignment_source='random'`, so a bad link degrades gracefully instead
of silently biasing the sample toward one condition. The raw code itself is never shown in the UI
or written to the Sheet — only the decoded arm is logged.

> `src/data/groupCodes.ts` · `src/machine/SessionContext.tsx` (`resolveAssignment`)

---

## The tests are the spec

These are experimental-validity constraints, not preferences. Each is enforced by a test, so
breaking one fails the build rather than quietly corrupting the study. The last three are the
three things `Instrument_v2.md` itself calls out as "easy to get wrong."

| Requirement | Enforced by |
| --- | --- |
| The decline wording is the *only* difference between conditions | `Popup.identical.test.tsx` |
| Guilt/irritation measured before the manipulation item; no back navigation | `machine/steps.test.ts` |
| Every event stamped from one clock | `instrumentation/clock.test.ts` |
| No progress bar or study cue during the shopping steps | `machine/steps.test.ts` |
| Awareness asked once per brand, only after both blocks; never quotes a literal decline wording | `machine/steps.test.ts` |
| Brand-trust item is level-framed, not change-framed | `machine/steps.test.ts` |
| Comparative recoding is relative to condition, not presentation position | `data/comparative.test.ts` |
| Each of the three group codes decodes to its exact arm | `data/groupCodes.test.ts` |
| A missing/unrecognised code never falls back to a fixed arm | `data/groupCodes.test.ts` |
| Group codes are matched case-insensitively, whitespace trimmed | `data/groupCodes.test.ts` |
| Both of a block's pop-ups are identical across arms once decline wording is neutralised | `Popup.identical.test.tsx` |
| Both of a block's pop-ups show the SAME decline wording (never mixed) | `Popup.identical.test.tsx` |
| checkout→confirm→continuation→block runs in order for both blocks | `machine/steps.test.ts` |

**If one of these fails, do not update it to pass.** It's telling you the manipulation has been
confounded, and there is no statistical fix for that after collection. The identical-pop-up test
was deliberately broken during development to confirm it isn't vacuous — adding a slightly
smaller font to just the strong condition made it fail and name that condition.

The clock test works by stripping comments and string literals from every source file, then
grepping for `Date.now` and `performance.now` outside `clock.ts`. If you add a timer somewhere,
that's what will catch you.

---

## The counterbalancing, and how assignment actually works now

> **Superseded mechanism, kept for history.** Until `change_spec_group_codes.md` (v3), arm came
> from a pre-generated, seeded sequence served one slot at a time by the Apps Script under a
> script lock — that's why `ARM_TARGETS` still reads 13/13/14 rather than 15/15/15, and why the
> repo still has a vestigial `sequence.ts` and `?action=assign` endpoint. v3 then added a
> recruiter dimension (twelve codes, `recruiter_id`) that v4 (`change_spec_v4_final.md`) removed
> again. None of that machinery is live any more; the paragraphs below describe the mechanism that
> actually runs today.

Arm is decoded from the recruiting link's group code (`?g=<code>`, `src/data/groupCodes.ts`), not
assigned by the app. **Three codes exist as of v4 — one per arm, no recruiter dimension** (v3 had
twelve: four recruiters × three arms, plus a `recruiter_id` column — `change_spec_v4_final.md`
Part 1 dropped that entirely). Order (neutral-first vs experimental-first) and brand pairing are
**not** counterbalanced by a sequence any more: each is drawn with a plain `Math.random()` per
participant, because exact per-cell balance on these nuisance factors was judged not worth
reintroducing server-side state for. A participant who consents and then drops doesn't burn a
reserved slot — there's nothing to reserve — so no insurance-slot bookkeeping is needed either.

The target N is 45 (15/15/15 per arm) — with only one link per arm now, there's no recruiter-split
arithmetic wrinkle left; just send that arm's link until it's full. `ARM_TARGETS` in
`src/data/conditions.ts` was **not** updated for this change — it still reads 13/13/14, the old
design's target — since neither change spec ever asked for that constant to move. Treat the admin
view's per-arm progress bars as stale until someone updates it; the true target is 15/15/15, and
`analysis_starter.R`'s cell-count table is the place to actually check the mix as data comes in.

---

## Decisions already argued out

These deviate from the PRD (or from v1 of the instrument) deliberately. Each is listed with its
reasoning in `codebook.md` §11 so the write-up can state it rather than discover it. Please don't
quietly revert them.

| PRD / v1 said | Built as | Because |
| --- | --- | --- |
| 72 rated items across 9 multi-item scales | 8 rated items + downstream choice + comparative block | `Instrument_v2.md`: reliability traded for completion at N=40 on phones |
| Cronbach's alpha per scale | None | No multi-item scale exists in v2 to compute alpha over |
| `mode:'no-cors'` POST | CORS-simple `text/plain` POST | An opaque response resolves successfully even on a 500, so the retry-and-rescue logic the PRD also asks for could never have fired |
| `*_abandoned` per block | Session-level, plus `abandoned_at_step` | People abandon a session, not a pop-up |
| `cancelled_taps` includes `pointercancel` | Two separate columns | On Android `pointercancel` fires on every scroll; merged, the column would mostly measure scrolling |
| Continuation "6s or until action" | Live at 0s, auto-advance at 8s, censoring flagged | Ambiguous between a floor and a ceiling, which give different dwell distributions |
| `abandon` code, no threshold | `timeout` at 45s | Without a timeout a frozen participant loses the entire row |
| ~6 minutes (v1: stated 8–10 due to item load) | Consent states ~6 minutes again | v2's much shorter instrument (~23 items vs ~80) makes the original estimate realistic |
| Arm assigned by the app (pre-generated sequence via `?action=assign`) | Arm decoded from the link's `?g=` group code (one code per arm as of v4); order/pairing drawn per participant | `change_spec_group_codes.md` / `change_spec_v4_final.md`: link-based control gets a clean split without server-side state |
| One pop-up per brand | Two pop-ups per brand (checkout + order confirmation), same decline wording within a brand | `change_spec_v4_final.md` Part 2: the original no-cost 15%-off pop-up put acceptance at ceiling, leaving no room for the manipulation to show a behavioural difference |

---

## Where the bodies are buried

Things that will bite you, in rough order of how much damage they'd do.

> **Redeploying the Apps Script is a trap.** To update the live script use *Deploy → Manage
> deployments → edit → New version*. Creating a *new deployment* instead gives you a **different
> URL**, which is the most common way to end up with data quietly landing somewhere nobody is
> looking.

- **Four files are generated — don't hand-edit them.** `apps-script/Code.gs`,
  `src/data/sequence.ts`, `codebook.md`, `analysis/generated_scales.R`. Change the source and run
  `npm run gen`. If you change columns, you must re-paste `Code.gs` and deploy a new version.
  `sequence.ts` (and the `assign`/`resetAssignmentCursor` machinery in `Code.gs`) is now
  vestigial — still generated and still tested, but nothing in the live app reads it.
- **`resetAssignmentCursor()` has nothing left to reset.** It was needed before real collection
  under the old sequence-based mechanism; under group codes there's no cursor, so skip it. Still
  run `deleteDebugRows()` before real collection.
- **Debug sessions write real rows**, tagged `is_debug=TRUE`, through the ordinary code path —
  deliberately, because the alternative is testing a path you don't ship. They're excluded from
  every admin count. Filter on that column, or run the cleanup function.
- **Cancelled taps use `elementFromPoint`, not the event target.** Touch pointers get implicit
  capture, so a finger sliding off a button still fires `pointerup` on that button. Checking
  `e.target` would report zero cancelled taps on every phone in the sample. Don't "simplify"
  this.
- **A mid-session reload nulls that block's timing on purpose.** Re-showing an answered pop-up
  would produce a clean-looking, entirely meaningless latency. A flagged null beats a plausible
  lie — the row carries `resumed_after_reload=TRUE`.
- **Press-dwell will be a noisy near-constant on touch.** There's no hover, and tap duration is
  reflex rather than deliberation. `latency_ms` and `time_to_first_touch_ms` are the variables
  that carry the argument. Worth a line in the limitations slide.
- **There's no cut-tier system in v2** — that was a v1 mechanism for a 72-item instrument. If
  piloting still runs long, cut a question directly in `items.ts` / `comparative.ts` and
  regenerate; there isn't enough left to justify a tiered system.
- **The comparative block is corroborating evidence, not primary evidence.** Asking participants
  to compare the two pop-ups directly makes the manipulation salient. If it ever contradicts the
  within-person behavioural results, believe the behavioural data — say this explicitly if you
  present both.

---

## What's actually open

Good places to pick up, roughly in the order they block progress.

> **Deploy and verify the Apps Script — this is the critical one.** The round-trip is proven
> against a faithful local sandbox running the real `Code.gs`, but *not* against Google's actual
> servers. The `text/plain` CORS-simple POST is a well-established Apps Script pattern, but it
> hasn't been confirmed on a live deployment. Follow the README, then open
> `<EXEC_URL>?action=ping` — it should return `{"ok":true,"columns":129,"slots":52}` (`slots` is
> vestigial — see "The counterbalancing" above). If it doesn't, `?action=verify&pid=` is already
> wired as a fallback path.

- **Real-device QA.** One full run on an actual Android phone on mobile data, not desktop, not
  an emulator. Watch for anything that inflates `popup_render_gap_ms` past the 2-second exclusion
  threshold.
- **Two pilot runs** with people outside the group. The PRD's definition of done: they finish
  without asking a single question, both rows land with non-null timing, and the CSV opens
  cleanly.
- **Confirm the stated duration** (`STATED_DURATION` in `src/data/copy.ts`, currently "about 6
  minutes") against what the pilots actually take, and adjust if it drifts.
- **Two unresolved study-design calls.** The brand names aren't matched — "Aurevella" vs "Maison
  Veloure" differ in length, syllables and how luxury-coded they read. Counterbalancing removes
  the bias but not the variance, and that variance lands on the primary outcome. And the category
  was narrowed to fragrance and small accessories, no apparel, because appearance-domain stimuli
  induce self-conscious emotion at baseline — the very thing the manipulation is meant to move.
  Both are Adi's calls, both are cheap to change before recruiting and impossible after.
- **`ARM_TARGETS` still reads 13/13/14, not 15/15/15.** Deliberately left as-is — the group-code
  spec never asked for it to move — but it means the admin view's progress bars target the old
  N=40 design. Cosmetic only; doesn't affect assignment. Fix it if the admin view starts being
  used to judge whether recruiting is on track.
- **No live count of `random`-fallback assignments in the admin view.** Adding one would mean
  changing `Code.gs`'s stats endpoint, which the group-code spec explicitly says is out of scope.
  Until then, use Download CSV + `analysis_starter.R`, which already reports it.
- **Pop-up button styling deliberately ignores one line of `change_spec_v4_final.md` Part 7.**
  The redesign spec asks for a filled accept button against an outlined decline; that's exactly
  the pattern Part 6 (and this app's whole design) calls a second dark pattern that confounds
  wording with prominence. Both buttons were kept visually identical instead — see idea #2 above
  and the comment in `Popup.tsx`. Flagged for the study team to confirm, not silently overridden.
- **Real product photography was not sourced.** Part 7 asks for "real product images... committed
  locally rather than hotlinking." This session had no reliable way to source and license actual
  photography inside a sandboxed environment, so the existing inline-SVG product illustrations
  (`src/components/ProductArt.tsx`) were kept and restyled to the new tokens instead. Swap in real
  photos before this goes out to real participants if photorealism matters to the write-up —
  the illustrations are honest placeholders, not a finished asset.
- **Instrument Sans (Google Fonts) is one deliberate external network call** in an app that
  otherwise makes none. `font-display: swap` means a blocked or slow request degrades to the
  system-ui fallback with no functional break (confirmed: it failed outright in this session's
  sandbox and the app kept working, just in the fallback font) — but it's a real, if small,
  tension with the "nothing breaks mid-study on a bad connection" principle the rest of the app
  follows. Worth knowing about before a pilot on a flaky connection.

---

## Map of the repo

*Italic paths are generated — don't edit them by hand.*

```
PRD_confirmshaming_experiment_app.md   the original spec
Instrument_v2.md                       replaces PRD §4-5 — the shortened questionnaire
README.md                              deployment, debug mode, the three arm links, checklist
codebook.md                            GENERATED — every column, scale, recoding rule, deviation
analysis_starter.R                     recoding verification, difference scores, effect sizes
apps-script/Code.gs                    GENERATED — paste this into the Apps Script editor

src/data/
  items.ts                             ← THE RATED ITEMS + downstream choice, per brand. Start here.
  awareness.ts                         the awareness check (screen 10)
  comparative.ts                       the comparative block + brand-relative recoding (screen 11)
  groupCodes.ts                        the ?g= code → arm table (3 codes, v4). Never ship this to participants.
  columns.ts                           the 129-column CSV contract (p1/p2 per pop-up)
  conditions.ts                        the four wordings + both pop-ups' invariant copy
  sequence.ts                          GENERATED, VESTIGIAL — the old 52-slot assignment sequence, unused
  brands.ts copy.ts config.ts

src/machine/                           steps, reducer, persistence, session provider
src/instrumentation/                   clock.ts (the only timer) · popupTelemetry.ts (per pop-up)
src/net/                               api.ts transport · serialize.ts row builder (recoding happens here)
src/screens/                           one component per step, incl. the new OrderConfirmation

scripts/
  gen-*.ts                             the generators behind npm run gen
  mock-apps-script.mjs                 runs the real Code.gs locally under stubs
  roundtrip-test.ts                    assertions on the data layer
  e2e-smoke.mjs                        real browser, real row, four pop-ups exercised
  make-synthetic-csv.ts                the dry-run dataset

analysis/
  generated_scales.R                   GENERATED — rated-item text + ordinal mapping for R
  synthetic_sample.csv                 GENERATED — 45 simulated participants
```

---

Seven commits on `claude/brave-heisenberg-m8zf3f`. Read `README.md` for deployment and
`codebook.md` before touching the instrument.
