# Change spec — group-code arm assignment (v3)

Hand this to Claude Code in the existing project. This modifies the deployed app; it is not a rebuild. Same repo, same Vercel project, same URL, same Google Sheet.

---

## Context

The app currently assigns each participant to one of three framing arms itself. We're moving that decision out of the app and into the link. Each participant receives a link containing an opaque code that determines which arm they're in and which team member recruited them.

**Why:** the study needs a clean 15/15/15 split across arms, and it needs each arm to draw from all four recruiters' social circles rather than one arm coming entirely from one person's friends. Controlling assignment through the links is the only way to get both.

**What does not change:** the storefront, the pop-up component, the decline-button copy, all event logging and timing instrumentation, the questionnaire, the debrief, and the Apps Script / Google Sheets layer. Do not touch those.

---

## 1. Group codes

Create `src/data/groupCodes.ts`:

```ts
export type Arm = 'mild' | 'strong' | 'autonomy';

export interface GroupAssignment {
  recruiter: 1 | 2 | 3 | 4;
  arm: Arm;
}

export const GROUP_CODES: Record<string, GroupAssignment> = {
  k7m2: { recruiter: 1, arm: 'mild'     },
  r4xn: { recruiter: 1, arm: 'strong'   },
  b9qt: { recruiter: 1, arm: 'autonomy' },
  w3fe: { recruiter: 2, arm: 'mild'     },
  p6hd: { recruiter: 2, arm: 'strong'   },
  z2vc: { recruiter: 2, arm: 'autonomy' },
  m8ju: { recruiter: 3, arm: 'mild'     },
  t5ya: { recruiter: 3, arm: 'strong'   },
  n1ls: { recruiter: 3, arm: 'autonomy' },
  d7or: { recruiter: 4, arm: 'mild'     },
  h4gw: { recruiter: 4, arm: 'strong'   },
  c9ib: { recruiter: 4, arm: 'autonomy' },
};
```

Read `?g=` from the URL at the consent screen. Codes are case-insensitive; trim whitespace.

- **Valid code** → use its arm and recruiter; log `assignment_source = 'group_code'`
- **Missing or unrecognised code** → pick an arm at random client-side, set `recruiter = null`; log `assignment_source = 'random'`

Never fall back to a fixed arm. A mistyped link must not silently stack participants into one condition.

The code itself is never shown in the UI and never written to the data — log the decoded `arm` and `recruiter_id` instead, so the Sheet is readable without hand-decoding.

---

## 2. Remove the server assignment call

The app currently fetches its condition from the Apps Script `?action=assign` endpoint. Delete that call and everything around it — the fetch, the retry, the loading state, the `slot` field, and the fallback branch.

Arm now comes from the URL. Order and brand pairing are drawn client-side with `Math.random()` at the start of the session:

- `order`: `neutral_first` | `exp_first`
- `pairing`: which of the two brands carries the neutral pop-up

Both are nuisance factors being counterbalanced, not the allocation we're controlling, so per-participant randomisation is sufficient and exact balance isn't required.

This also removes the failure mode where an unreachable endpoint silently forced every participant into fallback assignment.

Keep `slot` out of the schema entirely rather than writing `-1`.

---

## 3. Data schema changes

**Remove:** `slot`

**Add / change:**

| Column | Values |
| --- | --- |
| `recruiter_id` | `1`–`4`, or empty when `assignment_source = 'random'` |
| `assignment_source` | `group_code` \| `random` |
| `arm` | `mild` \| `strong` \| `autonomy` (unchanged values, new source) |

`order`, `pairing`, `brand_neutral`, `brand_experimental` all stay as they are.

Bump `app_version` to `3.0.0` so rows collected before and after this change are distinguishable in the Sheet.

---

## 4. Backend

The Apps Script needs no changes for this. It already appends any new keys as new columns, so removing `slot` and adding `recruiter_id` is handled automatically.

`doGet` can stay in place — harmless, and `?action=ping` is still useful for checking the endpoint is alive.

---

## 5. Do not change

Say so explicitly if any of these would be affected by the refactor, rather than changing them:

- The four decline-button wordings
- The rule that the neutral pop-up is byte-identical across all three arms apart from the brand name — this is what the entire analysis rests on
- Event logging: `latency_ms`, `cancelled_taps`, `press_dwell_ms`, `post_dismiss_dwell_ms`, `rage_taps`, `abandoned`
- Questionnaire item wording, order, or the no-back-navigation rule
- The awareness check staying at screen 10, after both pop-ups

---

## 6. Also update

- `README.md` — add the twelve links, the code-to-arm mapping, and a note that the mapping file must not be shared with participants
- `codebook.md` — remove `slot`, add `recruiter_id`, update `assignment_source` values
- `analysis_starter.R` — read `recruiter_id`, and add a check for arm × recruiter balance so recruiter effects are visible during analysis rather than discovered afterwards

---

## 7. Verify before handing me the build

Run each of these and report the result:

1. `/?g=k7m2` → arm is `mild`, recruiter `1`, source `group_code`
2. `/?g=c9ib` → arm is `autonomy`, recruiter `4`
3. `/?g=ZZZZ` and `/` with no parameter → random arm, empty recruiter, source `random`
4. Same link opened five times → `order` and `pairing` vary, `arm` does not
5. Two different arms → the neutral pop-up renders identically in both, apart from brand name
6. A full run submits to the Sheet with no `slot` column and a populated `recruiter_id`
