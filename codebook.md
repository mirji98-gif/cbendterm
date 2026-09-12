# Codebook — Confirmshaming Storefront Study (Instrument v2)

> **GENERATED FILE — do not edit by hand.**
> Source: `src/data/items.ts`, `src/data/awareness.ts`, `src/data/comparative.ts` and
> `src/data/columns.ts`. Regenerate with `npm run gen:codebook`.
> Because the CSV, this codebook and `analysis/generated_scales.R` are all produced from those
> files, they cannot describe an instrument different from the one actually administered.

One row per participant. **100 columns.**

This is **Instrument v2** (see `Instrument_v2.md`, which replaces PRD §4 and §5). It trades the
v1 multi-item, multi-factor battery (72 rated items, Cronbach's alpha, five factors) for five
single-item measures per pop-up, to protect completion at N = 40 on phones. **What's kept:**
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
| 1 | `b1_guilt` | I felt guilty about declining the offer. | 7-point intensity, 1 = not at all … 7 = very strongly | Keeps H1 testable — without a guilt item there is no basis for calling this a guilt appeal, which is the entire premise of the Peng et al. prediction. Worded as guilt about DECLINING, not about the brand. |
| 2 | `b2_irritation` | I felt irritated by the way this offer was presented. | 7-point intensity, 1 = not at all … 7 = very strongly | THE MEDIATOR. Per Coulter & Pinto (1995), anger/irritation — not felt guilt — carries the damage to trust and purchase intention. Treat this as the mediator in analysis, not a descriptive aside. |
| 3 | `b3_manipulation` | The way this offer was presented was intended to pressure me into accepting it. | 7-point Likert, 1 = strongly disagree … 7 = strongly agree | Tests H3 (perceived manipulative intent). |
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

> If you were actually shopping for this type of product, which would you be most likely to do after seeing this pop-up?

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

> What, if anything, stood out to you about the way the offer was presented?

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

**This wording is the only difference between conditions.** Headline, offer, accept label, close
"X", tap-target size, contrast, animation and timing are identical, enforced by
`src/screens/Popup.identical.test.tsx`.

## 8. Assignment sequence

Pre-generated, seeded (`20260910`), served one slot at a time by the Apps Script
`assign` endpoint under a script lock. 52 slots: the first 40
are the design, the remaining 12 are insurance against
participants who consent and then drop (which permanently burns a slot).

Arms over slots 0–39: **mild** 13, **strong** 13, **autonomy** 14.

**Marginal counterbalance cells: 10 / 10 / 10 / 10** — exactly balanced.

| Arm | neutral_first · aurevella_neutral | neutral_first · veloure_neutral | exp_first · aurevella_neutral | exp_first · veloure_neutral | n |
| --- | --- | --- | --- | --- | --- |
| mild | 4 | 3 | 3 | 3 | 13 |
| strong | 3 | 4 | 3 | 3 | 13 |
| autonomy | 3 | 3 | 4 | 4 | 14 |

> **Documented imbalance.** 13 is not divisible by 4, so per-arm cells cannot all be equal. The
> extra participants are placed so the *marginal* cell counts come out exactly equal, which is the
> best achievable allocation. Report the per-arm cell counts above as a design fact; they are not
> an accident of randomisation.

## 9. Response-type coding (derived, never asked)

Recomputed in R from `choice`, `latency_ms` and awareness correctness, so the threshold can be
re-tuned:

| Behaviour | Code | Interpretation |
| --- | --- | --- |
| Accepts the offer | `comply` | Short-term effectiveness |
| Taps the loaded decline button | `resist` | Deliberate confrontation; reactance |
| Closes via "X" / backdrop, or times out | `avoid` | Shame avoidance rather than offer rejection |
| Dismissal < 1500 ms **and** fails the awareness check | `ignore` | Tactic passed unnoticed |

## 10. Exclusion rules

Apply before analysis:

1. `is_debug == TRUE` — pilot and debug runs. Always exclude.
2. `status != "complete"` — dropouts. Keep them to report the abandonment rate, exclude from
   outcome models.
3. `*_popup_render_gap_ms > 2000` — PRD §11: a pop-up that took over 2 s to paint makes that
   block's latency uninterpretable.
4. `resumed_after_reload == TRUE` **with null timing** — the participant reloaded mid-measurement.
   Self-report is still usable; the behavioural columns for that block are null by design.
5. `assignment_source == "fallback"` — not part of the balanced design. Report the count as a
   limitation rather than dropping silently.

## 11. Deviations from the PRD / v1 instrument

Each is deliberate; each is here so the write-up can state it rather than discover it.

| PRD / v1 says | Implemented as | Why |
| --- | --- | --- |
| 72 rated items, 9 multi-item scales | 8 rated items (B1–B4 × 2 blocks) + downstream choice + comparative block | Instrument v2 (`Instrument_v2.md`): reliability traded for completion at N = 40 on phones. |
| Cronbach's alpha per scale | None — every rated item is single-item | No multi-item scale exists in v2 to compute alpha over. |
| Recognition check, immediate options | Awareness check, descriptive (non-literal) options, still asked after both blocks | Both v1 and v2 ask retrospectively; v2's options describe the wording's implication rather than quoting it, so no option can cue the participant who saw that exact condition. |
| `mode: 'no-cors'` POST | CORS-simple `text/plain` POST | An opaque response resolves successfully even on a 500, making retry-and-rescue logic unreachable. Unaffected by the v1→v2 instrument change. |
| `*_abandoned` per block | Session-level `abandoned` + `abandoned_at_step` | A participant abandons a session, not a pop-up. |
| `cancelled_taps` includes `pointercancel` | Split into `cancelled_taps` and `pointer_cancels` | On Android `pointercancel` fires on every scroll. |
| Continuation "6 s or until action" | Live from 0 s, auto-advance at 8 s, censoring flagged | Ambiguous between a floor and a ceiling. |
| `abandon` response code, no threshold | `timeout` at 45 s | Without a timeout a frozen participant loses the entire row. |
| ~6 minutes (v1: 8–10 due to item load) | Consent states `about 6 minutes` again | v2's much shorter instrument (~23 items total vs ~80) makes the original PRD estimate realistic. Confirm against pilot times. |

## 12. All columns

### Session

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `participant_id` | string | — | Client-generated UUID, minted at consent. Upsert key — a checkpoint row and the final row share it. |
| `recruiter_id` | string | — | From ?r=1..4 in the recruiting link. Empty if the link carried no tag. |
| `status` | enum | `partial`, `complete` | complete = participant reached submit. partial = a checkpoint row that was never superseded, i.e. the participant dropped out. |
| `is_debug` | bool | — | TRUE for ?debug=1 sessions. Debug runs write real rows through the real code path; filter them out of every count and export. |
| `app_version` | string | — | Build identifier, so a mid-fieldwork change (e.g. the v1→v2 instrument swap) is detectable in the data. |

### Assignment

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `assignment_source` | enum | `server`, `fallback`, `debug` | server = slot from the Apps Script assign endpoint. fallback = assign endpoint failed and the client randomised. debug = forced via URL. Report the fallback count as a limitation. |
| `slot` | int | — | Index into the pre-generated sequence (see codebook §Assignment sequence). -1 for fallback assignment. |
| `arm` | enum | `mild`, `strong`, `autonomy` | Between-subjects framing arm. |
| `order` | enum | `neutral_first`, `exp_first` | Presentation order counterbalance. Also determines which brand is "Brand 1" / "Brand 2" in the comparative block. |
| `pairing` | enum | `aurevella_neutral`, `veloure_neutral` | Brand-condition pairing counterbalance: which brand carried the neutral pop-up. |
| `brand_neutral` | string | — | Brand that showed the neutral pop-up. |
| `brand_experimental` | string | — | Brand that showed the experimental (arm) pop-up. This is `exp_brand` in the recoding rules below. |

### Timing

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `started_at` | iso8601 | — | Wall clock at consent, UTC. Phone clocks can be skewed — do not compute durations from this. |
| `submitted_at` | iso8601 | — | Wall clock at submit, UTC. |
| `received_at` | iso8601 | — | Server-side receipt time, written by the Apps Script. Compare with submitted_at to detect device clock skew. |
| `duration_s` | float | — | Consent → submit, computed from performance.now() deltas rather than wall clock, so a device clock jump cannot corrupt it. |

### Environment

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `device` | string | — | Full user-agent string. Needed to interpret timing: PRD §11 notes mobile jank makes latency noisy, and device class is the first thing to check when it does. |
| `viewport` | string | — | CSS pixel viewport at start, "WxH". |
| `dpr` | float | — | devicePixelRatio at session start. Together with viewport it reconstructs the physical size the participant actually saw the pop-up at. |
| `touch` | bool | — | TRUE if the device reported touch support. Press-dwell is near-meaningless when TRUE (no hover on touch). |

### Attrition

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `abandoned` | bool | — | TRUE when the row is a checkpoint that was never superseded by a completed submit. Session-level because per-block abandonment is not identifiable — a participant abandons a session, not a pop-up. |
| `abandoned_at_step` | string | — | Last step reached before the session stopped. Blank for completed sessions. |
| `resumed_after_reload` | bool | — | TRUE if the participant reloaded mid-session and state was restored from localStorage. When the interrupted step was a pop-up or continuation screen, that block’s timing fields are NULL by design — never re-measured, because a re-rendered pop-up produces a clean-looking but meaningless latency. |

### Behavioural — neutral block

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `neutral_condition` | enum | `neutral`, `mild`, `strong`, `autonomy` | Pop-up condition shown in this block. Redundant with arm+prefix; kept so each block row is self-describing. |
| `neutral_brand` | string | — | Brand shown in this block. |
| `neutral_block_position` | enum | `1`, `2` | Whether this block was seen first or second. Derivable from `order`; stored to make order effects trivial to model. |
| `neutral_decline_label` | string | — | The exact decline-button string this participant saw. Stored verbatim as a provenance check that the manipulation rendered as intended. |
| `neutral_choice` | enum | `accept`, `decline_button`, `close_x`, `backdrop`, `timeout` | How the pop-up was resolved. `timeout` = no committed action within the pop-up timeout (45s); PRD names an `abandon` code but gives no threshold, and without one a frozen participant loses the whole row. |
| `neutral_response_code` | enum | `comply`, `resist`, `avoid`, `ignore` | Derived coding (PRD §5.2). Recomputed in analysis_starter.R from choice + latency + awareness so the Ignore threshold can be re-tuned; the stored value uses 1500 ms. |
| `neutral_latency_ms` | float | — | Pop-up fully rendered → first committed action. THE primary behavioural DV. NULL means data loss, not "no response". |
| `neutral_time_to_first_touch_ms` | float | — | Pop-up rendered → first pointerdown anywhere in the modal. |
| `neutral_cancelled_taps` | int | — | pointerdown on a control → pointerup OUTSIDE that control. A deliberate slide-off: the participant started to press and changed their mind. This is the reactance-relevant signal. |
| `neutral_pointer_cancels` | int | — | pointercancel events, logged SEPARATELY from cancelled_taps. On Android pointercancel fires whenever a touch becomes a scroll, so folding it into cancelled_taps (as PRD §5.1 does) would make that column largely a measure of scrolling. |
| `neutral_press_dwell_ms` | float | — | Total pressed-but-not-released time on the decline button. Expect a noisy near-constant on touch devices — there is no hover, and tap-press duration is reflex rather than deliberation. Interpret with care. |
| `neutral_post_dismiss_dwell_ms` | float | — | Time on the continuation screen before advancing. |
| `neutral_continuation_auto_advanced` | bool | — | TRUE if the continuation screen timed out at 8s rather than being dismissed. Marks post_dismiss_dwell_ms as ceiling-censored. |
| `neutral_scroll_events` | int | — | Scroll events during this block. |
| `neutral_rage_taps` | int | — | Runs of ≥3 pointerdowns within 500 ms inside a 48 px box. Cheap frustration proxy. |
| `neutral_popup_render_gap_ms` | float | — | Add-to-bag pointerdown → pop-up first painted frame (double-rAF after mount). PRD §11 excludes sessions with a >2 s render gap; this is the column that rule applies to. |
| `neutral_product_viewed` | string | — | SKU the participant added to the bag. |
| `neutral_time_on_store_ms` | float | — | Storefront entry → add-to-bag. Engagement/investment proxy (Campbell 1995: personal investment drives inferences of manipulative intent). |

### Self-report — neutral block

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `neutral_b1_guilt` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) | I felt guilty about declining the offer. *Keeps H1 testable — without a guilt item there is no basis for calling this a guilt appeal, which is the entire premise of the Peng et al. prediction. Worded as guilt about DECLINING, not about the brand.* |
| `neutral_b2_irritation` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) | I felt irritated by the way this offer was presented. *THE MEDIATOR. Per Coulter & Pinto (1995), anger/irritation — not felt guilt — carries the damage to trust and purchase intention. Treat this as the mediator in analysis, not a descriptive aside.* |
| `neutral_b3_manipulation` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | The way this offer was presented was intended to pressure me into accepting it. *Tests H3 (perceived manipulative intent).* |
| `neutral_b4_trust` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | I would trust this brand. *Deliberately LEVEL-framed, not change-framed ("compared with before" etc.). The within-person difference score (experimental − neutral) is what measures the trust penalty; if the item itself also contained a comparison, the two would nest and become uninterpretable. A level item also lets trust go UP, which H4 predicts for the autonomy arm — a change-framed item cannot detect that.* |
| `neutral_b5_raw` | enum | `buy`, `compare`, `competitor`, `avoid`, `not_sure` | Downstream behavioural choice: what the participant says they would do next. |
| `neutral_b5_ord` | int | — | Ordinal recode of b5_raw: buy=3, compare=2, competitor=1, avoid=0, not_sure=blank. Feeds diff_b5. |
| `neutral_b6_open` | string | — | Optional open-ended: "What, if anything, stood out to you about the way the offer was presented?" Blank = skipped, which is always allowed. |

