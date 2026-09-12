# Confirmshaming Storefront Study

A self-administered web app that runs a controlled confirmshaming experiment end to end: mock
storefront → discount pop-up → silent behavioural logging → questionnaire → debrief → Google Sheet.

Built to the spec in [`PRD_confirmshaming_experiment_app.md`](PRD_confirmshaming_experiment_app.md),
with its questionnaire (§4 and §5) replaced by [`Instrument_v2.md`](Instrument_v2.md) — five
single-item measures per pop-up instead of the original 36, traded for completion at N = 40 on
phones — and its arm assignment replaced by
[`change_spec_group_codes.md`](change_spec_group_codes.md) — arm and recruiter now come from an
opaque code in the recruiting link instead of a server-generated sequence. Everything else
(storefront, pop-up, event logging, questionnaire, debrief) is unchanged.
Target: **N = 45** (15/15/15 per arm), ~6 minutes per participant, mobile-first.

---

## The things that must not drift

These are experimental-validity requirements, and each is enforced by a test rather than by care.
`npm test` fails if any of them is broken.

| Requirement | Enforced by |
| --- | --- |
| The decline wording is the **only** difference between conditions | `src/screens/Popup.identical.test.tsx` renders all four conditions, blanks the decline label, asserts byte-identical DOM |
| Feelings (guilt, irritation) are measured before the manipulation item; no back navigation | `src/machine/steps.test.ts` |
| Every event carries a `performance.now()` stamp from one clock | `src/instrumentation/clock.test.ts` greps the source for `Date.now` / `performance.now` outside `clock.ts` |
| No progress bar or study cue during the shopping steps | `src/machine/steps.test.ts` |
| Awareness is asked once per brand, only after BOTH blocks; never quotes a literal decline wording | `src/machine/steps.test.ts` |
| The brand-trust item is level-framed, not change-framed | `src/machine/steps.test.ts` |
| Comparative answers are recoded relative to the experimental brand, never presentation position | `src/data/comparative.test.ts` |

If a test here fails, do not update it to pass. It is telling you the manipulation has been
confounded, and there is no statistical fix for that after collection.

---

## Quick start

```bash
npm install
npm run gen          # regenerate sequence, Apps Script, codebook
npm run roundtrip    # prove the data layer works, offline
npm run dev          # http://localhost:5173
npm test
```

`npm run roundtrip` loads the real generated `apps-script/Code.gs` into a VM with Apps Script stubs
and asserts 26 properties end to end — including that the exported CSV header is byte-identical to
the client's column list. Run it after any change to the item bank or column contract.

---

## Deploy the Apps Script

**1. Create the Sheet.** New Google Sheet, name it anything. The script creates the `Responses` and
`AssignLog` tabs itself on first use.

**2. Open the editor.** *Extensions → Apps Script*. Delete the stub `Code.gs` contents.

**3. Paste the script.** Copy **all** of [`apps-script/Code.gs`](apps-script/Code.gs) in. It is a
generated file — if you need to change the logic, edit `scripts/apps-script.template.gs` and run
`npm run gen:appsscript`, don't edit the output.

**4. Set the admin key.** Near the top:

```js
var ADMIN_KEY = 'CHANGE_ME_BEFORE_DEPLOYING';
```

Replace it with any random string. This guards the stats and CSV-export endpoints. The script
refuses those endpoints outright while the placeholder is still there.

**5. Deploy.** *Deploy → New deployment → ⚙ → Web app*:

| Field | Value |
| --- | --- |
| Execute as | **Me** |
| Who has access | **Anyone** |

"Anyone" is required — participants are not signed in. Authorise when prompted; Google will warn
that the app is unverified, which is expected for a personal script. Copy the `/exec` URL.

**6. Paste the URL into the app.** Either put it in `src/data/config.ts`:

```ts
export const ENDPOINT_URL: string = 'https://script.google.com/macros/s/AKfy.../exec';
```

…or, better, set it as an environment variable so it is not committed:

```bash
echo 'VITE_ENDPOINT_URL=https://script.google.com/macros/s/AKfy.../exec' > .env.local
```

On Vercel, add `VITE_ENDPOINT_URL` under *Settings → Environment Variables* and redeploy.

**7. Check it.** Open `<YOUR_EXEC_URL>?action=ping` in a browser. You should see:

