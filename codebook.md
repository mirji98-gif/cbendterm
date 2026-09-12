# Codebook — Confirmshaming Storefront Study (Instrument v2)

> **GENERATED FILE — do not edit by hand.**
> Source: `src/data/items.ts`, `src/data/awareness.ts`, `src/data/comparative.ts` and
> `src/data/columns.ts`. Regenerate with `npm run gen:codebook`.
> Because the CSV, this codebook and `analysis/generated_scales.R` are all produced from those
> files, they cannot describe an instrument different from the one actually administered.

One row per participant. **144 columns.**

This is **Instrument v2** (see `Instrument_v2.md`, which replaces PRD §4 and §5). It trades the
v1 multi-item, multi-factor battery (72 rated items, Cronbach's alpha, five factors) for five
single-item measures per brand (change_spec_v4_final.md Part 4 moved the stems from pop-up level to
brand level once each brand started showing two pop-ups), to protect completion on phones. **What's kept:**
perceived manipulation, irritation (the mediator), brand trust, a downstream behavioural choice,
awareness, and the within-person difference score. **What's given up:** Cronbach's alpha, the
credibility axis, brand attributions, and the guilt/anger/amusement factor structure. State this
trade-off in the limitations slide — "single-item measures were used to protect completion rates
at N = 40" is a defensible sentence.

---

## 1. The rated items (B1–B4), in fixed presentation order

No randomisation within the block: with only four items, "feelings before intent" is a per-item
ordering constraint, and shuffling risks putting the manipulation item before irritation by chance.

| # | Item | Wording | Scale | Note |
| --- | --- | --- | --- | --- |
| 1 | `b1_guilt` | I felt guilty about declining this brand's offers. | 7-point intensity, 1 = not at all … 7 = very strongly | Keeps H1 testable — without a guilt item there is no basis for calling this a guilt appeal, which is the entire premise of the Peng et al. prediction. Worded as guilt about DECLINING, not about the brand. change_spec_v4_final.md Part 4 moves the stem to brand level: with two pop-ups per brand now sharing the same decline wording, "this brand's offers" (plural) is the accurate referent, not any single pop-up. |
| 2 | `b2_irritation` | I felt irritated by the way this brand presented its offers. | 7-point intensity, 1 = not at all … 7 = very strongly | THE MEDIATOR. Per Coulter & Pinto (1995), anger/irritation — not felt guilt — carries the damage to trust and purchase intention. Treat this as the mediator in analysis, not a descriptive aside. |
| 3 | `b3_manipulation` | The way this brand presented its offers was intended to pressure me into accepting. | 7-point Likert, 1 = strongly disagree … 7 = strongly agree | Tests H3 (perceived manipulative intent). |
| 4 | `b4_trust` | I would trust this brand. | 7-point Likert, 1 = strongly disagree … 7 = strongly agree | Deliberately LEVEL-framed, not change-framed ("compared with before" etc.). The within-person difference score (experimental − neutral) is what measures the trust penalty; if the item itself also contained a comparison, the two would nest and become uninterpretable. A level item also lets trust go UP, which H4 predicts for the autonomy arm — a change-framed item cannot detect that. |

**No item is reverse-coded.** None of the four items are worded in the opposite direction to their
construct, so `analysis_starter.R` does no reverse-coding pass — a change from v1, where the IMI
battery needed it.

**`b4_trust` is deliberately level-framed** ("I would trust this brand"), not change-framed. The
within-person difference score (`diff_b4_trust` = exp − neutral) is what measures the trust
penalty; a change-framed item would nest with that difference and become uninterpretable. A level
item also lets trust go **up** in the autonomy arm, which H4 predicts — a change-framed item cannot
detect that.

## 2. Downstream choice (B5)

> If you were actually shopping for this type of product, which would you be most likely to do after this experience?

Stored raw (`b5_raw`) **and** as a derived ordinal (`b5_ord`), so it can be differenced like the
rated items:

| Option | Ordinal |
| --- | --- |
| Buy from this brand (`buy`) | 3 |
| Consider buying from this brand, but compare alternatives first (`compare`) | 2 |
| Probably choose a competing brand instead (`competitor`) | 1 |
| I would avoid buying either way (`avoid`) | 0 |
| Not sure (`not_sure`) | NA |

With 13 per arm the raw five-way cross-tab will have cells of two or three people. Report
`diff_b5` (the ordinal difference score) as the headline, the raw cross-tab as colour.

## 3. Open-ended (B6)

> What, if anything, stood out to you about the way this brand presented its offers?

Optional, skippable immediately — no minimum length, no forced wait (a deliberate departure from
v1's OpenEnded screen, which had both; v2 measures this per block instead of once at the end).

## 4. Questionnaire order (forced, no back navigation)

1. **Block A** — B1–B6, for the first pop-up shown
2. **Block B** — B1–B6, identical, for the second pop-up shown
3. **Awareness** — asked once per brand, retrospectively, after BOTH blocks
4. **Comparative** — C1–C6
5. **Covariates**, then **demographics**

Feelings (`b1_guilt`, `b2_irritation`) are always measured before the item that names pressure or
intent (`b3_manipulation`), inside each block — the Campbell (1995) / Cotte et al. (2005) demand-
effect constraint carried over from v1.

## 5. Awareness check (asked twice, after both blocks)

> Which statement best describes the decline option that <brand name> showed you?

Never asked immediately after a pop-up: an immediate check on pop-up A would prime the participant
for pop-up B and destroy the "Ignore" classification for the second brand.

**The stem and options never quote a literal decline wording.** The neutral condition's button
literally reads "No thanks" — quoting any condition verbatim would cue the answer for whoever saw
that exact wording. Options are descriptions of what the wording implied:

| Condition | Statement offered |
| --- | --- |
| `neutral` | It was a neutral way to decline the offer |
| `mild` | It suggested that declining meant missing out financially |
| `strong` | It suggested that declining reflected something negative about me |
| `autonomy` | It encouraged me to decide later |
| `dont_remember` | I don't remember / didn't notice the wording |

Options are shuffled per participant per question (first four only — "don't remember" is always
last). Stored **by presentation position** (`aware_brand1_raw`, `aware_brand2_raw`, meaning
"first store visited" / "second store visited" — NOT condition), then correctness is recoded **by
condition** (`aware_neutral_correct`, `aware_exp_correct`) since position and condition are
independently counterbalanced. "Don't remember" counts as incorrect.

## 6. Comparative block (screen 11)

> **This block is corroborating evidence, not primary evidence.** Asking participants to compare
> the two pop-ups directly makes the manipulation salient and invites them to construct a
> difference they may not have felt. Primary evidence is the behavioural logs and the B1–B5
> difference scores, both collected before this block exists. **If this block contradicts the
> behavioural data, believe the behavioural data.**

| # | Stem | Type |
| --- | --- | --- |
| C1 | Thinking about the two offers you just saw, which brand's pop-up felt more like it was trying to pressure you into accepting? | Brand 1 / Brand 2 / both / neither / don't remember |
| C2 | After seeing both offers, which brand would you trust more? | Brand 1 / Brand 2 / both / neither |
| C3 | Compared with {BRAND2}, how much do you trust {BRAND1}? | 1 = Much less … 4 = About the same … 7 = Much more |
| C4 | If you had to choose one of these brands for your next purchase, which would you choose? | Brand 1 / Brand 2 / compare further / neither |
| C5 | Overall, how would you rate your experience with {BRAND1} compared with {BRAND2}? | 1 = Much worse … 4 = About the same … 7 = Much better |
| C6 | Thinking about both brands, what was the biggest difference you noticed between the two experiences? | Open-ended, optional |

### 6.1 Brand 1 / Brand 2 mean PRESENTATION POSITION, not condition

Roughly half of participants saw the neutral pop-up on the first brand and half on the second.
Every raw comparative answer is stored as an actual brand id, and **must be recoded relative to
`brand_experimental`, never interpreted as "Brand 1 vs Brand 2" directly.**

### 6.2 Recoding — generated by calling the functions, not hand-typed

`recodeBrandChoice(raw, expBrand)` — feeds C1, C2 and C4 (`src/data/comparative.ts`):

| Raw answer | Recodes to (when Aurevella is `brand_experimental`) |
| --- | --- |
| `aurevella` | 1 |
| `veloure` | 0 |
| `both` | 0 |
| `neither` | 0 |
| `compare_further` | 0 |
| `dont_remember` | NA |

Note that `both` / `neither` / `compare_further` all recode to **0**, not NA — only C1's
"don't remember" recodes to NA. This is the instrument's literal rule, not an oversight.

`recodeComparativeScale(raw, expBrandIsPositionTwo)` — feeds C3 and C5:

| Raw | If Brand 1 is the NEUTRAL brand (reverse: `8 − raw`) | If Brand 1 is the EXPERIMENTAL brand (unchanged) |
| --- | --- | --- |
| 1 | 7 | 1 |
| 4 | 4 | 4 |
| 7 | 1 | 7 |

`expBrandIsPositionTwo` is simply `order === 'neutral_first'`: neutral-first means position 1 is
the neutral brand, so the experimental brand is Brand 2 and the raw scale must reverse to keep
"high = more, relative to the experimental brand" true regardless of presentation order.

## 7. Conditions

| Condition | Decline-button wording |
| --- | --- |
| `neutral` | "No thanks" |
| `mild` | "No thanks, I’ll pay full price" |
| `strong` | "No thanks, I don’t need to save money" |
| `autonomy` | "Not now — I’ll decide later" |

**This wording is the only difference between arms.** Headline, offer, accept label, close
"X", tap-target size, contrast, animation and timing are identical, enforced by
`src/screens/Popup.identical.test.tsx`.

## 8. Two pop-ups per brand (v4)

Each brand now shows **two** pop-ups (change_spec_v4_final.md Part 2), not one: **p1** fires on
checkout intent (add-to-bag), exactly as the single pop-up used to; **p2** fires on a new
order-confirmation screen that follows p1. Both of a brand's pop-ups carry that brand's decline
wording — **never mixed within a brand** — so every per-pop-up column below is duplicated as
`_p1_` / `_p2_`, while fields that describe the block rather than either pop-up (`condition`,
`brand`, `block_position`, `decline_label`, `product_viewed`, `time_on_store_ms`) stay singular.

Both pop-ups' copy references collecting contact details (an email for p1's discount, a follow for
p2's), but **neither actually collects anything**: no text input is ever rendered, nothing typed is
ever stored, and accepting simply shows a confirmation message on the following screen before
moving on. `neutral_accepts` / `exp_accepts` / `diff_accepts` count how many of a block's two
pop-ups were accepted (0–2), as a second, purely behavioural outcome alongside the rated-item
difference scores.

## 9. Assignment mechanism

**Arm comes from the recruiting link, not from the app** (change_spec_v4_final.md, v4). Each
participant's link carries an opaque `?g=` code; decoding it (`src/data/groupCodes.ts`) gives the
arm directly — v4 drops the recruiter dimension entirely, so there is no `recruiter_id` column.
The exact code-to-arm table is deliberately **not** reproduced here — see `README.md` (kept by the
study team, never shared with participants) and the source file itself. A missing or unrecognised
code never falls back to a fixed arm: the client draws one uniformly at random and records
`assignment_source = "random"`, so that count is visible and reportable as a limitation rather than
silently stacking participants into one condition.

`order` and `pairing` are nuisance factors, not the allocation being controlled, so they are drawn
per participant with `Math.random()` rather than from a pre-generated sequence — exact balance
across cells isn't required, only that they vary.

> **Superseded, twice over.** Before change_spec_group_codes.md (v3), a pre-generated, seeded
> 52-slot sequence was served one slot at a time by the Apps Script's `assign` endpoint, which
> guaranteed an exact 13/13/14 split — that endpoint still exists in `apps-script/Code.gs` (the
> script was left unmodified) but nothing calls it any more; do not treat `?action=assign` as live,
> it is vestigial. v3 then replaced that sequence with a `?g=` code carrying BOTH an arm and a
> recruiter (four recruiters × three arms, twelve codes) and a `recruiter_id` column. v4
> (change_spec_v4_final.md) drops the recruiter dimension entirely — three links, one per arm, no
> recruiter attribution, no `recruiter_id` column.

## 10. Response-type coding (derived, never asked)

Computed once PER POP-UP. Recomputed in R from `choice`, `latency_ms` and awareness correctness,
so the threshold can be re-tuned:

| Behaviour | Code | Interpretation |
| --- | --- | --- |
| Accepts the offer | `comply` | Short-term effectiveness |
| Taps the loaded decline button | `resist` | Deliberate confrontation; reactance |
| Closes via "X" / backdrop, or times out | `avoid` | Shame avoidance rather than offer rejection |
| Dismissal < 1500 ms **and** fails the awareness check | `ignore` | Tactic passed unnoticed |

## 11. Exclusion rules

Apply before analysis:

1. `is_debug == TRUE` — pilot and debug runs. Always exclude.
2. `status != "complete"` — dropouts. Keep them to report the abandonment rate, exclude from
   outcome models.
3. `*_p1_popup_render_gap_ms > 2000` or `*_p2_popup_render_gap_ms > 2000` — a pop-up that took
   over 2 s to paint makes THAT pop-up's latency uninterpretable. Apply per pop-up, not per block.
4. `resumed_after_reload == TRUE` **with null timing** — the participant reloaded mid-measurement.
   Self-report is still usable; the affected pop-up's behavioural columns are null by design.
5. `assignment_source == "random"` — the participant's link had a missing or unrecognised group
   code, so the client picked an arm uniformly at random. Not part of the intended 15/15/15
   allocation. Report the count as a limitation rather than dropping silently.
6. `*_p1_abandoned == TRUE` or `*_p2_abandoned == TRUE` on an otherwise-`complete` row should not
   happen (a complete row means every pop-up resolved) — treat it as a bug if seen, not as data to
   exclude.

## 12. Deviations from the PRD / v1 instrument

Each is deliberate; each is here so the write-up can state it rather than discover it.

| PRD / v1 says | Implemented as | Why |
| --- | --- | --- |
| Arm assigned by the app (pre-generated sequence via the Apps Script) | Arm decoded from the recruiting link's `?g=` group code; `order`/`pairing` drawn per participant | change_spec_group_codes.md (v3), refined by change_spec_v4_final.md (v4): a clean split needs each arm drawing from an independent link, which only link-based control can guarantee. `slot` and (as of v4) `recruiter_id` are removed from the schema entirely. |
| One pop-up per brand | Two pop-ups per brand (checkout + order confirmation), same decline wording within a brand | change_spec_v4_final.md Part 2: the original 15%-off-at-no-cost pop-up put acceptance at ceiling, leaving no room for the manipulation to show a behavioural difference. Both new pop-ups attach a cost to accepting. |
| 72 rated items, 9 multi-item scales | 8 rated items (B1–B4 × 2 blocks) + downstream choice + comparative block | Instrument v2 (`Instrument_v2.md`): reliability traded for completion at N = 40 on phones. |
| Cronbach's alpha per scale | None — every rated item is single-item | No multi-item scale exists in v2 to compute alpha over. |
| Recognition check, immediate options | Awareness check, descriptive (non-literal) options, still asked after both blocks | Both v1 and v2 ask retrospectively; v2's options describe the wording's implication rather than quoting it, so no option can cue the participant who saw that exact condition. |
| `mode: 'no-cors'` POST | CORS-simple `text/plain` POST | An opaque response resolves successfully even on a 500, making retry-and-rescue logic unreachable. Unaffected by the v1→v2 instrument change. |
| `*_abandoned` per block | Session-level `abandoned` + `abandoned_at_step`, PLUS a per-pop-up `*_p1_abandoned`/`*_p2_abandoned` (v4) | A participant abandons a session, not a pop-up — but with two pop-ups per block now, which specific pop-up was never reached is itself useful information a single session-level flag can't give. |
| `cancelled_taps` includes `pointercancel` | Split into `cancelled_taps` and `pointer_cancels` | On Android `pointercancel` fires on every scroll. |
| Continuation "6 s or until action" | Live from 0 s, auto-advance at 8 s, censoring flagged | Ambiguous between a floor and a ceiling. |
| `abandon` response code, no threshold | `timeout` at 45 s | Without a timeout a frozen participant loses the entire row. |
| ~6 minutes (v1: 8–10 due to item load) | Consent states `about 6 minutes` again | v2's much shorter instrument (~23 items total vs ~80) makes the original PRD estimate realistic. Confirm against pilot times. |

## 13. All columns

### Session identity

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `participant_id` | string | — | Client-generated UUID, minted at consent. Upsert key — a checkpoint row and the final row share it. |
| `app_version` | string | — | Build identifier, so a mid-fieldwork change is detectable in the data. 4.2.0 is the locked-pairing build. |
| `status` | enum | `complete`, `incomplete` | complete = participant reached submit. incomplete = a checkpoint row that was never superseded, i.e. the participant dropped out. Never a silent partial row: every incomplete row also carries abandoned=TRUE and abandoned_at_step. |
| `is_debug` | bool | — | TRUE for ?debug=1 sessions. Debug runs write real rows through the real code path, so they are filterable rather than deletable-by-memory. Exclude them from every count. |
| `started_at` | iso8601 | — | Wall clock at consent, UTC. Phone clocks can be skewed — do not compute durations from this. |
| `submitted_at` | iso8601 | — | Wall clock at submit, UTC. |
| `received_at` | iso8601 | — | Server-side receipt time, written by the Apps Script. Compare with submitted_at to detect device clock skew. |
| `duration_s` | float | — | Consent → submit, computed from performance.now() deltas rather than wall clock, so a device clock jump cannot corrupt it. |
| `device` | string | — | Full user-agent string. Needed to interpret timing: mobile jank makes latency noisy, and device class is the first thing to check when it does. |
| `viewport` | string | — | CSS pixel viewport at start, "WxH". |
| `dpr` | float | — | devicePixelRatio at session start. Together with viewport it reconstructs the physical size the participant actually saw the pop-up at. |
| `touch` | bool | — | TRUE if the device reported touch support. Press-dwell is near-meaningless when TRUE (no hover on touch). |
| `abandoned` | bool | — | TRUE when the row is a checkpoint that was never superseded by a completed submit. Session-level because a participant abandons a session, not a pop-up. See the per-pop-up `*_abandoned` columns for which specific pop-ups were never reached. |
| `abandoned_at_step` | string | — | Last step reached before the session stopped, as of the moment this row was written. Blank for completed sessions. |
| `resumed_after_reload` | bool | — | TRUE if the participant reloaded mid-session and state was restored from localStorage. When the interrupted step was a pop-up, confirmation or continuation screen, that pop-up’s timing fields are NULL by design — never re-measured, because a re-rendered pop-up produces a clean-looking but meaningless latency. |

### Condition identity

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `group_code` | enum | `k7m2`, `p6hd`, `n1ls`, `` | The raw ?g= value as received, when it decoded to an arm. Empty when the link carried no code or an unrecognised one — in which case assignment_source is "random". Recorded in the dataset only; never rendered anywhere a participant could see it. |
| `arm` | enum | `mild`, `strong`, `autonomy` | Between-subjects framing arm, decoded from the recruiting link. |
| `assignment_source` | enum | `group_code`, `random`, `debug` | group_code = arm decoded from a valid ?g= link. random = the code was missing or unrecognised, so the client picked an arm uniformly at random (never a fixed default). debug = forced via ?debug=1, which also sets is_debug. |
| `order` | enum | `neutral_first`, `exp_first` | Which store the participant visited first. Randomised per session. Also determines which brand is "Brand 1" / "Brand 2" in the comparative block. |
| `pairing` | enum | `locked_aurevella_neutral` | Brand-condition pairing. CONSTANT BY DESIGN as of change_spec_v4_2: Aurevella always carried the neutral pop-ups and Maison Veloure the experimental ones. Written on every row so the dataset documents the design rather than leaving it to be inferred. Brand is therefore confounded with condition — see README limitations. |
| `brand_neutral` | string | — | Brand that showed the neutral pop-ups. Always Aurevella. |
| `brand_experimental` | string | — | Brand that showed the experimental (arm) pop-ups. Always Maison Veloure. This is `exp_brand` in the recoding rules below. |
| `decline_text_neutral` | string | — | The literal decline-button string shown on both neutral pop-ups, written from the same constant the pop-up renders. Records what the participant actually saw rather than a label pointing at code that may since have changed — if a wording bug ever ships, this column is how you find out. |
| `decline_text_experimental` | string | — | The literal decline-button string shown on both experimental pop-ups, written from the same constant the pop-up renders. Must correspond to `arm` on every row; analysis_starter.R asserts this and refuses to run if it does not. |

### Behavioural — neutral block

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `neutral_condition` | enum | `neutral`, `mild`, `strong`, `autonomy` | Pop-up condition shown by both of this block's pop-ups. Redundant with arm+prefix; kept so each block row is self-describing. |
| `neutral_brand` | string | — | Brand shown in this block. |
| `neutral_block_position` | enum | `1`, `2` | Whether this block was seen first or second. Derivable from `order`; stored to make order effects trivial to model. |
| `neutral_decline_label` | string | — | The exact decline-button string this participant saw on BOTH of this block's pop-ups (change_spec_v4_final.md Part 2: decline wording is constant within a brand). Stored verbatim as a provenance check that the manipulation rendered as intended. |
| `neutral_product_viewed` | string | — | SKU the participant added to the bag. |
| `neutral_time_on_store_ms` | float | — | Storefront entry → add-to-bag. Engagement/investment proxy (Campbell 1995: personal investment drives inferences of manipulative intent). |

### Behavioural — neutral block, checkout pop-up

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `neutral_p1_brand` | enum | `Aurevella`, `Maison Veloure` | Which store showed this pop-up. Fixed by condition as of v4.2 — Aurevella for the neutral pair, Maison Veloure for the experimental pair. |
| `neutral_p1_ask` | enum | `email`, `social_follow` | What this pop-up asked for in exchange for the discount: an email address at checkout (p1) or a social follow after purchase (p2). Neither is ever actually collected. |
| `neutral_p1_position` | enum | `1`, `2`, `3`, `4` | Where this pop-up fell in the session, 1-4. Derived from `order`. THIS IS WHAT LETS YOU TEST FATIGUE: with four pop-ups, acceptance very likely declines across the session, and without position that decline cannot be separated from condition. |
| `neutral_p1_choice` | enum | `accept`, `decline_button`, `close_x`, `backdrop`, `timeout` | How this pop-up was resolved. `timeout` = no committed action within the pop-up timeout (45s). |
| `neutral_p1_response_code` | enum | `comply`, `resist`, `avoid`, `ignore` | Derived coding. Recomputed in analysis_starter.R from choice + latency + awareness so the Ignore threshold can be re-tuned; the stored value uses 1500 ms. |
| `neutral_p1_latency_ms` | float | — | This pop-up fully rendered → first committed action. A primary behavioural DV. NULL means data loss, not "no response". |
| `neutral_p1_time_to_first_touch_ms` | float | — | Pop-up rendered → first pointerdown anywhere in the modal. |
| `neutral_p1_cancelled_taps` | int | — | pointerdown on a control → pointerup OUTSIDE that control. A deliberate slide-off: the participant started to press and changed their mind. This is the reactance-relevant signal. |
| `neutral_p1_pointer_cancels` | int | — | pointercancel events, logged SEPARATELY from cancelled_taps. On Android pointercancel fires whenever a touch becomes a scroll, so folding it into cancelled_taps would make that column largely a measure of scrolling. |
| `neutral_p1_press_dwell_ms` | float | — | Total pressed-but-not-released time on the decline button. Expect a noisy near-constant on touch devices — there is no hover, and tap-press duration is reflex rather than deliberation. |
| `neutral_p1_post_dismiss_dwell_ms` | float | — | For p1: time on the order-confirmation screen before pop-up 2 renders (necessarily short — there is no participant action in between). For p2: time on the real continuation screen before advancing. |
| `neutral_p1_continuation_auto_advanced` | bool | — | p2 only: TRUE if the continuation screen timed out at 8s rather than being dismissed. Marks p2_post_dismiss_dwell_ms as ceiling-censored. Always FALSE for p1, which has no auto-advance concept. |
| `neutral_p1_scroll_events` | int | — | Scroll events while this pop-up was open. |
| `neutral_p1_rage_taps` | int | — | Runs of ≥3 pointerdowns within 500 ms inside a 48 px box. Cheap frustration proxy. |
| `neutral_p1_popup_render_gap_ms` | float | — | Trigger action (add-to-bag for p1; pop-up 1 resolving for p2) → this pop-up's first painted frame (double-rAF after mount). Sessions with a >2s render gap are excluded (see codebook §10). |
| `neutral_p1_abandoned` | bool | — | TRUE when this pop-up was never resolved (choice is blank) — either because the row is a checkpoint the participant dropped out of before reaching it, or dropped after it rendered but before responding. Always FALSE on a complete row. |

### Behavioural — neutral block, order-confirmation pop-up

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `neutral_p2_brand` | enum | `Aurevella`, `Maison Veloure` | Which store showed this pop-up. Fixed by condition as of v4.2 — Aurevella for the neutral pair, Maison Veloure for the experimental pair. |
| `neutral_p2_ask` | enum | `email`, `social_follow` | What this pop-up asked for in exchange for the discount: an email address at checkout (p1) or a social follow after purchase (p2). Neither is ever actually collected. |
| `neutral_p2_position` | enum | `1`, `2`, `3`, `4` | Where this pop-up fell in the session, 1-4. Derived from `order`. THIS IS WHAT LETS YOU TEST FATIGUE: with four pop-ups, acceptance very likely declines across the session, and without position that decline cannot be separated from condition. |
| `neutral_p2_choice` | enum | `accept`, `decline_button`, `close_x`, `backdrop`, `timeout` | How this pop-up was resolved. `timeout` = no committed action within the pop-up timeout (45s). |
| `neutral_p2_response_code` | enum | `comply`, `resist`, `avoid`, `ignore` | Derived coding. Recomputed in analysis_starter.R from choice + latency + awareness so the Ignore threshold can be re-tuned; the stored value uses 1500 ms. |
| `neutral_p2_latency_ms` | float | — | This pop-up fully rendered → first committed action. A primary behavioural DV. NULL means data loss, not "no response". |
| `neutral_p2_time_to_first_touch_ms` | float | — | Pop-up rendered → first pointerdown anywhere in the modal. |
| `neutral_p2_cancelled_taps` | int | — | pointerdown on a control → pointerup OUTSIDE that control. A deliberate slide-off: the participant started to press and changed their mind. This is the reactance-relevant signal. |
| `neutral_p2_pointer_cancels` | int | — | pointercancel events, logged SEPARATELY from cancelled_taps. On Android pointercancel fires whenever a touch becomes a scroll, so folding it into cancelled_taps would make that column largely a measure of scrolling. |
| `neutral_p2_press_dwell_ms` | float | — | Total pressed-but-not-released time on the decline button. Expect a noisy near-constant on touch devices — there is no hover, and tap-press duration is reflex rather than deliberation. |
| `neutral_p2_post_dismiss_dwell_ms` | float | — | For p1: time on the order-confirmation screen before pop-up 2 renders (necessarily short — there is no participant action in between). For p2: time on the real continuation screen before advancing. |
| `neutral_p2_continuation_auto_advanced` | bool | — | p2 only: TRUE if the continuation screen timed out at 8s rather than being dismissed. Marks p2_post_dismiss_dwell_ms as ceiling-censored. Always FALSE for p1, which has no auto-advance concept. |
| `neutral_p2_scroll_events` | int | — | Scroll events while this pop-up was open. |
| `neutral_p2_rage_taps` | int | — | Runs of ≥3 pointerdowns within 500 ms inside a 48 px box. Cheap frustration proxy. |
| `neutral_p2_popup_render_gap_ms` | float | — | Trigger action (add-to-bag for p1; pop-up 1 resolving for p2) → this pop-up's first painted frame (double-rAF after mount). Sessions with a >2s render gap are excluded (see codebook §10). |
| `neutral_p2_abandoned` | bool | — | TRUE when this pop-up was never resolved (choice is blank) — either because the row is a checkpoint the participant dropped out of before reaching it, or dropped after it rendered but before responding. Always FALSE on a complete row. |

### Behavioural — experimental block

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `exp_condition` | enum | `neutral`, `mild`, `strong`, `autonomy` | Pop-up condition shown by both of this block's pop-ups. Redundant with arm+prefix; kept so each block row is self-describing. |
| `exp_brand` | string | — | Brand shown in this block. |
| `exp_block_position` | enum | `1`, `2` | Whether this block was seen first or second. Derivable from `order`; stored to make order effects trivial to model. |
| `exp_decline_label` | string | — | The exact decline-button string this participant saw on BOTH of this block's pop-ups (change_spec_v4_final.md Part 2: decline wording is constant within a brand). Stored verbatim as a provenance check that the manipulation rendered as intended. |
| `exp_product_viewed` | string | — | SKU the participant added to the bag. |
| `exp_time_on_store_ms` | float | — | Storefront entry → add-to-bag. Engagement/investment proxy (Campbell 1995: personal investment drives inferences of manipulative intent). |

### Behavioural — experimental block, checkout pop-up

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `exp_p1_brand` | enum | `Aurevella`, `Maison Veloure` | Which store showed this pop-up. Fixed by condition as of v4.2 — Aurevella for the neutral pair, Maison Veloure for the experimental pair. |
| `exp_p1_ask` | enum | `email`, `social_follow` | What this pop-up asked for in exchange for the discount: an email address at checkout (p1) or a social follow after purchase (p2). Neither is ever actually collected. |
| `exp_p1_position` | enum | `1`, `2`, `3`, `4` | Where this pop-up fell in the session, 1-4. Derived from `order`. THIS IS WHAT LETS YOU TEST FATIGUE: with four pop-ups, acceptance very likely declines across the session, and without position that decline cannot be separated from condition. |
| `exp_p1_choice` | enum | `accept`, `decline_button`, `close_x`, `backdrop`, `timeout` | How this pop-up was resolved. `timeout` = no committed action within the pop-up timeout (45s). |
| `exp_p1_response_code` | enum | `comply`, `resist`, `avoid`, `ignore` | Derived coding. Recomputed in analysis_starter.R from choice + latency + awareness so the Ignore threshold can be re-tuned; the stored value uses 1500 ms. |
| `exp_p1_latency_ms` | float | — | This pop-up fully rendered → first committed action. A primary behavioural DV. NULL means data loss, not "no response". |
| `exp_p1_time_to_first_touch_ms` | float | — | Pop-up rendered → first pointerdown anywhere in the modal. |
| `exp_p1_cancelled_taps` | int | — | pointerdown on a control → pointerup OUTSIDE that control. A deliberate slide-off: the participant started to press and changed their mind. This is the reactance-relevant signal. |
| `exp_p1_pointer_cancels` | int | — | pointercancel events, logged SEPARATELY from cancelled_taps. On Android pointercancel fires whenever a touch becomes a scroll, so folding it into cancelled_taps would make that column largely a measure of scrolling. |
| `exp_p1_press_dwell_ms` | float | — | Total pressed-but-not-released time on the decline button. Expect a noisy near-constant on touch devices — there is no hover, and tap-press duration is reflex rather than deliberation. |
| `exp_p1_post_dismiss_dwell_ms` | float | — | For p1: time on the order-confirmation screen before pop-up 2 renders (necessarily short — there is no participant action in between). For p2: time on the real continuation screen before advancing. |
| `exp_p1_continuation_auto_advanced` | bool | — | p2 only: TRUE if the continuation screen timed out at 8s rather than being dismissed. Marks p2_post_dismiss_dwell_ms as ceiling-censored. Always FALSE for p1, which has no auto-advance concept. |
| `exp_p1_scroll_events` | int | — | Scroll events while this pop-up was open. |
| `exp_p1_rage_taps` | int | — | Runs of ≥3 pointerdowns within 500 ms inside a 48 px box. Cheap frustration proxy. |
| `exp_p1_popup_render_gap_ms` | float | — | Trigger action (add-to-bag for p1; pop-up 1 resolving for p2) → this pop-up's first painted frame (double-rAF after mount). Sessions with a >2s render gap are excluded (see codebook §10). |
| `exp_p1_abandoned` | bool | — | TRUE when this pop-up was never resolved (choice is blank) — either because the row is a checkpoint the participant dropped out of before reaching it, or dropped after it rendered but before responding. Always FALSE on a complete row. |

### Behavioural — experimental block, order-confirmation pop-up

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `exp_p2_brand` | enum | `Aurevella`, `Maison Veloure` | Which store showed this pop-up. Fixed by condition as of v4.2 — Aurevella for the neutral pair, Maison Veloure for the experimental pair. |
| `exp_p2_ask` | enum | `email`, `social_follow` | What this pop-up asked for in exchange for the discount: an email address at checkout (p1) or a social follow after purchase (p2). Neither is ever actually collected. |
| `exp_p2_position` | enum | `1`, `2`, `3`, `4` | Where this pop-up fell in the session, 1-4. Derived from `order`. THIS IS WHAT LETS YOU TEST FATIGUE: with four pop-ups, acceptance very likely declines across the session, and without position that decline cannot be separated from condition. |
| `exp_p2_choice` | enum | `accept`, `decline_button`, `close_x`, `backdrop`, `timeout` | How this pop-up was resolved. `timeout` = no committed action within the pop-up timeout (45s). |
| `exp_p2_response_code` | enum | `comply`, `resist`, `avoid`, `ignore` | Derived coding. Recomputed in analysis_starter.R from choice + latency + awareness so the Ignore threshold can be re-tuned; the stored value uses 1500 ms. |
| `exp_p2_latency_ms` | float | — | This pop-up fully rendered → first committed action. A primary behavioural DV. NULL means data loss, not "no response". |
| `exp_p2_time_to_first_touch_ms` | float | — | Pop-up rendered → first pointerdown anywhere in the modal. |
| `exp_p2_cancelled_taps` | int | — | pointerdown on a control → pointerup OUTSIDE that control. A deliberate slide-off: the participant started to press and changed their mind. This is the reactance-relevant signal. |
| `exp_p2_pointer_cancels` | int | — | pointercancel events, logged SEPARATELY from cancelled_taps. On Android pointercancel fires whenever a touch becomes a scroll, so folding it into cancelled_taps would make that column largely a measure of scrolling. |
| `exp_p2_press_dwell_ms` | float | — | Total pressed-but-not-released time on the decline button. Expect a noisy near-constant on touch devices — there is no hover, and tap-press duration is reflex rather than deliberation. |
| `exp_p2_post_dismiss_dwell_ms` | float | — | For p1: time on the order-confirmation screen before pop-up 2 renders (necessarily short — there is no participant action in between). For p2: time on the real continuation screen before advancing. |
| `exp_p2_continuation_auto_advanced` | bool | — | p2 only: TRUE if the continuation screen timed out at 8s rather than being dismissed. Marks p2_post_dismiss_dwell_ms as ceiling-censored. Always FALSE for p1, which has no auto-advance concept. |
| `exp_p2_scroll_events` | int | — | Scroll events while this pop-up was open. |
| `exp_p2_rage_taps` | int | — | Runs of ≥3 pointerdowns within 500 ms inside a 48 px box. Cheap frustration proxy. |
| `exp_p2_popup_render_gap_ms` | float | — | Trigger action (add-to-bag for p1; pop-up 1 resolving for p2) → this pop-up's first painted frame (double-rAF after mount). Sessions with a >2s render gap are excluded (see codebook §10). |
| `exp_p2_abandoned` | bool | — | TRUE when this pop-up was never resolved (choice is blank) — either because the row is a checkpoint the participant dropped out of before reaching it, or dropped after it rendered but before responding. Always FALSE on a complete row. |

### Self-report — neutral block

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `neutral_b1_guilt` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) | I felt guilty about declining this brand's offers. *Keeps H1 testable — without a guilt item there is no basis for calling this a guilt appeal, which is the entire premise of the Peng et al. prediction. Worded as guilt about DECLINING, not about the brand. change_spec_v4_final.md Part 4 moves the stem to brand level: with two pop-ups per brand now sharing the same decline wording, "this brand's offers" (plural) is the accurate referent, not any single pop-up.* |
| `neutral_b2_irritation` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) | I felt irritated by the way this brand presented its offers. *THE MEDIATOR. Per Coulter & Pinto (1995), anger/irritation — not felt guilt — carries the damage to trust and purchase intention. Treat this as the mediator in analysis, not a descriptive aside.* |
| `neutral_b3_manipulation` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | The way this brand presented its offers was intended to pressure me into accepting. *Tests H3 (perceived manipulative intent).* |
| `neutral_b4_trust` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | I would trust this brand. *Deliberately LEVEL-framed, not change-framed ("compared with before" etc.). The within-person difference score (experimental − neutral) is what measures the trust penalty; if the item itself also contained a comparison, the two would nest and become uninterpretable. A level item also lets trust go UP, which H4 predicts for the autonomy arm — a change-framed item cannot detect that.* |
| `neutral_b5_raw` | enum | `buy`, `compare`, `competitor`, `avoid`, `not_sure` | Downstream behavioural choice: what the participant says they would do next. |
| `neutral_b5_ord` | int | — | Ordinal recode of b5_raw: buy=3, compare=2, competitor=1, avoid=0, not_sure=blank. Feeds diff_b5. |

