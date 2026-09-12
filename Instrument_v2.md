# Instrument v2 — replaces PRD §4 (flow) and §5 (measures)

Everything else in `PRD_confirmshaming_experiment_app.md` still stands: the design table (§3), the stimulus rules (§6), the tech requirements (§7), ethics (§9), build order (§10). Only the questionnaire shrinks.

---

## Why v2

The v1 instrument was built for reliability — multi-item scales, alphas, published item banks. v2 is built for completion. At N = 40 on phones, a participant who quits at minute seven is a bigger threat to the study than a single-item measure with unknown reliability. Five rated items per pop-up instead of thirty-four.

**What you keep:** perceived manipulation, irritation, brand trust, a downstream behavioural choice, awareness, and a direct within-person comparison.
**What you give up:** Cronbach's alpha, the credibility axis, brand attributions, and the guilt/anger/amusement factor structure. Name this in the limitations slide — "single-item measures were used to protect completion rates at N = 40" is a defensible sentence, and it's better than a 40% dropout rate you have to explain instead.

---

## Revised participant flow

```
0   Landing + informed consent
1   Instructions + cover task
2   Storefront A → product page → "Add to bag"
3   Pop-up A
4   Continuation screen (dwell measurement)
5   Block A — 5 items + optional open-ended
6   Storefront B → product page → "Add to bag"
7   Pop-up B
8   Continuation screen
9   Block B — identical to Block A
10  Awareness check — asked TWICE, once per brand      ← moved here from v1
11  Comparative block — 5 items + optional open-ended
12  Covariates + minimal demographics
13  Debrief + submit
```

The awareness check moves to screen 10 because its answer options enumerate the four conditions. Asked at screen 5 it would tell the participant exactly what is being manipulated before they ever see pop-up B, which destroys every measure in Block B. At screen 10 it is a fair recognition test and contaminates nothing.

---

## Block A / Block B — identical, forced order, no back navigation

Measurement order is unchanged from v1 and still matters: feelings before any question that names pressure or intent. Reordering these introduces a demand-induced correlation between your mediator and your outcome.

**B1 — Felt guilt** · 7-point, 1 = *not at all*, 7 = *very strongly*

> "I felt guilty about declining the offer."

*Keeps H1 testable. Without a guilt item you cannot claim confirmshaming operates as a guilt appeal, which is the entire basis for the Peng et al. prediction. Phrase it as felt guilt about declining — not about the brand.*

**B2 — Irritation** · 7-point, 1 = *not at all*, 7 = *very strongly*

> "I felt irritated by the way this offer was presented."

*This is your anger measure, and per Coulter & Pinto anger is the mediator that carries the damage to trust and purchase intention. Treat it as the mediator in analysis, not as a descriptive aside.*

**B3 — Perceived manipulation** · 7-point, 1 = *strongly disagree*, 7 = *strongly agree*

> "The way this offer was presented was intended to pressure me into accepting it."

*Tests H3.*

**B4 — Brand trust** · 7-point, 1 = *strongly disagree*, 7 = *strongly agree*

> "I would trust this brand."

*Level-framed, not change-framed. The difference score (experimental − neutral) is what measures the trust penalty; the item itself must not also contain a comparison, or the two nest and become uninterpretable. A level item also allows trust to go **up**, which is exactly what H4 predicts for the autonomy arm — a change-framed item cannot detect that.*

**B5 — Downstream choice** · single-select

> "If you were actually shopping for this type of product, which would you be most likely to do after seeing this pop-up?"
> ○ Buy from this brand
> ○ Consider buying from this brand, but compare alternatives first
> ○ Probably choose a competing brand instead
> ○ I would avoid buying either way
> ○ Not sure

*Store the raw category. Also store a derived ordinal `b5_ord` (buy = 3, compare = 2, competitor = 1, avoid = 0, not sure = NA) so you can difference it like the other items. With 13 per arm the raw five-way cross-tab will have cells of two or three people — report the ordinal difference score as the headline and the cross-tab as colour.*

**B6 — Open-ended** · optional, skippable immediately

> "What, if anything, stood out to you about the way the offer was presented?"

---

## Screen 10 — Awareness check (asked twice)

Show once for each brand, using the real brand names. Randomise option order; keep "I don't remember" last.

> "Which statement best describes the decline option that **{BRAND}** showed you?"
> ○ It was a neutral way to decline the offer
> ○ It suggested that declining meant missing out financially
> ○ It suggested that declining reflected something negative about me
> ○ It encouraged me to decide later
> ○ I don't remember / didn't notice the wording

Note the stem says "the decline option," not "the 'No thanks' option" — the neutral condition's button literally reads *No thanks*, so the v1 wording would have cued the answer.

Store `aware_{brand}_raw` and a derived `aware_{brand}_correct` (boolean), mapping: neutral → option 1, mild → option 2, strong → option 3, autonomy → option 4. A fast dismissal plus an incorrect or don't-remember answer is your **Ignore** classification.