```json
{"ok":true,"columns":99,"slots":52}
```

If `columns` does not match what `npm run gen` printed, you pasted a stale `Code.gs`. (`slots` is
vestigial — see "Links you hand out" below; the client no longer calls `?action=assign`, but the
Apps Script itself is unmodified and still serves it, so this still confirms nothing is broken.)

**8. Reset before real collection.** Run `deleteDebugRows()` from the Apps Script editor's function
dropdown after piloting, to clear pilot rows. (`resetAssignmentCursor()` also still exists but has
nothing to reset for the current mechanism — arm no longer comes from a slot counter.)

### Redeploying after a change

Apps Script pins each deployment. To update the live script: *Deploy → Manage deployments → ✏ edit →
Version: New version → Deploy*. Creating a *new deployment* instead gives you a **different URL**,
which is the most common way to end up with data quietly landing in the wrong place.

---

## Links you hand out

Arm and recruiter now come from an opaque code in the link itself
([`change_spec_group_codes.md`](change_spec_group_codes.md)), not from the app. Twelve links, one
per recruiter × arm combination:

```
https://<your-app>.vercel.app/?g=k7m2      recruiter 1, arm mild
https://<your-app>.vercel.app/?g=r4xn      recruiter 1, arm strong
https://<your-app>.vercel.app/?g=b9qt      recruiter 1, arm autonomy
https://<your-app>.vercel.app/?g=w3fe      recruiter 2, arm mild
https://<your-app>.vercel.app/?g=p6hd      recruiter 2, arm strong
https://<your-app>.vercel.app/?g=z2vc      recruiter 2, arm autonomy
https://<your-app>.vercel.app/?g=m8ju      recruiter 3, arm mild
https://<your-app>.vercel.app/?g=t5ya      recruiter 3, arm strong
https://<your-app>.vercel.app/?g=n1ls      recruiter 3, arm autonomy
https://<your-app>.vercel.app/?g=d7or      recruiter 4, arm mild
https://<your-app>.vercel.app/?g=h4gw      recruiter 4, arm strong
https://<your-app>.vercel.app/?g=c9ib      recruiter 4, arm autonomy
```

Each recruiter gets their own three links (one per arm) and sends people to whichever one hits the
arm you still need — that mix of links, sent to different friends, is what gets each arm drawing
from all four recruiters' circles instead of one arm coming entirely from one person's friends. The
target is **15 completed participants per arm**; watch `Rscript analysis_starter.R`'s arm × recruiter
table (or `Download CSV` from the admin view) to see how each recruiter's links are landing and steer
accordingly.

> **The code-to-arm mapping above must never reach a participant.** The codes are opaque
> specifically so nobody can infer their condition from the link — don't paste this table, or
> `src/data/groupCodes.ts`, anywhere a participant could see it (a shared doc, a group chat they're
> also in, a public repo issue). Sharing it defeats the point of the codes.

A mistyped or missing code doesn't break anything — the participant is still assigned an arm
uniformly at random (never a fixed default), just with `assignment_source = "random"` and a blank
`recruiter_id`. Test that a link actually works before sending it out; a typo silently downgrades
that participant to the random path rather than failing loudly.

### Debug mode

```
?debug=1                                    live event-log overlay, assignment from ?g= as normal
?debug=1&arm=strong&order=exp_first         force a condition (overrides ?g=, if present)
?debug=1&arm=mild&pairing=veloure_neutral   force the brand pairing too
```

The overlay shows the assignment, the recruiter, the current step, the last 14 events with their
timestamps, and both blocks' choices and latencies. Every flag is inert without `debug=1`. Debug
forcing takes priority over a group code — `?debug=1&g=k7m2&arm=strong` runs as `strong`, not
`mild` — but `?debug=1&g=k7m2` alone (no `arm=`/`order=`/`pairing=`) resolves the group code
normally and just adds the overlay, which is the easiest way to sanity-check a link before sending
it out.

Debug sessions **write real rows** tagged `is_debug=TRUE`, through the ordinary code path — the
alternative is testing a path you don't ship. They are excluded from every admin count; filter them
out of the CSV on `is_debug`, or run `deleteDebugRows()`.

### Admin view

```
https://<your-app>.vercel.app/?admin=1&key=<ADMIN_KEY>
```