### Behavioural — experimental block

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `exp_condition` | enum | `neutral`, `mild`, `strong`, `autonomy` | Pop-up condition shown in this block. Redundant with arm+prefix; kept so each block row is self-describing. |
| `exp_brand` | string | — | Brand shown in this block. |
| `exp_block_position` | enum | `1`, `2` | Whether this block was seen first or second. Derivable from `order`; stored to make order effects trivial to model. |
| `exp_decline_label` | string | — | The exact decline-button string this participant saw. Stored verbatim as a provenance check that the manipulation rendered as intended. |
| `exp_choice` | enum | `accept`, `decline_button`, `close_x`, `backdrop`, `timeout` | How the pop-up was resolved. `timeout` = no committed action within the pop-up timeout (45s); PRD names an `abandon` code but gives no threshold, and without one a frozen participant loses the whole row. |
| `exp_response_code` | enum | `comply`, `resist`, `avoid`, `ignore` | Derived coding (PRD §5.2). Recomputed in analysis_starter.R from choice + latency + awareness so the Ignore threshold can be re-tuned; the stored value uses 1500 ms. |
| `exp_latency_ms` | float | — | Pop-up fully rendered → first committed action. THE primary behavioural DV. NULL means data loss, not "no response". |
| `exp_time_to_first_touch_ms` | float | — | Pop-up rendered → first pointerdown anywhere in the modal. |
| `exp_cancelled_taps` | int | — | pointerdown on a control → pointerup OUTSIDE that control. A deliberate slide-off: the participant started to press and changed their mind. This is the reactance-relevant signal. |
| `exp_pointer_cancels` | int | — | pointercancel events, logged SEPARATELY from cancelled_taps. On Android pointercancel fires whenever a touch becomes a scroll, so folding it into cancelled_taps (as PRD §5.1 does) would make that column largely a measure of scrolling. |
| `exp_press_dwell_ms` | float | — | Total pressed-but-not-released time on the decline button. Expect a noisy near-constant on touch devices — there is no hover, and tap-press duration is reflex rather than deliberation. Interpret with care. |
| `exp_post_dismiss_dwell_ms` | float | — | Time on the continuation screen before advancing. |
| `exp_continuation_auto_advanced` | bool | — | TRUE if the continuation screen timed out at 8s rather than being dismissed. Marks post_dismiss_dwell_ms as ceiling-censored. |
| `exp_scroll_events` | int | — | Scroll events during this block. |
| `exp_rage_taps` | int | — | Runs of ≥3 pointerdowns within 500 ms inside a 48 px box. Cheap frustration proxy. |
| `exp_popup_render_gap_ms` | float | — | Add-to-bag pointerdown → pop-up first painted frame (double-rAF after mount). PRD §11 excludes sessions with a >2 s render gap; this is the column that rule applies to. |
| `exp_product_viewed` | string | — | SKU the participant added to the bag. |
| `exp_time_on_store_ms` | float | — | Storefront entry → add-to-bag. Engagement/investment proxy (Campbell 1995: personal investment drives inferences of manipulative intent). |

