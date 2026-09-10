# Codebook — Confirmshaming Storefront Study

> **GENERATED FILE — do not edit by hand.**
> Source: `src/data/items.ts` and `src/data/columns.ts`. Regenerate with `npm run gen:codebook`.
> Because the CSV, this codebook and `analysis/generated_scales.R` are all produced from those two
> files, a reverse-coding flag cannot drift between the instrument and the analysis.

One row per participant. **145 columns.** Cut tier in force at generation: **0**.

---

## 1. Reverse-coded items — read this first

5 items per block (10 columns) must be flipped **`8 - x`** before they
join a scale score. `analysis/generated_scales.R` does this for you; if you score by hand, these
are the ones that flip:

| Item | Factor | Wording | Why it flips |
| --- | --- | --- | --- |
| `imi_1` | Perceived manipulative intent | The way this pop-up tries to persuade people seems acceptable to me. | Worded so that agreement means *less* perceived manipulative intent. |
| `imi_4` | Perceived manipulative intent | I didn’t mind this pop-up; {BRAND} tried to be persuasive without being excessively manipulative. | Worded so that agreement means *less* perceived manipulative intent. |
| `imi_5` | Perceived manipulative intent | This pop-up was fair in what was said and shown. | Worded so that agreement means *less* perceived manipulative intent. |
| `imi_6` | Perceived manipulative intent | This pop-up was… **Unfair (1) — Fair (7)** | The high anchor ("Fair") means *less* perceived manipulative intent, opposite to the rest of the scale. |
| `attrib_3` | Negative brand attribution | {BRAND} has customers’ best interests at heart. | Worded so that agreement means a *more favourable* attribution. |

Column names are these ids prefixed `neutral_` and `exp_`, e.g. `neutral_imi_1`, `exp_imi_1`.

> **`imi_6` is reverse-coded here although PRD §5.3(c) does not mark it.** It is the semantic
> differential "unfair / fair" with *Fair* at the high anchor, which runs opposite to the rest of
> the IMI scale (where high = more manipulative intent). Left unreversed it deflates Cronbach's
> alpha and biases the scale mean. If you disagree, change `reverse` in `src/data/items.ts` and
> regenerate — do not patch the R script, or the two will disagree.

## 2. Scale polarity

Every rated item is 7-point. **The negative pole is always 1.** This holds for the semantic
differentials too (bad = 1, good = 7; unfavourable = 1; unfair = 1), which is why no differential
in this instrument needs reverse-coding on account of its anchors.

- `likert_agree` — 7-point Likert, 1 = strongly disagree … 7 = strongly agree
- `emotion_intensity` — 7-point intensity, 1 = not at all … 7 = very strongly
- `semantic_diff` — 7-point semantic differential, negative pole at 1
- `likelihood` — 7-point likelihood, 1 = very unlikely … 7 = very likely

## 3. Scales

Multi-item scales get a mean score and a Cronbach's alpha. Single-item outcomes are reported raw
and must never be averaged together.

| Scale | Items | Reverse | Direction of high scores |
| --- | --- | --- | --- |
| Felt guilt (`guilt`) | 4 — `guilt_1`, `guilt_2`, `guilt_3`, `guilt_4` | — | More felt guilt |
| Felt anger / irritation (`anger`) | 3 — `anger_1`, `anger_2`, `anger_3` | — | More felt anger/irritation — **the theorised mediator** (Coulter & Pinto 1995) |
| Felt happy / amused (`happy`) | 3 — `happy_1`, `happy_2`, `happy_3` | — | More positive affect |
| Attitude toward the pop-up (`att_popup`) | 3 — `att_popup_1`, `att_popup_2`, `att_popup_3` | — | More favourable attitude to the pop-up |
| Attitude toward the brand (`att_brand`) | 3 — `att_brand_1`, `att_brand_2`, `att_brand_3` | — | More favourable attitude to the brand |
| Brand trust (`trust`) | 3 — `trust_1`, `trust_2`, `trust_3` | — | More brand trust |
| Perceived manipulative intent (`imi`) | 6 — `imi_1`, `imi_2`, `imi_3`, `imi_4`, `imi_5`, `imi_6` | `imi_1`, `imi_4`, `imi_5`, `imi_6` | MORE perceived manipulative intent |
| Offer credibility (`cred`) | 3 — `cred_1`, `cred_2`, `cred_3` | — | More credible offer |
| Negative brand attribution (`attrib`) | 3 — `attrib_1`, `attrib_2`, `attrib_3` | `attrib_3` | MORE negative/manipulative attribution |

