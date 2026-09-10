# PRD — Confirmshaming Experiment App ("Storefront Study")

**Owner:** Adi (CB End-Term Project, Group 2)
**Purpose:** A self-administered web app that runs the confirmshaming experiment end-to-end — mock storefront, discount pop-up, unobtrusive behavioural logging, post-task instrument, debrief, and data export.
**Target:** N = 40, ~6 minutes per participant, mobile-first, run over ~1 week.

---

## 1. Why an app and not a form

The dependent variables that carry the argument — decision latency, cancelled taps, route of refusal (button vs "X"), dwell time, abandonment — do not exist in a survey. They only exist if the participant makes a real choice inside a real-feeling interface. The app is the instrument; the questionnaire is the second half of it.

---

## 2. What the literature changes about the original design

Four findings from the source papers should be built into the app, not bolted on afterwards. These are the highest-value changes.

**2.1 Anger is the mediator, not irritation-as-a-side-note.**
Coulter & Pinto (1995) found guilt-appeal intensity raised anger monotonically, and that **anger — not felt guilt — mediated the damage to ad attitude, brand attitude, corporate attributions and purchase intention**. Felt guilt followed an inverted U (moderate > low and high). This is the single most useful result for this study: it predicts that mild shame and strong shame do *different* things, not merely more-of-the-same. Build a three-factor felt-emotion battery (guilt / anger-irritation / happy-amused) and treat anger as the mediator in analysis.

**2.2 Measurement order is a design constraint.**
Both Campbell (1995) and Cotte et al. (2005) deliberately measured felt emotions and attitudes **before** any item about the advertiser's intent, to avoid demand-induced correlations between the mediator and the outcome. The app must enforce: *felt emotions → attitudes & intentions → manipulative intent & attributions → awareness check → open-ended.* No back navigation.

**2.3 The two shame conditions differ theoretically, not just in intensity.**
Peng et al. (2023) find guilt appeals are weaker when they attribute responsibility to the perceiver (g falls) and weaker when they stress controllability, and *stronger* when the cause is framed as unstable (a behaviour) rather than stable (a trait). "I'll pay full price" targets a behaviour; "I don't need to save money" targets a standing attribute of the self — which is the shame end of the shame/guilt distinction. So the prediction is sharper than "more shame, more effect": mild should sit near the compliance peak, strong should tip into anger and reactance. Also worth noting for the write-up: in Peng's meta-analysis the advertising/marketing context produced the **weakest** effects of all (unadjusted ḡ = −0.11 vs 0.19 overall) — a strong prior for H1.

**2.4 Credibility is the enhancing counterpart to manipulative intent.**
Cotte et al. found credibility and IMI are distinct and negatively correlated (r ≈ −.51), and that credible-but-not-manipulative appeals worked while credible-but-manipulative ones backfired. Three extra items ("believable / truthful / realistic") buy a second explanatory axis for almost no participant burden.

---

## 3. Experimental design the app must implement

| Element | Spec |
| --- | --- |
| Between-subjects factor | Framing arm: `mild` (n=13), `strong` (n=13), `autonomy` (n=14) |
| Within-subjects factor | Pop-up type: `neutral` (all participants) vs `experimental` (assigned arm) |
| Stimuli | Two fictitious brands, same product category, identical offer and layout |
| Counterbalancing | Order (neutral-first vs experimental-first) **and** brand–condition pairing must both be crossed → 4 counterbalance cells per arm |
| Primary outcome | Within-person difference score (experimental − neutral) per measure |

**Decline-button copy (the only thing that varies):**

| Condition | Decline wording |
| --- | --- |
| Neutral baseline | No thanks |
| Mild shame | No thanks, I'll pay full price |
| Strong shame | No thanks, I don't need to save money |
| Autonomy-framed | Not now — I'll decide later |

Everything else in the pop-up is byte-identical across conditions: headline, offer value, accept-button label, close "X" size and position, dismiss-on-backdrop behaviour, animation, timing.

---

## 4. Participant flow