---

## Screen 11 — Comparative block

Use the real brand names throughout. **Critical:** brand position is not condition — roughly half your participants saw the neutral pop-up on the first brand and half on the second. Every answer here must be recoded at analysis time into *experimental vs neutral*, not *first vs second*. Store both the raw answer and the recoded one.

**C1 — Relative manipulation** · single-select
> "Thinking about the two offers you just saw, which brand's pop-up felt more like it was trying to pressure you into accepting?"
> ○ {Brand 1} ○ {Brand 2} ○ Both equally ○ Neither ○ Don't remember

**C2 — Relative trust** · single-select
> "After seeing both offers, which brand would you trust more?"
> ○ {Brand 1} ○ {Brand 2} ○ Both equally ○ Neither

**C3 — Trust magnitude** · 7-point
> "Compared with {Brand 2}, how much do you trust {Brand 1}?"
> 1 = much less · 4 = about the same · 7 = much more

**C4 — Purchase choice** · single-select
> "If you had to choose one of these brands for your next purchase, which would you choose?"
> ○ {Brand 1} ○ {Brand 2} ○ Compare further first ○ Neither

**C5 — Overall experience** · 7-point
> "Overall, how would you rate your experience with {Brand 1} compared with {Brand 2}?"
> 1 = much worse · 4 = about the same · 7 = much better

**C6 — Open-ended** · optional
> "Thinking about both brands, what was the biggest difference you noticed between the two experiences?"

**One caution worth writing into the limitations slide:** asking participants to compare the two pop-ups directly makes the manipulation salient and invites them to construct a difference they may not have felt. The comparative block is therefore corroborating evidence, not primary evidence. Your primary evidence remains the behavioural logs and the B1–B5 difference scores, both of which are collected before this block exists. If the comparative block contradicts the behavioural data, believe the behavioural data.

---

## Recoding rules (for `analysis_starter.R`)

For every participant, let `exp_brand` be the brand that carried the experimental pop-up.

| Raw | Recoded |
| --- | --- |
| C1 answer == `exp_brand` | `c1_exp_more_manipulative = 1`, else 0, `NA` for don't-remember |
| C2 answer == `exp_brand` | `c2_trust_exp_more = 1`, else 0 |
| C3, C5 | If `exp_brand` is Brand 2, reverse: `8 − raw`. Result reads as *experimental relative to neutral* in all cases |
| C4 answer == `exp_brand` | `c4_choose_exp = 1`, else 0 |

Difference scores for Block items: `diff_bN = exp_bN − neutral_bN`, for N = 1–4 and for `b5_ord`.

---

## Revised data schema (replaces the block in PRD §8)

```
participant_id, recruiter_id, assignment_source, arm, order,
brand_neutral, brand_experimental,
started_at, submitted_at, duration_s, device, viewport

# behavioural — unchanged from PRD §5.1, prefixed neutral_ and exp_
*_choice, *_response_code, *_latency_ms, *_time_to_first_touch_ms,
*_cancelled_taps, *_press_dwell_ms, *_post_dismiss_dwell_ms,
*_rage_taps, *_abandoned

# self-report — five items per pop-up
neutral_b1_guilt, neutral_b2_irritation, neutral_b3_manipulation,
neutral_b4_trust, neutral_b5_raw, neutral_b5_ord, neutral_b6_open
exp_b1_guilt, exp_b2_irritation, exp_b3_manipulation,
exp_b4_trust, exp_b5_raw, exp_b5_ord, exp_b6_open

# derived differences
diff_b1, diff_b2, diff_b3, diff_b4, diff_b5

# awareness
aware_brand1_raw, aware_brand2_raw,
aware_neutral_correct, aware_exp_correct

# comparative — raw and recoded
c1_raw, c2_raw, c3_raw, c4_raw, c5_raw, c6_open
c1_exp_more_manipulative, c2_trust_exp_more, c3_recoded,
c4_choose_exp, c5_recoded

# covariates
popup_freq, dp_awareness, shopping_freq, age_band, gender, occupation
event_log_json
```

---

## What to tell Claude Code

If the app is already part-built, this is a patch rather than a rebuild — the storefront, pop-up, event logging, assignment endpoint and Apps Script layer are all unaffected. Paste this:

> The questionnaire has been cut down. Read `Instrument_v2.md` — it replaces sections 4 and 5 of the PRD. The experimental design, storefront, pop-up component, event logging and data layer are unchanged; only the item bank, the screen flow, and the CSV columns change.
>
> Three things in it are easy to get wrong, so please confirm you've handled each: (1) the awareness check is asked at screen 10 for both brands, never immediately after a pop-up; (2) the brand-trust item is level-framed ("I would trust this brand"), not change-framed; (3) every comparative answer must be stored raw **and** recoded relative to which brand carried the experimental pop-up — brand position is not condition. Update `codebook.md` and `analysis_starter.R` to match, including the recoding table.