Completed vs target per arm, per-cell counterbalance counts (order × pairing, still meaningful —
those are still drawn per participant, just no longer from a pre-generated sequence), abandonment
rate, median duration, and a CSV download. Refreshes every 30 seconds. Check it on day 3 — that is
when there is still time to steer a recruiter toward whichever arm is falling behind.

The key is enforced by the Apps Script, not the browser, so a wrong key returns nothing. The admin
view has no live count of arm × recruiter mix or of `random`-fallback assignments — the Apps Script
wasn't changed to compute those (see `codebook.md` §8) — so check those via Download CSV +
`analysis_starter.R`, which reports both.

**Note:** the per-arm target shown here still reads 13/13/14 (N=40) — the constant in
`src/data/conditions.ts` was intentionally left as-is since nothing in the change spec asked for it
to move, even though the actual goal under the group-code scheme is 15/15/15 (N=45). Update
`ARM_TARGETS` there (and re-run `npm run gen`) if you want the admin view and R output to show 15
instead.

---

## Analysis

```bash
Rscript analysis_starter.R analysis/synthetic_sample.csv   # dry run, before any real data
Rscript analysis_starter.R path/to/your_export.csv         # the real thing
```

Base R only — nothing to install. It verifies the app's own recoding (difference scores and the
comparative block's brand-relative recodes — see below), recomputes the response-type coding, and
compares the three arms on the four rated items and the downstream choice with Hedges' *g* and 95%
CIs. There is no Cronbach's alpha section: Instrument v2 has no multi-item scale to compute it over.
Output lands in `analysis/output/`.

`analysis/synthetic_sample.csv` is 45 simulated participants (15/15/15 across arms, distributed
across all four recruiters via the real `GROUP_CODES` table, plus two `random`-fallback rows), with
a plausible effect built in. It exists so you can run the whole pipeline and build your slide
templates **before** collecting a single response. Regenerate with
`npx tsx scripts/make-synthetic-csv.ts`. The numbers in it are invented — do not read anything into
them.

The rated-item text and the downstream-choice ordinal mapping live in `analysis/generated_scales.R`,
generated from the item bank. Don't edit it: change `src/data/items.ts` and run `npm run gen`.

**The comparative block (screen 11) is corroborating evidence, not primary evidence.** Asking
participants to compare the two pop-ups directly makes the manipulation salient. Primary evidence is
the behavioural logs and the B1–B5 difference scores. If the comparative section contradicts them,
believe the behavioural data — `codebook.md` §6 and the R script both say so where that section
prints.

---

## Changing the instrument

The rated items live in **`src/data/items.ts`**; the awareness check in **`src/data/awareness.ts`**;
the comparative block (including the brand-relative recoding functions) in
**`src/data/comparative.ts`**. `codebook.md`, the CSV columns and `analysis/generated_scales.R` are
all generated from these three files, so they cannot drift.

```bash
# edit src/data/items.ts, awareness.ts or comparative.ts
npm run gen        # regenerates codebook.md, Code.gs, generated_scales.R
npm run roundtrip  # confirms the client and the sheet header still agree
```

Then **re-paste `apps-script/Code.gs`** and deploy a new version. If you change columns without
redeploying, the Apps Script appends the unknown columns rather than dropping them — but the sheet
order will no longer match the codebook.

Instrument v2 has no burden-cut-tier system (that was a v1 mechanism for a 72-item instrument). If
piloting still runs long, cut a question directly and regenerate — there isn't enough left to
justify a tiered system.

---

## Deploy the app

Static build, no server:

```bash
npm run build     # → dist/
```

Vercel: import the repo, framework preset **Vite**, add `VITE_ENDPOINT_URL`, deploy. Build output
is ~69 kB gzipped with no external requests — the product illustrations are inline SVG, so the
storefront paints instantly on mobile data and never shows a loading state. That matters beyond
polish: an image still decoding when the pop-up fires would inflate `popup_render_gap_ms` and push
sessions over the exclusion threshold.

---

## Project structure