```
0  Landing + informed consent            (consent gate; no data written until accepted)
1  Instructions + cover task
2  Storefront A  → product page → "Add to bag"
3  Pop-up A      (condition per assignment)
4  Continuation screen (dwell measurement, 6s or until action)
5  Block A questionnaire
6  Storefront B  → product page → "Add to bag"
7  Pop-up B
8  Continuation screen
9  Block B questionnaire
10 Awareness recognition task (both brands, retrospective)
11 Open-ended probe
12 Covariates + minimal demographics
13 Debrief + submit
```

**Cover task (screen 1):** "You're trying out a new store. Browse, pick one item you'd actually consider buying, and add it to your bag." This gives a reason to be there, makes the pop-up a genuine interruption, and makes abandonment meaningful.

**Pop-up trigger:** fires on add-to-bag / checkout intent, not on page load. That is where discount pop-ups actually appear in Indian e-commerce, and it means the participant has already invested effort — which is exactly the "personal investment" variable Campbell showed drives inferences of manipulative intent.

**Why the awareness check is at screen 10, not immediately:** an immediate awareness check on pop-up A would prime the participant for pop-up B and destroy the "Ignore" classification for the second brand. Instead, at screen 10 show a recognition task — all four decline wordings as options, twice ("Which decline option did Brand A show you?" / "…Brand B?"), with "Don't remember" as an option. Recognition is a fair test of whether the wording registered, and it can be asked retrospectively without contaminating anything.

---

## 5. Measures

### 5.1 Behavioural (logged silently, no participant awareness)

| Field | Definition |
| --- | --- |
| `choice` | `accept` \| `decline_button` \| `close_x` \| `backdrop` \| `abandon` |
| `latency_ms` | Pop-up fully rendered → first committed action |
| `time_to_first_touch_ms` | Pop-up rendered → first pointerdown anywhere in the modal |
| `cancelled_taps` | Count of pointerdown on a control followed by pointerup outside it / pointercancel |
| `hover_or_press_dwell_ms` | Total pressed-but-not-released time on the decline button |
| `post_dismiss_dwell_ms` | Time on the continuation screen before advancing |
| `scroll_events`, `rage_taps` | ≥3 taps within 500ms in the same region — cheap proxy for frustration |
| `abandoned` | Left / idle >90s / closed tab before submit |

### 5.2 Response-type coding (derived, not asked)

| Behaviour | Code | Interpretation |
| --- | --- | --- |
| Accepts the offer | Comply | Short-term effectiveness |
| Clicks the loaded decline button | Resist | Deliberate confrontation; reactance |
| Closes via "X" / backdrop, or abandons | Avoid | Shame avoidance rather than offer rejection |
| Fast dismissal (<1.5s) + fails recognition | Ignore | Tactic passed unnoticed |

Store `latency_ms` and recognition separately so the Ignore threshold can be re-tuned during analysis.

### 5.3 Self-report — Block A and Block B, identical, in this fixed order

**(a) Felt emotions** — 7-point, 1 = *not at all*, 7 = *very strongly*. Stem: "How did that pop-up make you feel?" Present in a single randomised grid.

- Guilt factor: guilty, ashamed, accountable, irresponsible
- Anger–irritation factor: annoyed, angry, irritated
- Happy–amused factor: amused, happy, good
- Distractor (keeps guilt from being salient): surprised, bored

*(Item set and factor structure from Coulter & Pinto 1995, trimmed from 15 to 11.)*

**(b) Attitudes and intentions** — 7-point semantic differentials + Likerts.

- Attitude to the pop-up: bad–good, unfavourable–favourable, negative–positive
- Brand attitude: same three anchors
- Brand trust (3 items, agree–disagree): "I would trust this brand with my payment details" / "This brand deals with customers honestly" / "This brand is upfront about what it wants from me"
- Purchase intention (1): "How likely would you be to buy from this brand?"
- Recommendation intention (1): "How likely would you be to recommend this brand to a friend?"
- Switching intention (1): "How likely would you be to buy from a competitor instead?"

**(c) Perceived manipulative intent** — 6 items, 7-point agree–disagree, reverse-code as marked. Use Campbell's (1995) wording, adapted from "ad" to "pop-up":