Single-item outcomes:

- `pi` — Purchase intention. How likely would you be to buy from {BRAND}? *Single-item outcome. Higher = better for the brand.*
- `ri` — Recommendation intention. How likely would you be to recommend {BRAND} to a friend? *Single-item outcome. Higher = better for the brand.*
- `si` — Switching intention. How likely would you be to buy from a competitor instead? *Single-item outcome, NOT reverse-coded (it belongs to no multi-item scale). Direction runs opposite to pi/ri: higher = WORSE for the brand. Do not average it with pi/ri.*

Not scored: `distractor_1` (Surprised) and `distractor_2` (Bored) exist to stop guilt becoming
salient in the emotion grid. Do not build a scale from them.

## 4. Questionnaire order (forced, no back navigation)

Measurement order is an experimental-validity constraint, not a layout choice. Campbell (1995) and
Cotte et al. (2005) both measured felt emotions and attitudes **before** any item about the
advertiser's intent, to avoid manufacturing the mediator–outcome correlation the study is trying to
detect.

1. **emotions** — How did that pop-up make you feel? *(item order randomised within the screen)*
2. **attitudes** — A few quick reactions to {BRAND}.
3. **imi** — How much do you agree with each statement? *(item order randomised within the screen)*
4. **attributions** — And how much do you agree with these? *(item order randomised within the screen)*
5. **credibility** — Thinking about the offer itself. *(item order randomised within the screen)*

Then, once for the whole session: recognition → open-ended → covariates → demographics.

Randomised sections shuffle item order per participant; the order actually used is recorded in the
`event_log_json` column, so presentation order is auditable after the fact.

## 5. Conditions

| Condition | Decline-button wording |
| --- | --- |
| `neutral` | "No thanks" |
| `mild` | "No thanks, I’ll pay full price" |
| `strong` | "No thanks, I don’t need to save money" |
| `autonomy` | "Not now — I’ll decide later" |

**This wording is the only difference between conditions.** Headline, offer, accept label, close
"X", tap-target size, contrast, animation and timing are identical, enforced by
`src/screens/Popup.identical.test.tsx`.

## 6. Assignment sequence

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

## 7. Response-type coding (derived, never asked)

Recomputed in R from `choice`, `latency_ms` and recognition, so the threshold can be re-tuned:

| Behaviour | Code | Interpretation |
| --- | --- | --- |
| Accepts the offer | `comply` | Short-term effectiveness |
| Taps the loaded decline button | `resist` | Deliberate confrontation; reactance |
| Closes via "X" / backdrop, or times out | `avoid` | Shame avoidance rather than offer rejection |
| Dismissal < 1500 ms **and** fails recognition | `ignore` | Tactic passed unnoticed |

## 8. Exclusion rules

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

## 9. Deviations from the PRD

Each is deliberate; each is here so the write-up can state it rather than discover it.

| PRD says | Implemented as | Why |
| --- | --- | --- |
| `mode: 'no-cors'` POST | CORS-simple `text/plain` POST | An opaque response resolves successfully even on a 500, making the PRD's own retry-and-rescue logic unreachable. |
| `*_abandoned` per block | Session-level `abandoned` + `abandoned_at_step` | A participant abandons a session, not a pop-up. Made observable at all by checkpoint rows. |
| `cancelled_taps` includes `pointercancel` | Split into `cancelled_taps` and `pointer_cancels` | On Android `pointercancel` fires on every scroll; merged, the column would mostly measure scrolling. |
| Continuation "6 s or until action" | Live from 0 s, auto-advance at 8 s, censoring flagged | The PRD wording is ambiguous between a floor and a ceiling, which give different dwell distributions. |
| `abandon` response code, no threshold | `timeout` at 45 s | Without a timeout a frozen participant loses the entire row. |
| IMI item 6 unmarked | `reverse: true` | "Fair" at the high anchor runs opposite to the scale. |
| ~6 minutes | Consent states 8–10 minutes | 72 rated items plus storefront and end matter does not fit in 6 minutes on a phone. |
| Emotions 11 items | 12 (4 guilt + 3 anger + 3 happy + 2 distractor) | PRD §8's own column spec lists 12; the "11" in §5.3 does not match it. |

## 10. All columns