### Self-report — experimental block

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `exp_b1_guilt` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) | I felt guilty about declining the offer. *Keeps H1 testable — without a guilt item there is no basis for calling this a guilt appeal, which is the entire premise of the Peng et al. prediction. Worded as guilt about DECLINING, not about the brand.* |
| `exp_b2_irritation` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) | I felt irritated by the way this offer was presented. *THE MEDIATOR. Per Coulter & Pinto (1995), anger/irritation — not felt guilt — carries the damage to trust and purchase intention. Treat this as the mediator in analysis, not a descriptive aside.* |
| `exp_b3_manipulation` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | The way this offer was presented was intended to pressure me into accepting it. *Tests H3 (perceived manipulative intent).* |
| `exp_b4_trust` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | I would trust this brand. *Deliberately LEVEL-framed, not change-framed ("compared with before" etc.). The within-person difference score (experimental − neutral) is what measures the trust penalty; if the item itself also contained a comparison, the two would nest and become uninterpretable. A level item also lets trust go UP, which H4 predicts for the autonomy arm — a change-framed item cannot detect that.* |
| `exp_b5_raw` | enum | `buy`, `compare`, `competitor`, `avoid`, `not_sure` | Downstream behavioural choice: what the participant says they would do next. |
| `exp_b5_ord` | int | — | Ordinal recode of b5_raw: buy=3, compare=2, competitor=1, avoid=0, not_sure=blank. Feeds diff_b5. |
| `exp_b6_open` | string | — | Optional open-ended: "What, if anything, stood out to you about the way the offer was presented?" Blank = skipped, which is always allowed. |