1. The way this pop-up tries to persuade people seems acceptable to me. *(R)*
2. The brand tried to manipulate shoppers in ways that I don't like.
3. I was annoyed by this pop-up because the brand seemed to be trying to inappropriately manage or control shoppers.
4. I didn't mind this pop-up; the brand tried to be persuasive without being excessively manipulative. *(R)*
5. This pop-up was fair in what was said and shown. *(R)*
6. I think this pop-up is unfair / fair. *(semantic differential)*

**(d) Credibility** — 3 items, 7-point: the offer was believable / truthful / realistic. *(Cotte et al. 2005.)*

**(e) Brand attributions** — 3 items, 7-point agree–disagree: "This brand is trying to manipulate my feelings" / "This brand is mainly concerned with making money" / "This brand has customers' best interests at heart." *(R on the third.)*

### 5.4 End-of-study only (screens 10–12)

- Recognition task (§4)
- Open-ended: "In your own words, why did you respond to each pop-up the way you did?" — free text, min 15 characters, skippable after 10s
- Covariates: pop-up exposure frequency (1 item), dark-pattern awareness (1 item, "Before today, had you come across the term 'dark patterns'?"), online shopping frequency (1 item)
- Demographics: age band, gender (incl. prefer-not-to-say), student/working

**Burden check:** ~34 rated items × 2 blocks is too long for 6 minutes on a phone. **Cut rule if piloting runs over 7 minutes:** drop the credibility trio from Block A only (keep in B), drop the happy–amused factor, and drop switching intention — in that order. Do not cut IMI or the anger factor.

---

## 6. Stimulus design

**Brands.** Two invented brands in one category so the offer is equally relevant in both. Suggested: home & kitchen essentials — `Maruvi` and `Tolen`. Both must pretest as neutral (neither aspirational nor cheap-sounding). Assign brand ↔ condition randomly within each arm so brand identity is never confounded with framing.

**Offer.** Identical in both: "Flat 15% off your first order." Same headline, same subcopy, same accept label ("Yes, apply 15% off"), same close affordance.

**Storefront realism.** 6–8 product cards with photos, prices in ₹, a category strip, a bag icon with count, and a plausible footer. Realism matters more than polish: participants must not feel they are in a psychology experiment. Do not include a visible progress bar during the shopping screens — only during the questionnaire.

**Visual direction.** Clean Indian D2C aesthetic: one accent colour per brand (differentiate the two brands by palette so they read as separate stores), system-ish sans (Inter), generous whitespace, 8px grid, product images from a permissively-licensed source or generated placeholders. Pop-up should be a bottom sheet on mobile, centred modal on desktop — matching real behaviour.

**Accessibility floor:** decline and accept buttons must have the same tap target size (≥44px) and the same contrast ratio. Any asymmetry there introduces a second dark pattern (visual interference) and confounds the manipulation.

---

## 7. Technical requirements

**Stack.** Vite + React + TypeScript + Tailwind. No router — a single state machine (`step`, `assignment`, `eventLog`) so back/refresh cannot corrupt a session. Framer Motion optional for the pop-up transition only.

**Hosting.** Static deploy to Vercel or Netlify. One public URL, plus `?r=1..4` to tag which team member recruited the participant.

**Data layer.** Google Apps Script Web App writing to a Google Sheet — no auth, no cost, and it matches the toolchain already in use.

Two endpoints:

- `GET ?action=assign` → returns the next slot from a pre-generated balanced sequence (arm × order × brand-pairing) and increments a counter. This is what guarantees 13/13/14 rather than approximately-13/13/14, and it keeps counterbalancing exact at N=40.
- `POST` (form-encoded, `mode: 'no-cors'`) → appends the full participant row.

**Resilience.** Mirror every state change to `localStorage`. On submit failure, retry twice, then show a "Copy my responses" button that puts the JSON on the clipboard so the participant can WhatsApp it to the recruiter. At N=40, one lost participant is 2.5% of the sample.

**Assignment integrity.** Fetch the assignment at screen 0 *after* consent, not at page load — otherwise curious visitors burn slots. If the assign endpoint fails, fall back to client-side random assignment and set `assignment_source = 'fallback'`.