### Self-report — experimental block

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `exp_b1_guilt` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) | I felt guilty about declining this brand's offers. *Keeps H1 testable — without a guilt item there is no basis for calling this a guilt appeal, which is the entire premise of the Peng et al. prediction. Worded as guilt about DECLINING, not about the brand. change_spec_v4_final.md Part 4 moves the stem to brand level: with two pop-ups per brand now sharing the same decline wording, "this brand's offers" (plural) is the accurate referent, not any single pop-up.* |
| `exp_b2_irritation` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) | I felt irritated by the way this brand presented its offers. *THE MEDIATOR. Per Coulter & Pinto (1995), anger/irritation — not felt guilt — carries the damage to trust and purchase intention. Treat this as the mediator in analysis, not a descriptive aside.* |
| `exp_b3_manipulation` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | The way this brand presented its offers was intended to pressure me into accepting. *Tests H3 (perceived manipulative intent).* |
| `exp_b4_trust` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | I would trust this brand. *Deliberately LEVEL-framed, not change-framed ("compared with before" etc.). The within-person difference score (experimental − neutral) is what measures the trust penalty; if the item itself also contained a comparison, the two would nest and become uninterpretable. A level item also lets trust go UP, which H4 predicts for the autonomy arm — a change-framed item cannot detect that.* |
| `exp_b5_raw` | enum | `buy`, `compare`, `competitor`, `avoid`, `not_sure` | Downstream behavioural choice: what the participant says they would do next. |
| `exp_b5_ord` | int | — | Ordinal recode of b5_raw: buy=3, compare=2, competitor=1, avoid=0, not_sure=blank. Feeds diff_b5. |