```
PRD_confirmshaming_experiment_app.md   the original spec
Instrument_v2.md                       replaces PRD §4-5 — the shortened questionnaire
change_spec_group_codes.md             replaces PRD §7's assign endpoint — link-based assignment
codebook.md                            GENERATED — every column, scale, recoding rule
analysis_starter.R                     recoding verification, difference scores, effect sizes
analysis/
  generated_scales.R                   GENERATED — rated-item text + ordinal mapping for R
  synthetic_sample.csv                 GENERATED — 45 simulated participants
apps-script/Code.gs                    GENERATED — paste into the Apps Script editor (assign/slot
                                        endpoints are now vestigial — the client no longer calls them)
scripts/
  gen-sequence.ts                      the (now-vestigial) balanced 40-slot design
  gen-apps-script.ts                   Code.gs from the column contract
  gen-codebook.ts                      codebook.md + generated_scales.R
  mock-apps-script.mjs                 runs the real Code.gs locally, under stubs
  roundtrip-test.ts                    29 end-to-end assertions on the data layer
  make-synthetic-csv.ts                the dry-run dataset
src/
  data/groupCodes.ts                   THE CODE-TO-ARM MAP — must never reach a participant
  data/items.ts                        THE RATED ITEMS (B1-B4) + downstream choice (B5)
  data/awareness.ts                    the awareness check (screen 10)
  data/comparative.ts                  the comparative block + brand-relative recoding (screen 11)
  data/columns.ts                      THE CSV CONTRACT — 99 columns
  data/conditions.ts                   the four decline wordings, and nothing else per-condition
  data/sequence.ts                     GENERATED — vestigial; kept only because Code.gs embeds it
  data/{brands,copy,config}.ts
  machine/                             steps, reducer, persistence, session provider
  instrumentation/clock.ts             the only timer in the app
  instrumentation/popupTelemetry.ts    latency, cancelled taps, rage taps, dwell
  net/{api,serialize}.ts               transport and the row builder (recoding happens here)
  screens/                             one component per step
```

---

## Deviations from the PRD / v1 instrument

Each is deliberate, and each is listed with its reasoning in [`codebook.md`](codebook.md) §11 so the
write-up can state it rather than discover it. The ones that matter most:

- **Group-code assignment** ([`change_spec_group_codes.md`](change_spec_group_codes.md)) replaces
  the pre-generated-sequence `assign` endpoint with an opaque `?g=` code in each recruiting link
  that decodes to an arm and a recruiter. `order`/`pairing` are now drawn per participant with
  `Math.random()` instead of from the sequence — exact balance isn't required for those, only that
  they vary. `slot` is removed from the schema entirely.
- **Instrument v2** replaces the original 36-items-per-block battery with five single-item measures
  per pop-up ([`Instrument_v2.md`](Instrument_v2.md)). Traded away: Cronbach's alpha, the credibility
  axis, brand attributions, the guilt/anger/amusement factor structure. Kept: perceived manipulation,
  irritation (the mediator), brand trust, a downstream behavioural choice, awareness, and the
  within-person difference score.
- **`mode: 'no-cors'` → CORS-simple `text/plain` POST.** An opaque response resolves successfully
  even when the server returned a 500, so the retry-and-rescue logic the PRD also asks for could
  never have fired. A dropped row would have been indistinguishable from a saved one.
- **Checkpoint rows.** The app posts a partial row after consent and after each block, upserted by
  `participant_id`. A closed tab sends nothing, so without this `abandoned` would be `FALSE` for
  100% of the data.

---

## Before you collect real data

- [ ] `ADMIN_KEY` changed in `Code.gs`, and the deployment is a **Web app / Execute as Me / Anyone**
- [ ] `?action=ping` returns the same column count `npm run gen` printed
- [ ] `VITE_ENDPOINT_URL` set in Vercel, and a test submission lands in the Sheet
- [ ] Each of the twelve `?g=` links opened once (with `&debug=1` added, so it doesn't count as a
      real participant) and confirmed to show the right arm and recruiter in the overlay
- [ ] `deleteDebugRows()` run after piloting
- [ ] One full run on a real Android phone on mobile data, not just desktop
- [ ] Two pilot participants from outside the group finish without asking a question
- [ ] Both pilot rows have **non-null** `neutral_latency_ms` and `exp_latency_ms`
- [ ] The CSV opens cleanly and `Rscript analysis_starter.R <export>.csv` runs on it
- [ ] The twelve links are with the four recruiters and NOT anywhere participants could see the
      code-to-arm mapping