**Debug mode.** `?debug=1&arm=strong&order=exp_first` forces a condition and shows a live event-log overlay. Must be inert without the flag.

**Admin view.** `/admin?key=...` — live count per cell, mean completion time, abandonment rate, and a "Download CSV" button. This is how you know on day 3 whether you'll hit 13/13/14.

---

## 8. Data output

One row per participant. Suggested column groups:

```
participant_id, recruiter_id, assignment_source, arm, order, brand_neutral, brand_experimental,
started_at, submitted_at, duration_s, device, viewport

# repeated with prefixes neutral_ and exp_
*_choice, *_response_code, *_latency_ms, *_time_to_first_touch_ms, *_cancelled_taps,
*_press_dwell_ms, *_post_dismiss_dwell_ms, *_rage_taps, *_abandoned
*_guilt_1..4, *_anger_1..3, *_happy_1..3, *_distractor_1..2
*_att_popup_1..3, *_att_brand_1..3, *_trust_1..3, *_pi, *_ri, *_si
*_imi_1..6, *_cred_1..3, *_attrib_1..3

recognition_neutral, recognition_exp, recognition_correct_neutral, recognition_correct_exp
open_ended, popup_freq, dp_awareness, shopping_freq, age_band, gender, occupation
event_log_json
```

Ship a `codebook.md` alongside, listing every column, its scale, and which items reverse-code. Also ship an `analysis_starter.R` (or `.py`) that reads the CSV, reverse-codes, builds scale scores with Cronbach's alpha, computes the within-person difference scores, and runs the three-group comparison. That file is what turns collected data into slides in an evening.

---

## 9. Ethics

Consent screen states: participation is voluntary, ~6 minutes, responses anonymous and reported only in aggregate, no personal data collected, withdraw at any time by closing the tab. Debrief screen discloses the deception explicitly — that the brands are fictitious, that the decline wording was manipulated, that the study is about confirmshaming — and names India's CCPA *Guidelines for Prevention and Regulation of Dark Patterns, 2023*. Include a one-line "what to watch for" so the debrief is worth reading. No health, appearance, financial or otherwise sensitive domain anywhere in the stimuli.

---

## 10. Build order

1. State machine + step scaffolding + consent/debrief shells
2. Apps Script endpoints + Sheet + round-trip test with fake data ← **do this before any UI polish**
3. Storefront + product page + bag (one brand, then duplicate with a palette swap)
4. Pop-up component with condition-driven copy + full event instrumentation
5. Questionnaire engine (JSON-driven item bank, randomised within-grid order, forced-order screens)
6. Recognition task, open-ended, covariates, demographics
7. Admin view + CSV export + codebook
8. Mobile QA on a real phone on mobile data, then two pilot runs with people outside the group

**Definition of done:** two pilot participants complete on their own phones without asking a single question, both rows land in the Sheet with non-null timing fields, and the CSV opens cleanly.

---

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| Block A questionnaire primes pop-up B | Accepted: symmetric across arms and order is counterbalanced, so it inflates awareness equally everywhere and does not bias the between-arm contrast. Immediate measurement is also required because guilt-appeal effects decay (Peng et al.) |
| Participant recognises it's an experiment | Cover task, realistic storefront, no progress bar during shopping, debrief only at the end |
| Recruiter effects (each member recruits 10 friends) | `recruiter_id` logged; check for cell imbalance in the admin view and report it as a limitation |
| Small N | Report effect sizes and direction as primary evidence, paired tests as support — as already planned |
| Mobile jank makes latency data noisy | Timestamp with `performance.now()`, log device and viewport, and exclude any session with a >2s render gap on the pop-up |

---

## References

Campbell, M. C. (1995). *Journal of Consumer Psychology*, 4(3), 225–254.
Cotte, J., Coulter, R. A., & Moore, M. (2005). *Journal of Business Research*, 58(3), 361–368.
Coulter, R. H., & Pinto, M. B. (1995). *Journal of Applied Psychology*, 80(6), 697–705.
Peng, W., et al. (2023). *Frontiers in Psychology*, 14, 1201631.
Naheyan, T., & Oyibo, K. (2024). *PERSUASIVE 2024*, LNCS 14636, 190–206.