### Awareness

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `aware_brand1_raw` | enum | `neutral`, `mild`, `strong`, `autonomy`, `dont_remember` | Which statement the participant chose for the brand shown FIRST (position 1, not condition). |
| `aware_brand2_raw` | enum | `neutral`, `mild`, `strong`, `autonomy`, `dont_remember` | Same, for the brand shown SECOND (position 2). |
| `aware_neutral_correct` | bool | — | TRUE if the participant correctly identified the statement for whichever brand carried the NEUTRAL pop-ups (recoded by condition, not position). "Don't remember" counts as incorrect. |
| `aware_exp_correct` | bool | — | Same, for the brand that carried the EXPERIMENTAL pop-ups. Feeds the "Ignore" response code. |

### Comparative

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `c1_raw` | enum | `aurevella`, `veloure`, `both`, `neither`, `dont_remember` | Raw answer: which brand's pop-ups felt more manipulative. A brand id, or a sentinel (both, neither, dont_remember). |
| `c2_raw` | enum | `aurevella`, `veloure`, `both`, `neither` | Raw answer: which brand the participant would trust more. |
| `c3_raw` | int | 1 = much less … 4 = about the same … 7 = much more | Raw answer: trust in Brand 1 (position 1) compared with Brand 2 (position 2). NOT yet relative to condition — see c3_recoded. |
| `c4_raw` | enum | `aurevella`, `veloure`, `compare_further`, `neither` | Raw answer: which brand the participant would choose for their next purchase. |
| `c5_raw` | int | 1 = much worse … 4 = about the same … 7 = much better | Raw answer: overall experience with Brand 1 compared with Brand 2. NOT yet relative to condition — see c5_recoded. |