### Session

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `participant_id` | string | — |  | Client-generated UUID, minted at consent. Upsert key — a checkpoint row and the final row share it. |
| `recruiter_id` | string | — |  | From ?r=1..4 in the recruiting link. Empty if the link carried no tag. |
| `status` | enum | `partial`, `complete` |  | complete = participant reached submit. partial = a checkpoint row that was never superseded, i.e. the participant dropped out. |
| `is_debug` | bool | — |  | TRUE for ?debug=1 sessions. Debug runs write real rows through the real code path; filter them out of every count and export. |
| `app_version` | string | — |  | Build identifier, so a mid-fieldwork change is detectable in the data. |
| `cut_tier` | int | — |  | Burden cut tier in force for this participant (0 = full instrument). Non-zero means some item columns are blank BY DESIGN, not missing. |

### Assignment

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `assignment_source` | enum | `server`, `fallback`, `debug` |  | server = slot from the Apps Script assign endpoint. fallback = assign endpoint failed and the client randomised. debug = forced via URL. Report the fallback count as a limitation. |
| `slot` | int | — |  | Index into the pre-generated sequence (see codebook §Assignment sequence). -1 for fallback assignment. |
| `arm` | enum | `mild`, `strong`, `autonomy` |  | Between-subjects framing arm. |
| `order` | enum | `neutral_first`, `exp_first` |  | Presentation order counterbalance. |
| `pairing` | enum | `aurevella_neutral`, `veloure_neutral` |  | Brand-condition pairing counterbalance: which brand carried the neutral pop-up. |
| `brand_neutral` | string | — |  | Brand that showed the neutral pop-up. |
| `brand_experimental` | string | — |  | Brand that showed the experimental (arm) pop-up. |

### Timing

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `started_at` | iso8601 | — |  | Wall clock at consent, UTC. Phone clocks can be skewed — do not compute durations from this. |
| `submitted_at` | iso8601 | — |  | Wall clock at submit, UTC. |
| `received_at` | iso8601 | — |  | Server-side receipt time, written by the Apps Script. Compare with submitted_at to detect device clock skew. |
| `duration_s` | float | — |  | Consent → submit, computed from performance.now() deltas rather than wall clock, so a device clock jump cannot corrupt it. |

### Environment

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `device` | string | — |  | Full user-agent string. Needed to interpret timing: PRD §11 notes mobile jank makes latency noisy, and device class is the first thing to check when it does. |
| `viewport` | string | — |  | CSS pixel viewport at start, "WxH". |
| `dpr` | float | — |  | devicePixelRatio at session start. Together with viewport it reconstructs the physical size the participant actually saw the pop-up at. |
| `touch` | bool | — |  | TRUE if the device reported touch support. Press-dwell is near-meaningless when TRUE (no hover on touch). |

### Attrition

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `abandoned` | bool | — |  | TRUE when the row is a checkpoint that was never superseded by a completed submit. PRD §5.1 lists this per block; it is session-level here because per-block abandonment is not identifiable — a participant abandons a session, not a pop-up. |
| `abandoned_at_step` | string | — |  | Last step reached before the session stopped. Blank for completed sessions. |
| `resumed_after_reload` | bool | — |  | TRUE if the participant reloaded mid-session and state was restored from localStorage. When the interrupted step was a pop-up or continuation screen, that block’s timing fields are NULL by design — never re-measured, because a re-rendered pop-up produces a clean-looking but meaningless latency. |

