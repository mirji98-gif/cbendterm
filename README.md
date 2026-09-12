# Confirmshaming Storefront Study

A self-administered web app that runs a controlled confirmshaming experiment end to end: mock
storefront → discount pop-up → silent behavioural logging → questionnaire → debrief → Google Sheet.

Built to the spec in [`PRD_confirmshaming_experiment_app.md`](PRD_confirmshaming_experiment_app.md),
with its questionnaire (§4 and §5) replaced by [`Instrument_v2.md`](Instrument_v2.md) — five
single-item measures per pop-up instead of the original 36, traded for completion at N = 40 on
phones. Everything else (design, storefront, pop-up, event logging, data layer) is unchanged.
Target: **N = 40**, ~6 minutes per participant, mobile-first.

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
{"ok":true,"columns":100,"slots":52}
```

If `columns` does not match what `npm run gen` printed, you pasted a stale `Code.gs`.

**8. Reset before real collection.** After piloting, run `resetAssignmentCursor()` from the Apps
Script editor's function dropdown, and `deleteDebugRows()` to clear pilot rows. Otherwise your first
real participant gets slot 6 and the balance is off from the start.

### Redeploying after a change

Apps Script pins each deployment. To update the live script: *Deploy → Manage deployments → ✏ edit →
Version: New version → Deploy*. Creating a *new deployment* instead gives you a **different URL**,
which is the most common way to end up with data quietly landing in the wrong place.

---

## Links you hand out

```
https://<your-app>.vercel.app/?r=1
```

`?r=1..4` tags which team member recruited that participant, so recruiter effects are checkable
later. Give each member their own number and make sure they use it — `recruiter_id` is blank
otherwise and the check becomes impossible.

Nothing else should be in the link. In particular, do not send `?debug=1` to a participant.

### Debug mode

```
?debug=1                                    live event-log overlay, server assignment
?debug=1&arm=strong&order=exp_first         force a condition
?debug=1&arm=mild&pairing=veloure_neutral   force the brand pairing too
```

The overlay shows the assignment, the current step, the last 14 events with their timestamps, and
both blocks' choices and latencies. Every flag is inert without `debug=1`.

Debug sessions **write real rows** tagged `is_debug=TRUE`, through the ordinary code path — the
alternative is testing a path you don't ship. They are excluded from every admin count; filter them
out of the CSV on `is_debug`, or run `deleteDebugRows()`.

### Admin view

```
https://<your-app>.vercel.app/?admin=1&key=<ADMIN_KEY>
```

Completed vs target per arm, per-cell counterbalance counts, abandonment rate, median duration,
slots consumed, and a CSV download. Refreshes every 30 seconds. Check it on day 3 — that is when
there is still time to fix a cell that is falling behind.

The key is enforced by the Apps Script, not the browser, so a wrong key returns nothing.

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

`analysis/synthetic_sample.csv` is 40 simulated participants following the real assignment sequence,
with a plausible effect built in. It exists so you can run the whole pipeline and build your slide
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
codebook.md                            GENERATED — every column, scale, recoding rule
analysis_starter.R                     recoding verification, difference scores, effect sizes
analysis/
  generated_scales.R                   GENERATED — rated-item text + ordinal mapping for R
  synthetic_sample.csv                 GENERATED — 40 simulated participants
apps-script/Code.gs                    GENERATED — paste into the Apps Script editor
scripts/
  gen-sequence.ts                      the balanced 40-slot design
  gen-apps-script.ts                   Code.gs from the column contract
  gen-codebook.ts                      codebook.md + generated_scales.R
  mock-apps-script.mjs                 runs the real Code.gs locally, under stubs
  roundtrip-test.ts                    26 end-to-end assertions on the data layer
  make-synthetic-csv.ts                the dry-run dataset
src/
  data/items.ts                        THE RATED ITEMS (B1-B4) + downstream choice (B5)
  data/awareness.ts                    the awareness check (screen 10)
  data/comparative.ts                  the comparative block + brand-relative recoding (screen 11)
  data/columns.ts                      THE CSV CONTRACT — 100 columns
  data/conditions.ts                   the four decline wordings, and nothing else per-condition
  data/sequence.ts                     GENERATED — the assignment sequence
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
- [ ] `resetAssignmentCursor()` and `deleteDebugRows()` run after piloting
- [ ] One full run on a real Android phone on mobile data, not just desktop
- [ ] Two pilot participants from outside the group finish without asking a question
- [ ] Both pilot rows have **non-null** `neutral_latency_ms` and `exp_latency_ms`
- [ ] The CSV opens cleanly and `Rscript analysis_starter.R <export>.csv` runs on it