### Comparative — recoded

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `c1_exp_more_manipulative` | bool | — | c1_raw == brand_experimental. Blank if c1_raw is "dont_remember". |
| `c2_trust_exp_more` | bool | — | c2_raw == brand_experimental. "Both"/"neither" recode to FALSE per the instrument's literal rule, not blank. |
| `c3_recoded` | int | — | c3_raw, reversed (8 − raw) when the experimental brand was Brand 2. Reads as "trust in the experimental brand relative to the neutral brand" regardless of presentation order. |
| `c4_choose_exp` | bool | — | c4_raw == brand_experimental. "Compare further"/"neither" recode to FALSE per the instrument's literal rule. |
| `c5_recoded` | int | — | c5_raw, reversed (8 − raw) when the experimental brand was Brand 2. Reads as "experience with the experimental brand relative to the neutral brand" regardless of presentation order. |

### Covariates

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `popup_freq` | enum | `1`, `2`, `3`, `4`, `5` | How often do you see discount pop-ups when shopping online? 1 = never … 5 = very often. |
| `dp_awareness` | enum | `yes`, `no`, `not_sure` | Before today, had you come across the term 'dark patterns'? |
| `shopping_freq` | enum | `1`, `2`, `3`, `4`, `5` | How often do you shop online? 1 = rarely or never … 5 = several times a week. |

