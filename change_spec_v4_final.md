# Change spec v4 — final build

Hand this to Claude Code in the existing project. This modifies the deployed app. Same repo, same Vercel project, same URL, same Google Sheet, same Apps Script.

Read this document in full before changing anything. Three separate changes are described here — link structure, experimental flow, and visual design — and the third one has constraints that come from the second. Do not start with the visual work.

**Read alongside:** `PRD_confirmshaming_experiment_app.md` (design, stimulus rules, ethics) and `Instrument_v2.md` (questionnaire). Where this document contradicts either, this document wins.

---

## Part 0 — What this study is, in one paragraph

Participants browse two fictitious online stores and are shown discount pop-ups. The **only** thing that differs between experimental conditions is the wording of the decline button. Everything else — layout, offer, timing, accept-button label, visual weight of the two buttons — is held constant. Every measured difference in the results is attributed to that wording, so any inconsistency introduced anywhere else in the app silently invalidates the study. This is why the "do not change" list in Part 6 is not stylistic fussiness.

---

## Part 1 — Three links, no recruiter

Trim `src/data/groupCodes.ts` to three entries:

```ts
export type Arm = 'mild' | 'strong' | 'autonomy';

export const GROUP_CODES: Record<string, Arm> = {
  k7m2: 'mild',
  p6hd: 'strong',
  n1ls: 'autonomy',
};
```

- Read `?g=` at the consent screen. Case-insensitive, trimmed.
- Valid code → that arm; log `assignment_source = 'group_code'`
- Missing or unrecognised → random arm client-side; log `assignment_source = 'random'`
- Never default to a fixed arm on a bad code

Remove `recruiter_id` from the data schema, the codebook, and `analysis_starter.R`.

The three final URLs:

```
https://cbendterm.vercel.app/?g=k7m2     mild shame
https://cbendterm.vercel.app/?g=p6hd     strong shame
https://cbendterm.vercel.app/?g=n1ls     autonomy-framed
```

`arm`, `order` and `pairing` stay as they are: arm from the URL, order and brand-pairing randomised per participant.

---

## Part 2 — Two pop-ups per brand

Currently each brand shows one pop-up. It now shows two.

**Why:** the current pop-up offers 15% off at no cost, so nearly everyone accepts regardless of condition. A dependent variable pinned at the ceiling cannot show a difference no matter how strong the manipulation. Both new pop-ups attach a cost to accepting, which gives the behaviour room to vary.

### Pop-up 1 — at checkout

Fires on checkout intent, as now.

> **Get 15% off this order**
> Add your email and we'll apply the discount at checkout.
>
> `[ Yes, apply 15% off ]`
> `[ decline button — arm wording ]`

### Pop-up 2 — after purchase

Fires on the order-confirmation screen, which is a new screen.

> **Get 15% off your next order**
> Follow us and we'll send the code to your feed.
>
> `[ Yes, follow and save ]`
> `[ decline button — arm wording ]`

### Decline wording — unchanged, and constant within a brand

| Condition | Decline wording |
| --- | --- |
| Neutral | No thanks |
| Mild shame | No thanks, I'll pay full price |
| Strong shame | No thanks, I don't need to save money |
| Autonomy | Not now — I'll decide later |

**Both pop-ups on a given brand carry that brand's wording.** The neutral brand shows "No thanks" twice; the experimental brand shows the arm's wording twice. Never mix levels within a brand — that would make arm a within-subject factor and the difference score would stop being interpretable.

Four pop-ups per session: 2 neutral, 2 experimental. Arm, order and pairing remain one draw each. No new combinations.

### Do not collect an email address

If the participant accepts pop-up 1, show a confirmation and move on. **Do not render a text input, and do not store anything typed.** Storing real email addresses would turn an anonymous study into one holding identifiable data, contradicting the consent screen and the ethics section.

Same for pop-up 2: accepting shows a confirmation. No external link, no real social handle, nothing opens.

Add to the debrief: no email address or social account was collected, and nothing was sent anywhere.

---

## Part 3 — Revised flow

```
0   Consent (?g= decoded here)
1   Instructions + cover task
2   Store A — browse, product page, add to bag
3   Checkout intent → POP-UP A1
4   Order confirmation screen → POP-UP A2
5   Block A questionnaire
6   Store B — browse, product page, add to bag
7   Checkout intent → POP-UP B1
8   Order confirmation screen → POP-UP B2
9   Block B questionnaire
10  Awareness check — both brands
11  Comparative block
12  Covariates + demographics
13  Debrief + submit
```