### Difference scores

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `diff_b1_guilt` | float | — | exp_b1_guilt − neutral_b1_guilt. THE PRIMARY OUTCOME for this measure (within-person, experimental minus neutral). |
| `diff_b2_irritation` | float | — | exp_b2_irritation − neutral_b2_irritation. THE PRIMARY OUTCOME for this measure (within-person, experimental minus neutral). |
| `diff_b3_manipulation` | float | — | exp_b3_manipulation − neutral_b3_manipulation. THE PRIMARY OUTCOME for this measure (within-person, experimental minus neutral). |
| `diff_b4_trust` | float | — | exp_b4_trust − neutral_b4_trust. THE PRIMARY OUTCOME for this measure (within-person, experimental minus neutral). |
| `diff_b5` | float | — | exp_b5_ord − neutral_b5_ord. Blank if either side is not_sure. |

### Awareness

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `aware_brand1_raw` | enum | `neutral`, `mild`, `strong`, `autonomy`, `dont_remember` | Which statement the participant chose for the brand shown FIRST (position 1, not condition). |
| `aware_brand2_raw` | enum | `neutral`, `mild`, `strong`, `autonomy`, `dont_remember` | Same, for the brand shown SECOND (position 2). |
| `aware_neutral_correct` | bool | — | TRUE if the participant correctly identified the statement for whichever brand carried the NEUTRAL pop-up (recoded by condition, not position). "Don't remember" counts as incorrect. |
| `aware_exp_correct` | bool | — | Same, for the brand that carried the EXPERIMENTAL pop-up. Feeds the "Ignore" response code. |

