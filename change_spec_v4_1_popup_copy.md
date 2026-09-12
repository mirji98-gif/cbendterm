# Change spec v4.1 — pop-up copy

Small change. Copy only — no layout, logic, schema or logging changes.

---

## Problem

The cost of accepting is currently buried in the grey subtext while the headline advertises only the reward. A participant skimming on a phone reads "Get 15% off this order" and taps accept before registering that an email is being asked for. That defeats the purpose of adding a cost in the first place: if the trade-off isn't salient at the moment of choice, acceptance stays near ceiling and the decline-button wording has nothing to act on.

The ask and the reward should carry equal weight, and both belong in the headline.

---

## New copy

### Pop-up 1 — at checkout

> **Add your email, get 15% off this order**
> The discount applies at checkout.
>
> `[ Yes, apply 15% off ]`
> `[ decline — arm wording ]`

### Pop-up 2 — after purchase

> **Follow us, get 15% off your next order**
> We'll send the code to your feed.
>
> `[ Yes, follow and save ]`
> `[ decline — arm wording ]`

Both headlines take the form *give-this, get-that* so the exchange is legible in one read. Keep them structurally parallel — the only intended difference between the two pop-ups is the nature of the ask.

Subtext drops to a single short line. If it's carrying no information beyond the headline, cut it entirely rather than padding it.

---

## Constraints

- Headline and subcopy are **identical across all three arms and both brands**, apart from the brand name. Only the decline button varies. This is what the entire analysis rests on.
- Accept-button labels unchanged.
- Decline wordings unchanged, and still constant within a brand across both its pop-ups.
- Accept and decline keep equal visual weight — same height, font size, weight and contrast.
- No layout, timing, animation, event-logging or data-schema changes.
- No version bump needed; this is copy only.

---

## Two other things in the screenshot

**The brand name is set in tracked-out capitals above the headline.** Real D2C stores rarely do this in a pop-up, and it reads as template chrome rather than as a store. Set it in sentence case at body size, or drop it — the participant already knows which store they're on. Your call, but apply the same treatment to both brands.

**Product images are grey placeholder shapes.** If that's still true at recruitment, participants will know it's a mock-up within seconds and stop behaving like shoppers. Real product photography is the single highest-value realism fix left. Use a permissively-licensed source and commit the images locally so nothing fails to load on a participant's mobile connection.

---

## Verify this change

1. Both pop-ups show the ask in the headline, at headline weight
2. Screenshot pop-up 1 under `mild` and under `strong` — identical apart from the decline button
3. Screenshot pop-up 1 on both brands — identical apart from brand name and accent
4. Accepting still stores no email and renders no text input

---

# Full project sanity check

Once the copy change is in, audit the entire project against the specs before we recruit anyone. Read `PRD_confirmshaming_experiment_app.md`, `Instrument_v2.md` and `change_spec_v4_final.md` in full, then check the built app against them.

This app has been changed five times. Each change was correct in isolation, but requirements have been added, replaced and partly reversed along the way, and specs that contradict each other tend to leave residue in the code. That residue is the risk: this study runs once, with 45 people, and a flaw discovered after recruitment cannot be fixed by re-running it.

**Report findings before fixing anything.** For each issue: what the spec says, what the code does, how bad it is, and what you propose. I want to see the list before changes are made — some of what looks wrong may be a deliberate decision you don't have context for.

## A — Experimental integrity

These are the ones that would invalidate results rather than merely annoy a participant. Check them first and hardest.

1. The neutral pop-up renders identically in all three arms — same markup, same styles, same timing, same animation. Trace the code path and confirm nothing branches on `arm` except the decline string.
2. Both pop-ups within a brand carry that brand's decline wording. No mixing.
3. The decline strings match the spec exactly, character for character, including the apostrophes and the em dash in "Not now — I'll decide later".
4. Accept and decline are equal in height, font size, font weight, and contrast ratio. Measure, don't eyeball.
5. No other dark pattern anywhere: no countdown, no stock scarcity, no viewer counts, no pre-ticked boxes, no urgency copy.
6. `arm` is fixed for a session and never re-drawn between brands or pop-ups.
7. `order` and `pairing` are drawn once at session start and genuinely vary across runs.
8. Brand is not confounded with condition — confirm the pairing logic actually swaps which brand carries neutral.
9. The two storefronts are structurally identical: same layout, product count, type scale, spacing, price range, copy patterns.

## B — Dead code from earlier versions

Each of these was specified and then removed or changed. Confirm nothing survives.

10. No `?action=assign` call anywhere. No `slot` field. No fallback-assignment branch.
11. No `recruiter_id` in code, schema, codebook or analysis script.
12. Only three group codes exist. The twelve-code table is gone, including from the README.
13. `?arm=` is no longer readable as a URL parameter — only `?g=`.
14. The v1 questionnaire is gone: no IMI items, no credibility items, no attribution items, no eleven-item emotion grid.
15. The one-pop-up-per-brand flow leaves no remnants — no orphaned screens or unreachable states.

## C — Instrument

16. Item wording matches `Instrument_v2.md` and the brand-level stems in v4 Part 4, exactly.
17. Screen order is feelings → attitudes → manipulation, with no back navigation.
18. The awareness check is at screen 10, after all four pop-ups, and asked once per brand.
19. The comparative block stores both raw answers and answers recoded relative to which brand carried the experimental pop-up. Verify the recoding with a worked example in each order.
20. Scale anchors and ranges are right: 7-point, correct endpoints, no off-by-one.
21. Reverse-coding flags in the item bank match what the codebook and analysis script expect.

## D — Data

22. A complete run writes exactly one row, with all four pop-up prefixes populated and no null timing fields.
23. Column names in the Sheet match `codebook.md` exactly.
24. Derived fields are right: `diff_b1`–`diff_b5`, `neutral_accepts`, `exp_accepts`, `diff_accepts`.
25. `app_version` is current and distinguishes these rows from earlier test rows.
26. A dropout mid-session either writes nothing or writes a row flagged `status = 'incomplete'` — never a silent partial row.
27. The localStorage backup and the "Copy my responses" fallback still work after the refactors.
28. No email address, social handle or free-text identifier is ever stored.

## E — Participant experience

29. Full run on a 360px viewport with no horizontal scroll and no overlapping elements.
30. Nothing reveals the study before the debrief: no progress bar during shopping, no experiment vocabulary, no condition names in visible DOM text.
31. Back button, refresh and accidental navigation don't corrupt or duplicate a session.
32. Consent and debrief text match PRD §9, and the debrief covers the deception, the fictitious brands, the manipulated wording, and that no email or account data was collected.
33. Product images load from local files, not hotlinks.

## F — Report

Finish with:

- Every discrepancy found, rated: **blocks recruitment** / **should fix** / **cosmetic**
- Anything in the specs that is ambiguous or self-contradictory — say so rather than guessing
- A timed full run on a phone viewport
- Screenshots: the neutral pop-up under all three arms, and both storefronts side by side

If anything is rated *blocks recruitment*, say so plainly at the top. I would much rather hear it now than after 45 people have finished.