**One questionnaire block per brand, after both of that brand's pop-ups** — not one per pop-up. This doubles the behavioural data (the primary evidence) without doubling self-report burden, and avoids the "which pop-up?" ambiguity that two blocks would create.

Dwell time is measured on the screen following each pop-up: after A1 that's the order-confirmation screen, after A2 it's a brief continuation before the questionnaire.

---

## Part 4 — Questionnaire stem changes

Because each block now covers two pop-ups, stems move from pop-up level to brand level. Scales, order, and the no-back-navigation rule are unchanged from `Instrument_v2.md`.

| Item | New stem |
| --- | --- |
| B1 guilt | "I felt guilty about declining this brand's offers." |
| B2 irritation | "I felt irritated by the way this brand presented its offers." |
| B3 manipulation | "The way this brand presented its offers was intended to pressure me into accepting." |
| B4 trust | "I would trust this brand." *(unchanged)* |
| B5 downstream | "If you were actually shopping for this type of product, which would you be most likely to do after this experience?" *(options unchanged)* |
| B6 open | "What, if anything, stood out to you about the way this brand presented its offers?" |

Awareness check and comparative block: unchanged from `Instrument_v2.md`. The awareness stem still works, since decline wording is constant within a brand.

---

## Part 5 — Data schema

Each pop-up gets its own set of behavioural columns. Four prefixes:

```
neutral_p1_*   neutral_p2_*   exp_p1_*   exp_p2_*
```

Behavioural fields per pop-up, unchanged in definition:

```
*_choice, *_response_code, *_latency_ms, *_time_to_first_touch_ms,
*_cancelled_taps, *_press_dwell_ms, *_post_dismiss_dwell_ms,
*_rage_taps, *_abandoned
```

Self-report stays at one set per brand:

```
neutral_b1_guilt ... neutral_b6_open
exp_b1_guilt ... exp_b6_open
diff_b1 ... diff_b5
```

Add derived per-participant columns so the analysis doesn't have to recompute them:

```
neutral_accepts   count 0-2
exp_accepts       count 0-2
diff_accepts      exp_accepts - neutral_accepts
```

Remove: `recruiter_id`, `slot`.
Bump `app_version` to `4.0.0`.

Update `codebook.md` and `analysis_starter.R` to match, including the four-prefix structure and the acceptance counts.

---

## Part 6 — Do not change

If the redesign in Part 7 would affect any of these, stop and flag it rather than changing it.

1. **The four decline wordings.** Exact strings.
2. **Neutral is byte-identical across all three arms**, apart from brand name and accent colour. Every difference score in the analysis is experimental-minus-neutral. A baseline that drifts between arms corrupts every result and leaves no trace in the data.
3. **Accept and decline buttons have equal visual weight.** Same tap-target size (≥44px), same font size, same weight, same contrast ratio against the modal background. If decline is styled as a quiet text link while accept is a filled button, you have added visual interference — a second dark pattern — and the study can no longer attribute its findings to wording.
4. **No other dark patterns anywhere in the storefront.** No countdown timers, no "only 3 left", no "27 people are viewing this", no pre-ticked boxes, no fake urgency of any kind. These are confounds, not decoration.
5. **Pop-up structure is identical across conditions:** same headline, same subcopy, same accept label, same close "X" position and size, same entry animation, same timing, same dismiss-on-backdrop behaviour.
6. **All event logging and timing instrumentation.** `performance.now()` timestamps throughout. Null timing fields are a data-loss bug, not cosmetic.
7. **Questionnaire order and the no-back-navigation rule.** Feelings before any item naming pressure or intent.
8. **Awareness check stays at screen 10**, after all four pop-ups.
9. **No progress bar during the shopping screens.** Progress indication is fine during the questionnaire.
10. **Nothing hints this is a study** until the debrief.

---

## Part 7 — Visual design

The current build reads as a prototype. It needs to read as a real store, because a participant who senses they're in an experiment stops behaving like a shopper. Realism is the goal; polish is the means. Do not make it *interesting* — make it *unremarkable in the way real stores are unremarkable*.

### Subject

Two fictitious Indian D2C personal-care brands, already named in the build: **Maison Veloure** and **Aurevella**. Quiet premium positioning — the kind of brand sold on Instagram at ₹600–₹1,800 a product. Audience is urban Indian, 22–35, shopping on a phone.

### Hard constraint that overrides all aesthetic judgement

The two stores must be **structurally identical**. Same layout, same grid, same type scale, same spacing, same component set, same number of products, same copy patterns, same price range. They differ in exactly three things: brand name, accent colour, product imagery.