### Comparative

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `c1_raw` | enum | `aurevella`, `veloure`, `both`, `neither`, `dont_remember` | Raw answer: which brand's pop-up felt more manipulative. A brand id, or a sentinel (both, neither, dont_remember). |
| `c2_raw` | enum | `aurevella`, `veloure`, `both`, `neither` | Raw answer: which brand the participant would trust more. |
| `c3_raw` | int | 1 = much less … 4 = about the same … 7 = much more | Raw answer: trust in Brand 1 (position 1) compared with Brand 2 (position 2). NOT yet relative to condition — see c3_recoded. |
| `c4_raw` | enum | `aurevella`, `veloure`, `compare_further`, `neither` | Raw answer: which brand the participant would choose for their next purchase. |
| `c5_raw` | int | 1 = much worse … 4 = about the same … 7 = much better | Raw answer: overall experience with Brand 1 compared with Brand 2. NOT yet relative to condition — see c5_recoded. |
| `c6_open` | string | — | Optional open-ended: biggest difference noticed between the two experiences. Blank = skipped. |

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
| `age_band` | enum | `18_24`, `25_34`, `35_44`, `45_plus`, `prefer_not` | Self-reported age band. Collected as a band rather than a number so no participant is individually identifiable in a sample of 40. |
| `gender` | enum | `woman`, `man`, `non_binary`, `prefer_not` | Self-reported gender, including a prefer-not-to-say option. Covariate only; the design is not powered to test gender differences at N=40. |
| `occupation` | enum | `student`, `working`, `both`, `other` | Student / working status. |

### Raw

| Column | Type | Scale / values | Description |
| --- | --- | --- | --- |
| `event_log_json` | json | — | Full ordered event log, every entry stamped with performance.now(). This is the audit trail: if a derived timing column looks wrong, the truth is in here. |