### Behavioural — neutral block

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `neutral_condition` | enum | `neutral`, `mild`, `strong`, `autonomy` |  | Pop-up condition shown in this block. Redundant with arm+prefix; kept so each block row is self-describing. |
| `neutral_brand` | string | — |  | Brand shown in this block. |
| `neutral_block_position` | enum | `1`, `2` |  | Whether this block was seen first or second. Derivable from `order`; stored to make order effects trivial to model. |
| `neutral_decline_label` | string | — |  | The exact decline-button string this participant saw. Stored verbatim as a provenance check that the manipulation rendered as intended. |
| `neutral_choice` | enum | `accept`, `decline_button`, `close_x`, `backdrop`, `timeout` |  | How the pop-up was resolved. `timeout` = no committed action within the pop-up timeout (45s); PRD names an `abandon` code but gives no threshold, and without one a frozen participant loses the whole row. |
| `neutral_response_code` | enum | `comply`, `resist`, `avoid`, `ignore` |  | Derived coding (PRD §5.2). Recomputed in analysis_starter.R from choice + latency + recognition so the Ignore threshold can be re-tuned; the stored value uses 1500 ms. |
| `neutral_latency_ms` | float | — |  | Pop-up fully rendered → first committed action. THE primary behavioural DV. NULL means data loss, not "no response". |
| `neutral_time_to_first_touch_ms` | float | — |  | Pop-up rendered → first pointerdown anywhere in the modal. |
| `neutral_cancelled_taps` | int | — |  | pointerdown on a control → pointerup OUTSIDE that control. A deliberate slide-off: the participant started to press and changed their mind. This is the reactance-relevant signal. |
| `neutral_pointer_cancels` | int | — |  | pointercancel events, logged SEPARATELY from cancelled_taps. On Android pointercancel fires whenever a touch becomes a scroll, so folding it into cancelled_taps (as PRD §5.1 does) would make that column largely a measure of scrolling. |
| `neutral_press_dwell_ms` | float | — |  | Total pressed-but-not-released time on the decline button. Expect a noisy near-constant on touch devices — there is no hover, and tap-press duration is reflex rather than deliberation. Interpret with care. |
| `neutral_post_dismiss_dwell_ms` | float | — |  | Time on the continuation screen before advancing. |
| `neutral_continuation_auto_advanced` | bool | — |  | TRUE if the continuation screen timed out at 8s rather than being dismissed. Marks post_dismiss_dwell_ms as ceiling-censored. |
| `neutral_scroll_events` | int | — |  | Scroll events during this block. |
| `neutral_rage_taps` | int | — |  | Runs of ≥3 pointerdowns within 500 ms inside a 48 px box. Cheap frustration proxy. |
| `neutral_popup_render_gap_ms` | float | — |  | Add-to-bag pointerdown → pop-up first painted frame (double-rAF after mount). PRD §11 excludes sessions with a >2 s render gap; this is the column that rule applies to. |
| `neutral_product_viewed` | string | — |  | SKU the participant added to the bag. |
| `neutral_time_on_store_ms` | float | — |  | Storefront entry → add-to-bag. Engagement/investment proxy (Campbell 1995: personal investment drives inferences of manipulative intent). |

### Self-report — neutral block — Felt guilt

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `neutral_guilt_1` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Guilty |
| `neutral_guilt_2` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Ashamed |
| `neutral_guilt_3` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Accountable |
| `neutral_guilt_4` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Irresponsible |

### Self-report — neutral block — Felt anger / irritation

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `neutral_anger_1` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Annoyed |
| `neutral_anger_2` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Angry |
| `neutral_anger_3` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Irritated |

### Self-report — neutral block — Felt happy / amused

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `neutral_happy_1` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Amused |
| `neutral_happy_2` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Happy |
| `neutral_happy_3` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Good |

### Self-report — neutral block — Distractor (not scored)

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `neutral_distractor_1` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Surprised |
| `neutral_distractor_2` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Bored |

### Self-report — neutral block — Attitude toward the pop-up

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `neutral_att_popup_1` | likert7 | 7-point semantic differential, negative pole at 1 (1 = Bad … 7 = Good) |  | The pop-up you just saw was… |
| `neutral_att_popup_2` | likert7 | 7-point semantic differential, negative pole at 1 (1 = Unfavourable … 7 = Favourable) |  | The pop-up you just saw was… |
| `neutral_att_popup_3` | likert7 | 7-point semantic differential, negative pole at 1 (1 = Negative … 7 = Positive) |  | The pop-up you just saw was… |

### Self-report — neutral block — Attitude toward the brand

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `neutral_att_brand_1` | likert7 | 7-point semantic differential, negative pole at 1 (1 = Bad … 7 = Good) |  | Overall, {BRAND} is… |
| `neutral_att_brand_2` | likert7 | 7-point semantic differential, negative pole at 1 (1 = Unfavourable … 7 = Favourable) |  | Overall, {BRAND} is… |
| `neutral_att_brand_3` | likert7 | 7-point semantic differential, negative pole at 1 (1 = Negative … 7 = Positive) |  | Overall, {BRAND} is… |

### Self-report — neutral block — Brand trust

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `neutral_trust_1` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | I would trust {BRAND} with my payment details. |
| `neutral_trust_2` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | {BRAND} deals with customers honestly. |
| `neutral_trust_3` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | {BRAND} is upfront about what it wants from me. *Expected to cross-load with IMI. Consider reporting trust with and without it.* |

