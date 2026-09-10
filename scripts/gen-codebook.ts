/**
 * Generates codebook.md and analysis/generated_scales.R from the item bank and
 * the column contract.
 *
 * Run: npm run gen:codebook
 *
 * Both outputs come from src/data/items.ts and src/data/columns.ts, so a
 * reverse-coding flag physically cannot differ between the instrument, the
 * codebook and the R analysis. Do not hand-edit either output.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BLOCK_ITEMS, FACTOR_LABELS, MULTI_ITEM_FACTORS, SCALE_LABELS,
  SECTIONS, SECTION_ORDER, SINGLE_ITEM_FACTORS, itemsInFactor, type Factor,
} from '../src/data/items';
import { COLUMNS, BLOCK_PREFIXES } from '../src/data/columns';
import { ARM_TARGETS, ARMS, DECLINE_COPY } from '../src/data/conditions';
import { ASSIGNMENT_SEQUENCE, CELL_LABELS, SEQUENCE_SEED, DESIGN_N } from '../src/data/sequence';
import { CUT_TIER } from '../src/data/config';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const esc = (s: string) => s.replace(/\|/g, '\\|');

// ── codebook.md ────────────────────────────────────────────────────────────

const reverseItems = BLOCK_ITEMS.filter((i) => i.reverse);

const cellCounts = CELL_LABELS.map(
  (_, idx) =>
    ASSIGNMENT_SEQUENCE.slice(0, DESIGN_N).filter((s) => {
      const label = `${s.order}/${s.pairing}`;
      return label === CELL_LABELS[idx];
    }).length,
);

const perArmCell = ARMS.map((arm) => ({
  arm,
  counts: CELL_LABELS.map(
    (label, idx) =>
      ASSIGNMENT_SEQUENCE.slice(0, DESIGN_N).filter(
        (s) => s.arm === arm && `${s.order}/${s.pairing}` === CELL_LABELS[idx],
      ).length,
  ),
}));

const groups = [...new Set(COLUMNS.map((c) => c.group))];

const md = `# Codebook — Confirmshaming Storefront Study

> **GENERATED FILE — do not edit by hand.**
> Source: \`src/data/items.ts\` and \`src/data/columns.ts\`. Regenerate with \`npm run gen:codebook\`.
> Because the CSV, this codebook and \`analysis/generated_scales.R\` are all produced from those two
> files, a reverse-coding flag cannot drift between the instrument and the analysis.

One row per participant. **${COLUMNS.length} columns.** Cut tier in force at generation: **${CUT_TIER}**.

---

## 1. Reverse-coded items — read this first

${reverseItems.length} items per block (${reverseItems.length * 2} columns) must be flipped **\`8 - x\`** before they
join a scale score. \`analysis/generated_scales.R\` does this for you; if you score by hand, these
are the ones that flip:

| Item | Factor | Wording | Why it flips |
| --- | --- | --- | --- |
${reverseItems
  .map((i) => {
    // Semantic differentials carry their meaning in the anchors, not the stem,
    // so showing the stem alone ("This pop-up was…") would tell an analyst
    // nothing about which direction the item runs.
    const wording =
      i.scale === 'semantic_diff'
        ? `${esc(i.text)} **${esc(i.anchorLow)} (1) — ${esc(i.anchorHigh)} (7)**`
        : esc(i.text);
    const why =
      i.scale === 'semantic_diff'
        ? `The high anchor ("${esc(i.anchorHigh)}") means *less* ${FACTOR_LABELS[i.factor].toLowerCase()}, opposite to the rest of the scale.`
        : i.factor === 'imi'
          ? 'Worded so that agreement means *less* perceived manipulative intent.'
          : 'Worded so that agreement means a *more favourable* attribution.';
    return `| \`${i.id}\` | ${FACTOR_LABELS[i.factor]} | ${wording} | ${why} |`;
  })
  .join('\n')}

Column names are these ids prefixed \`neutral_\` and \`exp_\`, e.g. \`neutral_imi_1\`, \`exp_imi_1\`.

> **\`imi_6\` is reverse-coded here although PRD §5.3(c) does not mark it.** It is the semantic
> differential "unfair / fair" with *Fair* at the high anchor, which runs opposite to the rest of
> the IMI scale (where high = more manipulative intent). Left unreversed it deflates Cronbach's
> alpha and biases the scale mean. If you disagree, change \`reverse\` in \`src/data/items.ts\` and
> regenerate — do not patch the R script, or the two will disagree.

## 2. Scale polarity

Every rated item is 7-point. **The negative pole is always 1.** This holds for the semantic
differentials too (bad = 1, good = 7; unfavourable = 1; unfair = 1), which is why no differential
in this instrument needs reverse-coding on account of its anchors.

${Object.entries(SCALE_LABELS)
  .map(([k, v]) => `- \`${k}\` — ${v}`)
  .join('\n')}

## 3. Scales

Multi-item scales get a mean score and a Cronbach's alpha. Single-item outcomes are reported raw
and must never be averaged together.

| Scale | Items | Reverse | Direction of high scores |
| --- | --- | --- | --- |
${MULTI_ITEM_FACTORS.map((f: Factor) => {
  const items = itemsInFactor(f);
  const rev = items.filter((i) => i.reverse).map((i) => i.id);
  const direction: Record<string, string> = {
    guilt: 'More felt guilt',
    anger: 'More felt anger/irritation — **the theorised mediator** (Coulter & Pinto 1995)',
    happy: 'More positive affect',
    att_popup: 'More favourable attitude to the pop-up',
    att_brand: 'More favourable attitude to the brand',
    trust: 'More brand trust',
    imi: 'MORE perceived manipulative intent',
    cred: 'More credible offer',
    attrib: 'MORE negative/manipulative attribution',
  };
  return `| ${FACTOR_LABELS[f]} (\`${f}\`) | ${items.length} — ${items
    .map((i) => `\`${i.id}\``)
    .join(', ')} | ${rev.length ? rev.map((r) => `\`${r}\``).join(', ') : '—'} | ${direction[f] ?? ''} |`;
}).join('\n')}

Single-item outcomes:

${SINGLE_ITEM_FACTORS.map((f) => {
  const item = itemsInFactor(f)[0]!;
  return `- \`${item.id}\` — ${FACTOR_LABELS[f]}. ${esc(item.text)}${
    item.note ? ` *${esc(item.note)}*` : ''
  }`;
}).join('\n')}

Not scored: \`distractor_1\` (Surprised) and \`distractor_2\` (Bored) exist to stop guilt becoming
salient in the emotion grid. Do not build a scale from them.

## 4. Questionnaire order (forced, no back navigation)

Measurement order is an experimental-validity constraint, not a layout choice. Campbell (1995) and
Cotte et al. (2005) both measured felt emotions and attitudes **before** any item about the
advertiser's intent, to avoid manufacturing the mediator–outcome correlation the study is trying to
detect.

${SECTION_ORDER.map((s, i) => `${i + 1}. **${s}** — ${SECTIONS[s].stem}${SECTIONS[s].randomise ? ' *(item order randomised within the screen)*' : ''}`).join('\n')}

Then, once for the whole session: recognition → open-ended → covariates → demographics.

Randomised sections shuffle item order per participant; the order actually used is recorded in the
\`event_log_json\` column, so presentation order is auditable after the fact.

## 5. Conditions

| Condition | Decline-button wording |
| --- | --- |
${Object.entries(DECLINE_COPY).map(([k, v]) => `| \`${k}\` | "${v}" |`).join('\n')}

**This wording is the only difference between conditions.** Headline, offer, accept label, close
"X", tap-target size, contrast, animation and timing are identical, enforced by
\`src/screens/Popup.identical.test.tsx\`.

## 6. Assignment sequence

Pre-generated, seeded (\`${SEQUENCE_SEED}\`), served one slot at a time by the Apps Script
\`assign\` endpoint under a script lock. ${ASSIGNMENT_SEQUENCE.length} slots: the first ${DESIGN_N}
are the design, the remaining ${ASSIGNMENT_SEQUENCE.length - DESIGN_N} are insurance against
participants who consent and then drop (which permanently burns a slot).

Arms over slots 0–${DESIGN_N - 1}: ${ARMS.map((a) => `**${a}** ${ARM_TARGETS[a]}`).join(', ')}.

**Marginal counterbalance cells: ${cellCounts.join(' / ')}** — exactly balanced.

| Arm | ${CELL_LABELS.map((c) => c.replace('/', ' · ')).join(' | ')} | n |
| --- | ${CELL_LABELS.map(() => '---').join(' | ')} | --- |
${perArmCell.map((r) => `| ${r.arm} | ${r.counts.join(' | ')} | ${r.counts.reduce((a, b) => a + b, 0)} |`).join('\n')}

> **Documented imbalance.** 13 is not divisible by 4, so per-arm cells cannot all be equal. The
> extra participants are placed so the *marginal* cell counts come out exactly equal, which is the
> best achievable allocation. Report the per-arm cell counts above as a design fact; they are not
> an accident of randomisation.

## 7. Response-type coding (derived, never asked)

Recomputed in R from \`choice\`, \`latency_ms\` and recognition, so the threshold can be re-tuned:

| Behaviour | Code | Interpretation |
| --- | --- | --- |
| Accepts the offer | \`comply\` | Short-term effectiveness |
| Taps the loaded decline button | \`resist\` | Deliberate confrontation; reactance |
| Closes via "X" / backdrop, or times out | \`avoid\` | Shame avoidance rather than offer rejection |
| Dismissal < 1500 ms **and** fails recognition | \`ignore\` | Tactic passed unnoticed |

## 8. Exclusion rules

Apply before analysis:

1. \`is_debug == TRUE\` — pilot and debug runs. Always exclude.
2. \`status != "complete"\` — dropouts. Keep them to report the abandonment rate, exclude from
   outcome models.
3. \`*_popup_render_gap_ms > 2000\` — PRD §11: a pop-up that took over 2 s to paint makes that
   block's latency uninterpretable.
4. \`resumed_after_reload == TRUE\` **with null timing** — the participant reloaded mid-measurement.
   Self-report is still usable; the behavioural columns for that block are null by design.
5. \`assignment_source == "fallback"\` — not part of the balanced design. Report the count as a
   limitation rather than dropping silently.

## 9. Deviations from the PRD

Each is deliberate; each is here so the write-up can state it rather than discover it.

| PRD says | Implemented as | Why |
| --- | --- | --- |
| \`mode: 'no-cors'\` POST | CORS-simple \`text/plain\` POST | An opaque response resolves successfully even on a 500, making the PRD's own retry-and-rescue logic unreachable. |
| \`*_abandoned\` per block | Session-level \`abandoned\` + \`abandoned_at_step\` | A participant abandons a session, not a pop-up. Made observable at all by checkpoint rows. |
| \`cancelled_taps\` includes \`pointercancel\` | Split into \`cancelled_taps\` and \`pointer_cancels\` | On Android \`pointercancel\` fires on every scroll; merged, the column would mostly measure scrolling. |
| Continuation "6 s or until action" | Live from 0 s, auto-advance at 8 s, censoring flagged | The PRD wording is ambiguous between a floor and a ceiling, which give different dwell distributions. |
| \`abandon\` response code, no threshold | \`timeout\` at 45 s | Without a timeout a frozen participant loses the entire row. |
| IMI item 6 unmarked | \`reverse: true\` | "Fair" at the high anchor runs opposite to the scale. |
| ~6 minutes | Consent states 8–10 minutes | 72 rated items plus storefront and end matter does not fit in 6 minutes on a phone. |
| Emotions 11 items | 12 (4 guilt + 3 anger + 3 happy + 2 distractor) | PRD §8's own column spec lists 12; the "11" in §5.3 does not match it. |

## 10. All columns

${groups
  .map((group) => {
    const cols = COLUMNS.filter((c) => c.group === group);
    return `### ${group}

| Column | Type | Scale / values | Rev | Description |
| --- | --- | --- | --- | --- |
${cols
  .map(
    (c) =>
      `| \`${c.name}\` | ${c.type} | ${esc(
        c.scale ?? (c.values ? c.values.map((v) => `\`${v}\``).join(', ') : '—'),
      )} | ${c.reverse ? '**R**' : ''} | ${esc(c.description)}${c.note ? ` *${esc(c.note)}*` : ''} |`,
  )
  .join('\n')}`;
  })
  .join('\n\n')}
`;

writeFileSync(resolve(ROOT, 'codebook.md'), md);

// ── analysis/generated_scales.R ────────────────────────────────────────────

const scaleList = MULTI_ITEM_FACTORS.map(
  (f) => `  ${f} = c(${itemsInFactor(f).map((i) => `"${i.id}"`).join(', ')})`,
).join(',\n');

const r = `# GENERATED FILE — do not edit by hand.
# Source: src/data/items.ts via scripts/gen-codebook.ts. Regenerate: npm run gen:codebook
#
# Sourced by analysis_starter.R. Keeping these definitions generated is what
# guarantees the reverse-coding used in analysis matches the instrument that
# was actually administered.

BLOCK_PREFIXES <- c(${BLOCK_PREFIXES.map((p) => `"${p}"`).join(', ')})

# Item suffixes that must be flipped (8 - x) before scale scoring.
REVERSE_ITEMS <- c(${reverseItems.map((i) => `"${i.id}"`).join(', ')})

# Multi-item scales: mean score + Cronbach's alpha.
SCALES <- list(
${scaleList}
)

# Single-item outcomes: reported raw, never averaged together.
SINGLE_ITEMS <- c(${SINGLE_ITEM_FACTORS.map((f) => `"${itemsInFactor(f)[0]!.id}"`).join(', ')})

# Higher scores on these scales are WORSE for the brand. Used only for
# labelling output, never for scoring.
NEGATIVE_SCALES <- c("imi", "attrib", "anger", "guilt")

SCALE_LABELS <- c(
${MULTI_ITEM_FACTORS.map((f) => `  ${f} = "${FACTOR_LABELS[f]}"`).join(',\n')},
${SINGLE_ITEM_FACTORS.map((f) => `  ${itemsInFactor(f)[0]!.id} = "${FACTOR_LABELS[f]}"`).join(',\n')}
)

ARMS <- c(${ARMS.map((a) => `"${a}"`).join(', ')})
ARM_TARGETS <- c(${ARMS.map((a) => `${a} = ${ARM_TARGETS[a]}`).join(', ')})

# PRD §11: a pop-up that took longer than this to paint makes that block's
# latency uninterpretable.
RENDER_GAP_EXCLUSION_MS <- 2000
# PRD §5.2: fast dismissal threshold for the provisional "Ignore" code.
IGNORE_LATENCY_MS <- 1500
`;

mkdirSync(resolve(ROOT, 'analysis'), { recursive: true });
writeFileSync(resolve(ROOT, 'analysis/generated_scales.R'), r);

console.log(`Wrote codebook.md — ${COLUMNS.length} columns, ${reverseItems.length * 2} reverse-coded`);
console.log(`Wrote analysis/generated_scales.R — ${MULTI_ITEM_FACTORS.length} scales`);