### Demographics

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `age_band` | enum | `18_24`, `25_34`, `35_44`, `45_plus`, `prefer_not` | Self-reported age band. Collected as a band rather than a number so no participant is individually identifiable in a small sample. |
| `gender` | enum | `woman`, `man`, `non_binary`, `prefer_not` | Self-reported gender, including a prefer-not-to-say option. Covariate only; the design is not powered to test gender differences at this sample size. |
| `occupation` | enum | `student`, `working`, `both`, `other` | Student / working status. |

### Difference scores

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `diff_b1_guilt` | float | — | exp_b1_guilt − neutral_b1_guilt. THE PRIMARY OUTCOME for this measure (within-person, experimental minus neutral). |
| `diff_b2_irritation` | float | — | exp_b2_irritation − neutral_b2_irritation. THE PRIMARY OUTCOME for this measure (within-person, experimental minus neutral). |
| `diff_b3_manipulation` | float | — | exp_b3_manipulation − neutral_b3_manipulation. THE PRIMARY OUTCOME for this measure (within-person, experimental minus neutral). |
| `diff_b4_trust` | float | — | exp_b4_trust − neutral_b4_trust. THE PRIMARY OUTCOME for this measure (within-person, experimental minus neutral). |
| `diff_b5` | float | — | exp_b5_ord − neutral_b5_ord. Blank if either side is not_sure. |
| `neutral_accepts` | int | — | Count of the neutral block's two pop-ups accepted (0-2). |
| `exp_accepts` | int | — | Count of the experimental block's two pop-ups accepted (0-2). |
| `diff_accepts` | int | — | exp_accepts − neutral_accepts. A second, purely behavioural acceptance-count outcome alongside the rated-item difference scores. |

### Open-ended

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `neutral_b6_open` | string | — | Optional open-ended for the neutral brand, asked once per brand. Blank = skipped, which is always allowed. |
| `exp_b6_open` | string | — | Optional open-ended for the experimental brand, asked once per brand. Blank = skipped, which is always allowed. |
| `c6_open` | string | — | Optional open-ended from the comparative block: the biggest difference noticed between the two experiences. Blank = skipped. |

### Raw

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `event_log_json` | json | — | Full ordered event log, every entry stamped with performance.now(). This is the audit trail: if a derived timing column looks wrong, the truth is in here. Last column by design — it is very wide and would otherwise obstruct reading the Sheet. |