If one store looks nicer than the other, brand appeal becomes confounded with condition. Check the two palettes for equal luminance and equal saturation so neither reads as cheaper or more premium.

### Tokens

```
--ink        #1A1C1A     text
--muted      #6B6F6B     secondary text
--line       #E3E5E2     hairlines, dividers
--surface    #F2F3F1     page background
--card       #FFFFFF     product surfaces

--accent     #5B2E4A     Maison Veloure — deep plum
--accent     #1F4F4A     Aurevella — deep pine
```

Both accents are muted, roughly equal in luminance, and used sparingly: buttons, active states, the bag count. Not as a wash, not as a gradient.

### Type

One family throughout: **Instrument Sans** (Google Fonts). Product names and prices at a tighter tracking; body at default. Tabular numerals for prices. Sentence case everywhere — no all-caps labels.

Type scale: 13 / 15 / 17 / 22 / 30. Body copy under 70 characters per line.

### Layout

```
┌──────────────────────────────┐
│  Maison Veloure         (2)  │   thin header, name left, bag right
├──────────────────────────────┤
│  Hair   Skin   Body   Scent  │   category strip, horizontal scroll
├──────────────────────────────┤
│  ┌────────┐  ┌────────┐      │
│  │        │  │        │      │   2-col product grid
│  │  img   │  │  img   │      │   image 4:5, white card
│  └────────┘  └────────┘      │
│  Rosewater   Clay Mask       │   name 15px ink
│  ₹740        ₹1,120          │   price 15px muted
│                              │
│  ┌────────┐  ┌────────┐      │   6 products, no more
└──────────────────────────────┘
```

Product page: full-width image, name, price, two lines of description, one "Add to bag" button. Nothing else. No reviews, no ratings, no related products, no accordion.

Left-aligned throughout. 8px spacing grid. Border radius 4px on cards and buttons — consistent, not rounded-pill.

### Pop-up

Bottom sheet on mobile, centred modal on desktop — matching how real stores behave. Slides up in 200ms. Backdrop at 40% black.

Both buttons full-width, stacked, 48px tall, 12px apart. Accept filled in the accent. Decline outlined in `--line` with `--ink` text. Same height, same font size, same weight. The "X" sits top-right at 44×44px tap target.

Deliberately restrained: no icon, no illustration, no gradient, no shadow beyond a single soft lift.

### What to avoid

No hero banner, no carousel, no promotional strip, no newsletter footer, no social icons, no trust badges, no testimonial section, no "as seen in". Real small D2C stores are sparse. Clutter also gives participants more to look at and adds noise to your dwell-time measures.

Skip decorative motion. The only animation is the pop-up entry and the bag-count change. Respect `prefers-reduced-motion`.

### Quality floor

Responsive to 360px width. Visible keyboard focus. Tap targets ≥44px. Real product images — use a permissively-licensed source and commit them locally rather than hotlinking, so nothing breaks mid-study on a participant's phone.

---

## Part 8 — Build order

1. Part 1 (group codes) — smallest change, verify first
2. Part 2 and 3 (pop-up structure and flow)
3. Part 4 (stems) and Part 5 (schema), then a full round-trip to the Sheet
4. Part 7 (visual) last, once behaviour is correct and verified

Do not begin the redesign until a full session writes a complete, correct row to the Sheet. A beautiful app that drops data is worse than an ugly one that doesn't.

---

## Part 9 — Verify and report back

Run each and report the result. Do not tell me it is ready until all pass.

1. `/?g=k7m2` → arm `mild`; `/?g=p6hd` → `strong`; `/?g=n1ls` → `autonomy`
2. `/?g=zzzz` and `/` with no parameter → random arm, `assignment_source = 'random'`, never a fixed default
3. One session shows **four** pop-ups: two on each brand
4. Within a brand, both pop-ups show the **same** decline wording
5. The neutral brand shows "No thanks" on both its pop-ups, in all three arms
6. Screenshot the neutral pop-up under `mild` and under `strong` — they must be pixel-identical apart from brand name and accent
7. Accepting pop-up 1 stores no email; confirm no text input exists and nothing is written to the payload
8. All four sets of timing fields populate with non-null values
9. A complete run appends one row to the Sheet with no `slot`, no `recruiter_id`, `app_version = 4.0.0`
10. Time a full run on a phone-sized viewport and report the duration
11. Both stores side by side at 360px — confirm identical structure, differing only in name, accent, imagery

If item 10 comes out over eight minutes, tell me before cutting anything. I'll decide what goes.