### Self-report — neutral block — Purchase intention

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `neutral_pi` | likert7 | 7-point likelihood, 1 = very unlikely … 7 = very likely (1 = Very unlikely … 7 = Very likely) |  | How likely would you be to buy from {BRAND}? *Single-item outcome. Higher = better for the brand.* |

### Self-report — neutral block — Recommendation intention

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `neutral_ri` | likert7 | 7-point likelihood, 1 = very unlikely … 7 = very likely (1 = Very unlikely … 7 = Very likely) |  | How likely would you be to recommend {BRAND} to a friend? *Single-item outcome. Higher = better for the brand.* |

### Self-report — neutral block — Switching intention

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `neutral_si` | likert7 | 7-point likelihood, 1 = very unlikely … 7 = very likely (1 = Very unlikely … 7 = Very likely) |  | How likely would you be to buy from a competitor instead? *Single-item outcome, NOT reverse-coded (it belongs to no multi-item scale). Direction runs opposite to pi/ri: higher = WORSE for the brand. Do not average it with pi/ri.* |

### Self-report — neutral block — Perceived manipulative intent

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `neutral_imi_1` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | **R** | The way this pop-up tries to persuade people seems acceptable to me. |
| `neutral_imi_2` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | {BRAND} tried to manipulate shoppers in ways that I don’t like. |
| `neutral_imi_3` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | I was annoyed by this pop-up because {BRAND} seemed to be trying to inappropriately manage or control shoppers. |
| `neutral_imi_4` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | **R** | I didn’t mind this pop-up; {BRAND} tried to be persuasive without being excessively manipulative. |
| `neutral_imi_5` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | **R** | This pop-up was fair in what was said and shown. |
| `neutral_imi_6` | likert7 | 7-point semantic differential, negative pole at 1 (1 = Unfair … 7 = Fair) | **R** | This pop-up was… *Sole semantic differential in the IMI block. PRD §5.3(c) does not mark it (R), but it must be: with "Fair" at the high anchor it runs opposite to the scale (high = more manipulative intent). Left unreversed it deflates alpha and biases the scale score.* |

### Self-report — neutral block — Negative brand attribution

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `neutral_attrib_1` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | {BRAND} is trying to manipulate my feelings. *Near-duplicate of imi_2; the two are not independent evidence.* |
| `neutral_attrib_2` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | {BRAND} is mainly concerned with making money. |
| `neutral_attrib_3` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | **R** | {BRAND} has customers’ best interests at heart. |

### Self-report — neutral block — Offer credibility

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `neutral_cred_1` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | The offer in the pop-up was believable. |
| `neutral_cred_2` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | The offer in the pop-up was truthful. |
| `neutral_cred_3` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | The offer in the pop-up was realistic. |

### Behavioural — experimental block

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `exp_condition` | enum | `neutral`, `mild`, `strong`, `autonomy` |  | Pop-up condition shown in this block. Redundant with arm+prefix; kept so each block row is self-describing. |
| `exp_brand` | string | — |  | Brand shown in this block. |
| `exp_block_position` | enum | `1`, `2` |  | Whether this block was seen first or second. Derivable from `order`; stored to make order effects trivial to model. |
| `exp_decline_label` | string | — |  | The exact decline-button string this participant saw. Stored verbatim as a provenance check that the manipulation rendered as intended. |
| `exp_choice` | enum | `accept`, `decline_button`, `close_x`, `backdrop`, `timeout` |  | How the pop-up was resolved. `timeout` = no committed action within the pop-up timeout (45s); PRD names an `abandon` code but gives no threshold, and without one a frozen participant loses the whole row. |
| `exp_response_code` | enum | `comply`, `resist`, `avoid`, `ignore` |  | Derived coding (PRD §5.2). Recomputed in analysis_starter.R from choice + latency + recognition so the Ignore threshold can be re-tuned; the stored value uses 1500 ms. |
| `exp_latency_ms` | float | — |  | Pop-up fully rendered → first committed action. THE primary behavioural DV. NULL means data loss, not "no response". |
| `exp_time_to_first_touch_ms` | float | — |  | Pop-up rendered → first pointerdown anywhere in the modal. |
| `exp_cancelled_taps` | int | — |  | pointerdown on a control → pointerup OUTSIDE that control. A deliberate slide-off: the participant started to press and changed their mind. This is the reactance-relevant signal. |
| `exp_pointer_cancels` | int | — |  | pointercancel events, logged SEPARATELY from cancelled_taps. On Android pointercancel fires whenever a touch becomes a scroll, so folding it into cancelled_taps (as PRD §5.1 does) would make that column largely a measure of scrolling. |
| `exp_press_dwell_ms` | float | — |  | Total pressed-but-not-released time on the decline button. Expect a noisy near-constant on touch devices — there is no hover, and tap-press duration is reflex rather than deliberation. Interpret with care. |
| `exp_post_dismiss_dwell_ms` | float | — |  | Time on the continuation screen before advancing. |
| `exp_continuation_auto_advanced` | bool | — |  | TRUE if the continuation screen timed out at 8s rather than being dismissed. Marks post_dismiss_dwell_ms as ceiling-censored. |
| `exp_scroll_events` | int | — |  | Scroll events during this block. |
| `exp_rage_taps` | int | — |  | Runs of ≥3 pointerdowns within 500 ms inside a 48 px box. Cheap frustration proxy. |
| `exp_popup_render_gap_ms` | float | — |  | Add-to-bag pointerdown → pop-up first painted frame (double-rAF after mount). PRD §11 excludes sessions with a >2 s render gap; this is the column that rule applies to. |
| `exp_product_viewed` | string | — |  | SKU the participant added to the bag. |
| `exp_time_on_store_ms` | float | — |  | Storefront entry → add-to-bag. Engagement/investment proxy (Campbell 1995: personal investment drives inferences of manipulative intent). |

