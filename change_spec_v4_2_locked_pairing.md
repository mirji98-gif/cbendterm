# Change spec v4.2 — locked brand pairing + data identifiers

Two changes. Copy and behaviour only — no change to the questionnaire, the decline wordings, or the event instrumentation.

---

## Part 1 — Lock the brand pairing

Currently the app randomises which of the two brands carries the neutral pop-up and which carries the experimental one. Remove that randomisation and fix it:

- **Aurevella** always carries the **neutral** pop-ups ("No thanks" ×2)
- **Maison Veloure** always carries the **experimental** pop-ups (the arm's wording ×2)

This holds in all three arms, for every participant.

`order` stays randomised — which brand the participant visits first must still vary per session, and must still be logged.

Remove the `pairing` draw from session setup. Keep the `pairing` **column** in the data (see Part 2); it now writes a constant, which is deliberate — it documents the design in the dataset itself rather than leaving a future reader to infer it.

### Required compensating change: neutralise the brands

Locking the pairing means brand identity is now perfectly confounded with condition. Every experimental score in the dataset is also a Maison Veloure score, and the two cannot be separated statistically. The only remaining defence is making the brands as interchangeable as possible, so this is not optional polish — it is what keeps the design defensible.

Audit both storefronts and make them match on every dimension that could plausibly affect how trustworthy or appealing a brand feels:

- **Palette.** Measure the two accents for luminance and saturation and bring them within a few percent of each other. Neither may read as colder, cheaper or more premium.
- **Product imagery.** Same source, same style, same crop, same background, same apparent production value. If one set looks better shot than the other, that difference will land on your treatment effect.
- **Product names and prices.** Same number of products, same price range, same naming convention, comparable word lengths.
- **Copy.** Identical structure and register in product descriptions, category names, button labels, and any store chrome.
- **Layout.** Already required to be structurally identical — re-verify after these changes.

Report anything you cannot make equivalent, with what differs and by how much.

---

## Part 2 — Data identifiers

Every row must be self-describing: someone opening the Sheet cold should be able to reconstruct exactly what that participant saw, without referring to the code or to any external mapping. Add or confirm these columns.

### Session identity

| Column | Values | Notes |
| --- | --- | --- |
| `participant_id` | UUID | unchanged |
| `app_version` | `4.2.0` | bump it |
| `status` | `complete` \| `incomplete` | never a silent partial row |
| `is_debug` | `TRUE` \| `FALSE` | so test runs are filterable, not deletable-by-memory |
| `started_at`, `submitted_at`, `duration_s` | ISO 8601 / seconds | |
| `device`, `viewport` | | |

### Condition identity

| Column | Values | Notes |
| --- | --- | --- |
| `group_code` | `k7m2` \| `p6hd` \| `n1ls` \| empty | the raw `?g=` value, logged as received |
| `arm` | `mild` \| `strong` \| `autonomy` | decoded |
| `assignment_source` | `group_code` \| `random` | |
| `order` | `neutral_first` \| `exp_first` | randomised per session |
| `pairing` | `locked_aurevella_neutral` | constant by design |
| `brand_neutral` | `Aurevella` | |
| `brand_experimental` | `Maison Veloure` | |
| `decline_text_neutral` | `No thanks` | **the literal string shown** |
| `decline_text_experimental` | the arm's literal string | **the literal string shown** |

The two `decline_text_*` columns are the most important addition here. They record what the participant actually saw, rather than a label pointing at code that may since have changed. If a wording bug ever slips through, these columns are the only way you would find out. Write them from the same constant the pop-up renders — not a duplicate literal, or they can drift apart and defeat the purpose.

### Per-pop-up identity

Four pop-ups per session. Keep the existing `neutral_p1_`, `neutral_p2_`, `exp_p1_`, `exp_p2_` prefixes, and add three descriptive columns per pop-up so each is interpretable on its own:

| Suffix | Values |
| --- | --- |
| `*_brand` | `Aurevella` \| `Maison Veloure` |
| `*_ask` | `email` \| `social_follow` |
| `*_position` | `1`–`4`, the order this pop-up appeared in the session |

`*_position` is what lets you test for fatigue and order effects — with four pop-ups, acceptance almost certainly declines across the session, and without position you cannot separate that from condition.

### Header row

Regenerate `codebook.md` from the item bank and the schema so it cannot drift from what is actually written. Every column: name, type, allowed values, and one line on what it means.

---

## Part 3 — Sheet hygiene

- Keep **one sheet** for all three links. The identifier columns above make every cut recoverable by filtering; three sheets would have to be merged before any analysis and would add a chance of column misalignment each time.
- Column order in the Sheet should follow the grouping above — session identity, condition identity, per-pop-up behaviour, self-report, derived, open-ended, event log last. The event-log JSON blob is wide and belongs at the far right where it doesn't obstruct reading.
- Confirm the Apps Script still appends new columns rather than dropping unknown keys, given the schema has changed again.

---

## Part 4 — Analysis script

Update `analysis_starter.R`:

- Drop any brand-as-factor logic — brand is now constant within condition and cannot be modelled separately. Add a comment saying so, and why.
- Add `position` as a covariate in the acceptance analysis.
- Add a startup assertion that `pairing` is constant across all rows and that `decline_text_experimental` matches `arm` for every row. If either fails, the dataset is contaminated and the script should stop rather than produce output.

---

## Part 5 — Limitations note

Add to `README.md`, for the write-up:

> Brand-condition pairing was fixed rather than counterbalanced: Aurevella carried the neutral pop-ups and Maison Veloure the experimental pop-ups for all participants. Brand identity is therefore confounded with condition, and observed differences cannot be fully attributed to decline-button wording alone. The two storefronts were matched on layout, palette luminance, imagery, pricing and copy to minimise this, but it remains a limitation of the design.

Put this in the limitations slide. Stating it plainly is much stronger than having it found in the viva.

---

## Verify

1. Ten runs across all three arms — `brand_neutral` is `Aurevella` every time
2. Across those runs, `order` varies
3. `decline_text_experimental` matches the arm on every row, and `decline_text_neutral` is `No thanks` on every row
4. All four pop-ups carry `*_brand`, `*_ask` and `*_position`, and `*_position` values are `1,2,3,4` with no duplicates
5. `group_code` logs the raw parameter; a bad code gives empty `group_code` with `assignment_source = 'random'`
6. Side-by-side screenshots of both storefronts at 360px — report any remaining visual asymmetry
7. Report measured luminance and saturation for both accent colours
8. A full run appends one row with `app_version = 4.2.0` and no null identifier fields