### Self-report — experimental block — Felt guilt

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `exp_guilt_1` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Guilty |
| `exp_guilt_2` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Ashamed |
| `exp_guilt_3` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Accountable |
| `exp_guilt_4` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Irresponsible |

### Self-report — experimental block — Felt anger / irritation

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `exp_anger_1` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Annoyed |
| `exp_anger_2` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Angry |
| `exp_anger_3` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Irritated |

### Self-report — experimental block — Felt happy / amused

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `exp_happy_1` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Amused |
| `exp_happy_2` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Happy |
| `exp_happy_3` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Good |

### Self-report — experimental block — Distractor (not scored)

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `exp_distractor_1` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Surprised |
| `exp_distractor_2` | likert7 | 7-point intensity, 1 = not at all … 7 = very strongly (1 = Not at all … 7 = Very strongly) |  | Bored |

### Self-report — experimental block — Attitude toward the pop-up

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `exp_att_popup_1` | likert7 | 7-point semantic differential, negative pole at 1 (1 = Bad … 7 = Good) |  | The pop-up you just saw was… |
| `exp_att_popup_2` | likert7 | 7-point semantic differential, negative pole at 1 (1 = Unfavourable … 7 = Favourable) |  | The pop-up you just saw was… |
| `exp_att_popup_3` | likert7 | 7-point semantic differential, negative pole at 1 (1 = Negative … 7 = Positive) |  | The pop-up you just saw was… |

### Self-report — experimental block — Attitude toward the brand

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `exp_att_brand_1` | likert7 | 7-point semantic differential, negative pole at 1 (1 = Bad … 7 = Good) |  | Overall, {BRAND} is… |
| `exp_att_brand_2` | likert7 | 7-point semantic differential, negative pole at 1 (1 = Unfavourable … 7 = Favourable) |  | Overall, {BRAND} is… |
| `exp_att_brand_3` | likert7 | 7-point semantic differential, negative pole at 1 (1 = Negative … 7 = Positive) |  | Overall, {BRAND} is… |

### Self-report — experimental block — Brand trust

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `exp_trust_1` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | I would trust {BRAND} with my payment details. |
| `exp_trust_2` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | {BRAND} deals with customers honestly. |
| `exp_trust_3` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | {BRAND} is upfront about what it wants from me. *Expected to cross-load with IMI. Consider reporting trust with and without it.* |

### Self-report — experimental block — Purchase intention

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `exp_pi` | likert7 | 7-point likelihood, 1 = very unlikely … 7 = very likely (1 = Very unlikely … 7 = Very likely) |  | How likely would you be to buy from {BRAND}? *Single-item outcome. Higher = better for the brand.* |

### Self-report — experimental block — Recommendation intention

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `exp_ri` | likert7 | 7-point likelihood, 1 = very unlikely … 7 = very likely (1 = Very unlikely … 7 = Very likely) |  | How likely would you be to recommend {BRAND} to a friend? *Single-item outcome. Higher = better for the brand.* |

### Self-report — experimental block — Switching intention

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `exp_si` | likert7 | 7-point likelihood, 1 = very unlikely … 7 = very likely (1 = Very unlikely … 7 = Very likely) |  | How likely would you be to buy from a competitor instead? *Single-item outcome, NOT reverse-coded (it belongs to no multi-item scale). Direction runs opposite to pi/ri: higher = WORSE for the brand. Do not average it with pi/ri.* |

### Self-report — experimental block — Perceived manipulative intent

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `exp_imi_1` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | **R** | The way this pop-up tries to persuade people seems acceptable to me. |
| `exp_imi_2` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | {BRAND} tried to manipulate shoppers in ways that I don’t like. |
| `exp_imi_3` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | I was annoyed by this pop-up because {BRAND} seemed to be trying to inappropriately manage or control shoppers. |
| `exp_imi_4` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | **R** | I didn’t mind this pop-up; {BRAND} tried to be persuasive without being excessively manipulative. |
| `exp_imi_5` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | **R** | This pop-up was fair in what was said and shown. |
| `exp_imi_6` | likert7 | 7-point semantic differential, negative pole at 1 (1 = Unfair … 7 = Fair) | **R** | This pop-up was… *Sole semantic differential in the IMI block. PRD §5.3(c) does not mark it (R), but it must be: with "Fair" at the high anchor it runs opposite to the scale (high = more manipulative intent). Left unreversed it deflates alpha and biases the scale score.* |

### Self-report — experimental block — Negative brand attribution

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `exp_attrib_1` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | {BRAND} is trying to manipulate my feelings. *Near-duplicate of imi_2; the two are not independent evidence.* |
| `exp_attrib_2` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | {BRAND} is mainly concerned with making money. |
| `exp_attrib_3` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) | **R** | {BRAND} has customers’ best interests at heart. |

### Self-report — experimental block — Offer credibility

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `exp_cred_1` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | The offer in the pop-up was believable. |
| `exp_cred_2` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | The offer in the pop-up was truthful. |
| `exp_cred_3` | likert7 | 7-point Likert, 1 = strongly disagree … 7 = strongly agree (1 = Strongly disagree … 7 = Strongly agree) |  | The offer in the pop-up was realistic. |

### Recognition

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `recognition_neutral` | enum | `neutral`, `mild`, `strong`, `autonomy`, `dont_remember` |  | Which decline wording the participant recalls from the brand that showed the NEUTRAL pop-up. All four wordings offered, plus "don’t remember". |
| `recognition_exp` | enum | `neutral`, `mild`, `strong`, `autonomy`, `dont_remember` |  | Same, for the brand that showed the EXPERIMENTAL pop-up. |
| `recognition_correct_neutral` | bool | — |  | recognition_neutral === "neutral". |
| `recognition_correct_exp` | bool | — |  | recognition_exp === the participant’s arm. Feeds the "Ignore" response code. |

### Open-ended

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `open_ended` | string | — |  | "In your own words, why did you respond to each pop-up the way you did?" Min 15 characters; skippable after 10 s. Blank = skipped. |
| `open_ended_skipped` | bool | — |  | TRUE if the participant used the skip affordance. |

### Covariates

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `popup_freq` | enum | `1`, `2`, `3`, `4`, `5` |  | How often do you see discount pop-ups when shopping online? 1 = never … 5 = very often. |
| `dp_awareness` | enum | `yes`, `no`, `not_sure` |  | Before today, had you come across the term 'dark patterns'? |
| `shopping_freq` | enum | `1`, `2`, `3`, `4`, `5` |  | How often do you shop online? 1 = rarely or never … 5 = several times a week. |

### Demographics

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `age_band` | enum | `18_24`, `25_34`, `35_44`, `45_plus`, `prefer_not` |  | Self-reported age band. Collected as a band rather than a number so no participant is individually identifiable in a sample of 40. |
| `gender` | enum | `woman`, `man`, `non_binary`, `prefer_not` |  | Self-reported gender, including a prefer-not-to-say option. Covariate only; the design is not powered to test gender differences at N=40. |
| `occupation` | enum | `student`, `working`, `both`, `other` |  | Student / working status. |

### Raw

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
| `event_log_json` | json | — |  | Full ordered event log, every entry stamped with performance.now(). This is the audit trail: if a derived timing column looks wrong, the truth is in here. |
