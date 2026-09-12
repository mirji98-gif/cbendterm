# ═══════════════════════════════════════════════════════════════════════════
#  Confirmshaming Storefront Study — analysis starter (Instrument v2)
#
#  Reads the exported CSV, verifies the app's own recoding, computes
#  within-person (experimental − neutral) difference scores for the four
#  rated items and the downstream choice, reports awareness and comparative
#  results, and compares the three arms with effect sizes.
#
#  BASE R ONLY. No packages to install, nothing to configure beyond the path
#  below. Run:   Rscript analysis_starter.R  [path/to/export.csv]
#
#  Instrument v2 (Instrument_v2.md) replaced the v1 multi-item battery with
#  five single-item measures per pop-up. There is therefore no Cronbach's
#  alpha section here — there is no multi-item scale left to compute it over.
#  See codebook.md §1 for what was kept and what was traded away.
#
#  Column definitions come from analysis/generated_scales.R, which is
#  generated from the item bank the app actually administered. Do not
#  hand-edit that file — change src/data/items.ts and run `npm run gen`.
# ═══════════════════════════════════════════════════════════════════════════

args <- commandArgs(trailingOnly = TRUE)
CSV_PATH <- if (length(args) >= 1) args[1] else "analysis/synthetic_sample.csv"

source("analysis/generated_scales.R")

cat("\n══ Confirmshaming Storefront Study — Instrument v2 ══\n")
cat("Reading:", CSV_PATH, "\n")
if (!file.exists(CSV_PATH)) stop("CSV not found. Pass the path as an argument.")

raw <- read.csv(CSV_PATH, stringsAsFactors = FALSE, check.names = FALSE,
                na.strings = c("", "NA"))
cat("Rows in file:", nrow(raw), "\n\n")

is_true <- function(x) !is.na(x) & toupper(as.character(x)) == "TRUE"
num <- function(x) suppressWarnings(as.numeric(x))

# ─────────────────────────────────────────────────────────────────────────────
# 0. Integrity assertions (change_spec_v4_2 Part 4)
# ─────────────────────────────────────────────────────────────────────────────
# These stop the script rather than let it produce output from a contaminated
# dataset. Both check invariants the app is supposed to guarantee: if either
# fails, something wrote rows under a different design than the one you think
# you ran, and every number below would be quietly wrong.
cat("── Integrity assertions ────────────────────────────────\n")

expected_pairing <- "locked_aurevella_neutral"
pairings <- unique(raw$pairing[!is.na(raw$pairing) & raw$pairing != ""])
if (length(pairings) != 1 || pairings[1] != expected_pairing) {
  stop(sprintf(paste0(
    "CONTAMINATED DATASET: `pairing` is not constant.\n",
    "  found: %s\n",
    "  expected every row to be '%s'.\n",
    "  Brand pairing was locked in v4.2; more than one value means rows from\n",
    "  different builds have been mixed into one sheet. Split them by\n",
    "  app_version before analysing."),
    paste(pairings, collapse = ", "), expected_pairing))
}
cat(sprintf("  pairing constant across all rows: '%s'\n", pairings[1]))

# decline_text_experimental must correspond to arm, on every row. This is the
# check that would have caught a wording bug shipping to real participants.
DECLINE_FOR_ARM <- c(
  mild     = "No thanks, I’ll pay full price",
  strong   = "No thanks, I don’t need to save money",
  autonomy = "Not now — I’ll decide later"
)
has_arm <- !is.na(raw$arm) & raw$arm != ""
expected_text <- unname(DECLINE_FOR_ARM[raw$arm[has_arm]])
actual_text <- raw$decline_text_experimental[has_arm]
bad <- which(is.na(expected_text) | actual_text != expected_text)
if (length(bad) > 0) {
  cat("\n  Mismatched rows (participant_id | arm | decline_text_experimental):\n")
  for (i in utils::head(bad, 10)) {
    cat(sprintf("    %s | %s | %s\n", raw$participant_id[has_arm][i],
                raw$arm[has_arm][i], actual_text[i]))
  }
  stop(sprintf(paste0(
    "CONTAMINATED DATASET: decline_text_experimental does not match `arm` on %d row(s).\n",
    "  The wording a participant saw is the manipulation. If it disagrees with\n",
    "  the arm they were assigned, that row cannot be attributed to a condition."),
    length(bad)))
}
cat(sprintf("  decline_text_experimental matches arm on all %d assigned rows\n", sum(has_arm)))

neutral_texts <- unique(raw$decline_text_neutral[has_arm])
if (length(neutral_texts) != 1 || neutral_texts[1] != "No thanks") {
  stop(sprintf("CONTAMINATED DATASET: decline_text_neutral is not constant 'No thanks' (found: %s)",
               paste(neutral_texts, collapse = ", ")))
}
cat("  decline_text_neutral is 'No thanks' on every row\n\n")

# ─────────────────────────────────────────────────────────────────────────────
# 1. Exclusions (see codebook §10). Each is reported, never silent.
# ─────────────────────────────────────────────────────────────────────────────
cat("── Exclusions ──────────────────────────────────────────\n")

n0 <- nrow(raw)
d <- raw[!is_true(raw$is_debug), ]
cat(sprintf("  debug rows removed:            %d\n", n0 - nrow(d)))

n_partial <- sum(d$status != "complete", na.rm = TRUE)
cat(sprintf("  incomplete (abandoned):       %d  (%.1f%% attrition)\n",
            n_partial, 100 * n_partial / nrow(d)))
if (n_partial > 0) {
  cat("    stalled at: ",
      paste(names(table(d$abandoned_at_step[d$status != "complete"])),
            table(d$abandoned_at_step[d$status != "complete"]),
            sep = "=", collapse = ", "), "\n")
}
d <- d[d$status == "complete", ]

n_random <- sum(d$assignment_source == "random", na.rm = TRUE)
if (n_random > 0) {
  cat(sprintf("  ⚠ random-fallback assignments kept: %d — code was missing or mistyped.\n", n_random))
  cat("    Report this count as a limitation; it is outside the intended 15/15/15 allocation.\n")
}

# Render-gap exclusion is applied PER POP-UP, not per block or participant
# (change_spec_v4_final.md Part 2: two pop-ups per brand now): a slow paint on
# one pop-up does not invalidate the other pop-up's, let alone the other
# block's, self-report.
for (p in BLOCK_PREFIXES) {
  for (pop in POPUP_PREFIXES) {
    col <- paste0(p, "_", pop)
    gap <- num(d[[paste0(col, "_popup_render_gap_ms")]])
    bad <- !is.na(gap) & gap > RENDER_GAP_EXCLUSION_MS
    if (any(bad)) {
      cat(sprintf("  %s latency voided (>%dms paint): %d\n",
                  col, RENDER_GAP_EXCLUSION_MS, sum(bad)))
      d[[paste0(col, "_latency_ms")]][bad] <- NA
    }
  }
}

n_reload <- sum(is_true(d$resumed_after_reload))
if (n_reload > 0) {
  cat(sprintf("  reloaded mid-session:         %d (timing null by design, self-report kept)\n", n_reload))
}

cat(sprintf("\n  ANALYSIS SAMPLE: n = %d\n\n", nrow(d)))

cat("── Cell counts ─────────────────────────────────────────\n")
print(table(d$arm))
cat("\nArm x order:\n"); print(table(d$arm, d$order))

# change_spec_v4_2 Part 4: NO BRAND-AS-FACTOR ANALYSIS.
# Brand pairing is locked — Aurevella carried every neutral pop-up and Maison
# Veloure every experimental one — so brand and condition are the same
# variable wearing two names. Crossing them would produce a table with two
# structurally empty cells and invite reading a "brand effect" that is just
# the treatment effect relabelled. The v4.1 "Arm x brand pairing" table was
# removed for exactly this reason; it is not an oversight.
cat("\nBrand pairing: locked (Aurevella neutral / Maison Veloure experimental).\n")
cat("  Brand is confounded with condition by design and cannot be modelled\n")
cat("  separately. Report this as a limitation — see README.md.\n")
shortfall <- ARM_TARGETS - table(factor(d$arm, levels = ARMS))
if (any(shortfall > 0)) {
  cat("\n  Still needed: ",
      paste(names(shortfall)[shortfall > 0], shortfall[shortfall > 0],
            sep = "=", collapse = ", "), "\n")
}
cat("\n  NOTE: ARM_TARGETS above is the value generated from src/data/conditions.ts,\n")
cat("  which this codebase still states as 13/13/14 (N=40) — change_spec_v4_final.md's\n")
cat("  own stated goal is a 15/15/15 split (N=45), but it did not ask for that constant to\n")
cat("  be changed anywhere, so it was left as-is. Update ARM_TARGETS in conditions.ts (and\n")
cat("  re-run npm run gen) if 15/15/15 should be the reported target.\n\n")

# change_spec_v4_final.md Part 1 drops the recruiter dimension entirely (three
# links, one per arm) — there is no recruiter_id column any more to balance,
# so the arm x recruiter table from the v3 script is gone.
cat("\n")

# ─────────────────────────────────────────────────────────────────────────────
# 2. Recoding verification
# ─────────────────────────────────────────────────────────────────────────────
# The app computes diff_bN and the comparative recoded columns at the moment
# of submission, when it has the true assignment on hand — see
# src/net/serialize.ts. This section RECOMPUTES the same values from the raw
# columns and flags any mismatch, so a future bug in that file cannot pass
# unnoticed. It does not overwrite anything; it only reports.
cat("── Recoding verification (app's stored values vs recomputed) ──\n")

verify_mismatch <- function(label, stored, recomputed) {
  ok <- is.na(stored) & is.na(recomputed) | (!is.na(stored) & !is.na(recomputed) & stored == recomputed)
  n_bad <- sum(!ok, na.rm = TRUE)
  if (n_bad > 0) {
    cat(sprintf("  ⚠ %s: %d row(s) disagree with the recomputed value — check serialize.ts\n", label, n_bad))
  } else {
    cat(sprintf("  %s: OK (%d rows checked)\n", label, sum(!is.na(stored) | !is.na(recomputed))))
  }
  n_bad
}

# diff_bN = exp − neutral, for each rated item.
mismatches <- 0
for (item in RATED_ITEMS) {
  stored <- num(d[[paste0("diff_", item)]])
  recomputed <- num(d[[paste0("exp_", item)]]) - num(d[[paste0("neutral_", item)]])
  mismatches <- mismatches + verify_mismatch(paste0("diff_", item), stored, recomputed)
}

# c3_recoded / c5_recoded: reverse (8 - raw) iff order == 'neutral_first'
# (experimental brand is Brand 2 in that case).
exp_is_brand2 <- d$order == "neutral_first"
for (col in c("c3", "c5")) {
  raw_col <- num(d[[paste0(col, "_raw")]])
  recomputed <- ifelse(exp_is_brand2, 8 - raw_col, raw_col)
  stored <- num(d[[paste0(col, "_recoded")]])
  mismatches <- mismatches + verify_mismatch(paste0(col, "_recoded"), stored, recomputed)
}

# c1/c2/c4 recode raw == brand_experimental. brand_experimental is a display
# NAME ("Aurevella") while c1_raw/c2_raw/c4_raw are brand IDs ("aurevella"),
# so an exact automated check needs the name<->id map that only the app knows
# — not worth hardcoding here and letting it drift. Spot-check a few rows by
# eye instead: c1_exp_more_manipulative should be TRUE exactly when c1_raw
# names the same brand as brand_experimental (case-insensitively).
cat("  c1/c2/c4 recodes are brand-id comparisons — spot-check a few rows by eye:\n")
print(utils::head(d[, c("brand_experimental", "c1_raw", "c1_exp_more_manipulative",
                         "c4_raw", "c4_choose_exp")], 3))

if (mismatches == 0) {
  cat("\n  All numeric recodes verified.\n\n")
} else {
  cat(sprintf("\n  ⚠ %d total mismatches found above — investigate before trusting downstream numbers.\n\n", mismatches))
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. Response-type coding, recomputed (codebook §9)
# ─────────────────────────────────────────────────────────────────────────────
recode_response <- function(choice, latency, aware_correct, threshold = IGNORE_LATENCY_MS) {
  out <- rep(NA_character_, length(choice))
  fast_miss <- !is.na(latency) & latency < threshold & !is.na(aware_correct) & !aware_correct
  out[choice == "accept"] <- "comply"
  out[is.na(out) & fast_miss] <- "ignore"
  out[is.na(out) & choice == "decline_button"] <- "resist"
  out[is.na(out) & choice %in% c("close_x", "backdrop", "timeout")] <- "avoid"
  factor(out, levels = c("comply", "resist", "avoid", "ignore"))
}

for (p in BLOCK_PREFIXES) {
  correct_col <- if (p == "neutral") "aware_neutral_correct" else "aware_exp_correct"
  for (pop in POPUP_PREFIXES) {
    col <- paste0(p, "_", pop)
    d[[paste0(col, "_code")]] <- recode_response(
      d[[paste0(col, "_choice")]], num(d[[paste0(col, "_latency_ms")]]), is_true(d[[correct_col]])
    )
  }
}

cat("── Behavioural response by arm, per pop-up ─────────────\n")
for (pop in POPUP_PREFIXES) {
  cat(sprintf("\nNeutral %s (within-person baseline, pooled across arms):\n", pop))
  print(table(d[[paste0("neutral_", pop, "_code")]]))
  cat(sprintf("\nExperimental %s, by arm:\n", pop))
  print(table(d$arm, d[[paste0("exp_", pop, "_code")]]))
}

cat("\nAwareness — correctly identified the experimental wording, by arm:\n")
print(round(tapply(is_true(d$aware_exp_correct), d$arm, mean), 2))

cat("\nAcceptance count per brand (0-2 pop-ups accepted), by arm:\n")
cat("  Neutral pop-ups accepted, mean:\n")
print(round(tapply(num(d$neutral_accepts), d$arm, mean, na.rm = TRUE), 2))
cat("  Experimental pop-ups accepted, mean:\n")
print(round(tapply(num(d$exp_accepts), d$arm, mean, na.rm = TRUE), 2))
cat("  diff_accepts (exp - neutral), mean:\n")
print(round(tapply(num(d$diff_accepts), d$arm, mean, na.rm = TRUE), 2))
cat("\n")

# ─────────────────────────────────────────────────────────────────────────────
# 3b. Acceptance with POSITION as a covariate (change_spec_v4_2 Part 4)
# ─────────────────────────────────────────────────────────────────────────────
# With four pop-ups per session, acceptance almost certainly declines across
# the session through simple fatigue. Position is what separates that decline
# from the condition effect: without it, an experimental pop-up that happened
# to fall late looks like a wording effect. Reshape to one row per POP-UP so
# position can enter the model at all.
cat("── Acceptance by position (fatigue) and condition ──────\n")
popup_rows <- do.call(rbind, lapply(BLOCK_PREFIXES, function(p) {
  do.call(rbind, lapply(POPUP_PREFIXES, function(pop) {
    col <- paste0(p, "_", pop)
    data.frame(
      participant_id = d$participant_id,
      arm            = d$arm,
      condition      = ifelse(p == "neutral", "neutral", "experimental"),
      ask            = d[[paste0(col, "_ask")]],
      position       = num(d[[paste0(col, "_position")]]),
      accepted       = as.integer(d[[paste0(col, "_choice")]] == "accept"),
      stringsAsFactors = FALSE
    )
  }))
}))
popup_rows <- popup_rows[!is.na(popup_rows$accepted) & !is.na(popup_rows$position), ]

cat("\nAcceptance rate by position in the session (1-4):\n")
print(round(tapply(popup_rows$accepted, popup_rows$position, mean), 3))
cat("\nAcceptance rate by condition x position:\n")
print(round(tapply(popup_rows$accepted, list(popup_rows$condition, popup_rows$position), mean), 3))
cat("\nAcceptance rate by ask type (email at checkout vs follow after purchase):\n")
print(round(tapply(popup_rows$accepted, popup_rows$ask, mean), 3))

# Logistic model: does condition still predict acceptance once position is
# controlled? position enters as a linear term — with only four levels there
# is not enough data to justify treating it as a factor.
fit <- tryCatch(
  glm(accepted ~ condition + position + factor(arm), data = popup_rows, family = binomial()),
  error = function(e) NULL
)
if (!is.null(fit)) {
  cat("\nglm(accepted ~ condition + position + arm, binomial):\n")
  co <- summary(fit)$coefficients
  for (r in rownames(co)) {
    cat(sprintf("   %-28s b=%7.3f  OR=%6.3f  p=%.3f\n", r, co[r, 1], exp(co[r, 1]), co[r, 4]))
  }
  cat("   Read `position` as the per-step fatigue slope: OR < 1 means each\n")
  cat("   successive pop-up was less likely to be accepted regardless of arm.\n")
}
cat("\n")

# ─────────────────────────────────────────────────────────────────────────────
# 4. Within-person difference scores (experimental − neutral)
# ─────────────────────────────────────────────────────────────────────────────
# THE PRIMARY OUTCOME. Differencing within participant removes every stable
# individual difference — baseline grumpiness, scale-use style, how much they
# like fragrance — which is worth a great deal at a sample this size.
for (item in RATED_ITEMS) d[[paste0("d_", item)]] <- num(d[[paste0("diff_", item)]])
d$d_b5 <- num(d$diff_b5)
d$d_accepts <- num(d$diff_accepts)

OUTCOMES <- c(RATED_ITEMS, "b5", "accepts")
OUTCOME_LABELS <- c(RATED_ITEM_LABELS,
                     b5 = "Downstream choice (ordinal: buy=3..avoid=0)",
                     accepts = "Pop-ups accepted per brand (0-2, change_spec_v4_final.md)")

# ─────────────────────────────────────────────────────────────────────────────
# 5. Effect sizes
# ─────────────────────────────────────────────────────────────────────────────
# Hedges' g: Cohen's d with the small-sample correction. At n≈13 per arm the
# correction is not cosmetic — it shrinks d by roughly 4-6%.
hedges_g <- function(x, y) {
  x <- x[!is.na(x)]; y <- y[!is.na(y)]
  nx <- length(x); ny <- length(y)
  if (nx < 2 || ny < 2) return(c(g = NA, lo = NA, hi = NA))
  s_pooled <- sqrt(((nx - 1) * var(x) + (ny - 1) * var(y)) / (nx + ny - 2))
  if (!is.finite(s_pooled) || s_pooled == 0) return(c(g = NA, lo = NA, hi = NA))
  df <- nx + ny - 2
  d_val <- (mean(x) - mean(y)) / s_pooled
  J <- 1 - 3 / (4 * df - 1)
  g <- d_val * J
  se <- sqrt((nx + ny) / (nx * ny) + d_val^2 / (2 * (nx + ny)))
  c(g = g, lo = g - 1.96 * se * J, hi = g + 1.96 * se * J)
}

# Cohen's dz for the paired within-person contrast: SD of the DIFFERENCES,
# not of the raw scores. Using the raw-score SD here is the single most common
# effect-size error in paired designs.
cohen_dz <- function(diffs) {
  diffs <- diffs[!is.na(diffs)]
  if (length(diffs) < 2 || sd(diffs) == 0) return(NA_real_)
  mean(diffs) / sd(diffs)
}

# ─────────────────────────────────────────────────────────────────────────────
# 6. Within-person effect of the experimental pop-up, per arm
# ─────────────────────────────────────────────────────────────────────────────
cat("── Within-person: experimental − neutral, by arm ───────\n")
cat("   (paired t-test; dz uses the SD of the differences)\n\n")
cat(sprintf("%-46s %-10s %7s %7s %7s %9s\n",
            "Outcome", "Arm", "M diff", "SD", "dz", "p"))

within_rows <- list()
for (o in OUTCOMES) {
  col <- paste0("d_", o)
  if (!col %in% names(d)) next
  printed_label <- FALSE
  for (arm in ARMS) {
    v <- d[[col]][d$arm == arm]
    v <- v[!is.na(v)]
    if (length(v) < 3) next
    tt <- tryCatch(t.test(v), error = function(e) NULL)
    dz <- cohen_dz(v)
    cat(sprintf("%-46s %-10s %7.2f %7.2f %7.2f %9.3f\n",
                if (printed_label) "" else OUTCOME_LABELS[[o]], arm,
                mean(v), sd(v), dz, if (is.null(tt)) NA else tt$p.value))
    printed_label <- TRUE
    within_rows[[length(within_rows) + 1]] <-
      data.frame(outcome = o, arm = arm, n = length(v), mean_diff = mean(v),
                 sd = sd(v), dz = dz, p = if (is.null(tt)) NA else tt$p.value)
  }
  cat("\n")
}
within_df <- do.call(rbind, within_rows)

# ─────────────────────────────────────────────────────────────────────────────
# 7. Between-arm comparison on the difference scores
# ─────────────────────────────────────────────────────────────────────────────
cat("── Between arms, on the difference scores ──────────────\n")
cat("   Primary evidence at this sample size is DIRECTION and EFFECT SIZE.\n")
cat("   p-values are support, not the headline (PRD §11).\n\n")

between_rows <- list()
for (o in OUTCOMES) {
  col <- paste0("d_", o)
  if (!col %in% names(d)) next
  sub <- d[!is.na(d[[col]]), ]
  if (nrow(sub) < 6 || length(unique(sub$arm)) < 2) next

  cat(sprintf("%s\n", OUTCOME_LABELS[[o]]))
  means <- tapply(sub[[col]], sub$arm, mean)
  sds <- tapply(sub[[col]], sub$arm, sd)
  ns <- tapply(sub[[col]], sub$arm, length)
  for (arm in ARMS) {
    if (is.na(means[arm])) next
    cat(sprintf("   %-10s n=%-3d M=%6.2f  SD=%5.2f\n", arm, ns[arm], means[arm], sds[arm]))
  }

  aov_fit <- tryCatch(summary(aov(sub[[col]] ~ factor(sub$arm)))[[1]], error = function(e) NULL)
  if (!is.null(aov_fit)) {
    F_val <- aov_fit[["F value"]][1]; p_val <- aov_fit[["Pr(>F)"]][1]
    df1 <- aov_fit[["Df"]][1]; df2 <- aov_fit[["Df"]][2]
    eta2 <- aov_fit[["Sum Sq"]][1] / sum(aov_fit[["Sum Sq"]])
    cat(sprintf("   one-way ANOVA: F(%d,%d)=%.2f, p=%.3f, eta2=%.3f\n",
                df1, df2, F_val, p_val, eta2))
  }

  # Pairwise Hedges' g with 95% CI. Uncorrected: with three planned contrasts
  # at this sample size, a Bonferroni correction buys nothing but a wider CI you would
  # report anyway. Say so in the write-up.
  pairs <- list(c("strong", "mild"), c("strong", "autonomy"), c("mild", "autonomy"))
  for (pr in pairs) {
    a <- sub[[col]][sub$arm == pr[1]]; b <- sub[[col]][sub$arm == pr[2]]
    g <- hedges_g(a, b)
    tt <- tryCatch(t.test(a, b), error = function(e) NULL)
    cat(sprintf("   %-9s vs %-9s  g=%6.2f  [%5.2f, %5.2f]  p=%.3f\n",
                pr[1], pr[2], g["g"], g["lo"], g["hi"],
                if (is.null(tt)) NA else tt$p.value))
    between_rows[[length(between_rows) + 1]] <-
      data.frame(outcome = o, contrast = paste(pr, collapse = "_vs_"),
                 g = unname(g["g"]), ci_lo = unname(g["lo"]), ci_hi = unname(g["hi"]),
                 p = if (is.null(tt)) NA else tt$p.value)
  }
  cat("\n")
}
between_df <- do.call(rbind, between_rows)

# ─────────────────────────────────────────────────────────────────────────────
# 8. Downstream choice: raw cross-tab (colour, not headline)
# ─────────────────────────────────────────────────────────────────────────────
cat("── Downstream choice (B5), raw — colour, not headline ──\n")
cat("   (cells of 2-3 people at n=13/arm; report diff_b5 above as the number.)\n\n")
cat("Neutral pop-up:\n"); print(table(d$neutral_b5_raw))
cat("\nExperimental pop-up, by arm:\n"); print(table(d$arm, d$exp_b5_raw))
cat("\n")

# ─────────────────────────────────────────────────────────────────────────────
# 9. Comparative block — corroborating evidence, not primary
# ─────────────────────────────────────────────────────────────────────────────
cat("── Comparative block (corroborating evidence only) ─────\n")
cat("   Asking participants to compare the two pop-ups directly makes the\n")
cat("   manipulation salient and may invite a constructed difference. If this\n")
cat("   section contradicts the within-person results above, BELIEVE THE\n")
cat("   BEHAVIOURAL DATA, not this section.\n\n")

cat("C1 — brand felt more manipulative (recoded: experimental brand?), by arm:\n")
print(round(tapply(is_true(d$c1_exp_more_manipulative), d$arm, mean, na.rm = TRUE), 2))
cat("\nC2 — trust the experimental brand more, by arm:\n")
print(round(tapply(is_true(d$c2_trust_exp_more), d$arm, mean, na.rm = TRUE), 2))
cat("\nC3 — trust in experimental brand relative to neutral (1-7, recoded), by arm:\n")
print(round(tapply(num(d$c3_recoded), d$arm, mean, na.rm = TRUE), 2))
cat("\nC4 — chose the experimental brand for next purchase, by arm:\n")
print(round(tapply(is_true(d$c4_choose_exp), d$arm, mean, na.rm = TRUE), 2))
cat("\nC5 — overall experience with experimental brand relative to neutral, by arm:\n")
print(round(tapply(num(d$c5_recoded), d$arm, mean, na.rm = TRUE), 2))
cat("\n")

# ─────────────────────────────────────────────────────────────────────────────
# 10. The mediation claim, descriptively
# ─────────────────────────────────────────────────────────────────────────────
# Coulter & Pinto (1995): irritation/anger, not felt guilt, mediates the
# damage. At this sample size a formal mediation model is not credible, so this reports
# the correlations the argument rests on and lets the write-up be honest.
cat("── Irritation as the mediator (descriptive only) ───────\n")
if (all(c("d_b2_irritation", "d_b4_trust") %in% names(d))) {
  paths <- list(
    "irritation diff ~ trust diff"       = c("d_b2_irritation", "d_b4_trust"),
    "irritation diff ~ manipulation diff" = c("d_b2_irritation", "d_b3_manipulation"),
    "guilt diff      ~ trust diff"       = c("d_b1_guilt", "d_b4_trust"),
    "manipulation diff ~ trust diff"     = c("d_b3_manipulation", "d_b4_trust")
  )
  for (nm in names(paths)) {
    v <- paths[[nm]]
    if (!all(v %in% names(d))) next
    ok <- stats::complete.cases(d[, v])
    if (sum(ok) < 4) next
    r <- cor(d[[v[1]]][ok], d[[v[2]]][ok])
    cat(sprintf("   %-38s r = %6.2f  (n=%d)\n", nm, r, sum(ok)))
  }
  cat("\n   This sample size does not support a formal mediation model. Report these as\n")
  cat("   correlations consistent (or not) with Coulter & Pinto, not as a test.\n\n")
}

# ─────────────────────────────────────────────────────────────────────────────
# 11. Save
# ─────────────────────────────────────────────────────────────────────────────
dir.create("analysis/output", showWarnings = FALSE, recursive = TRUE)
write.csv(d, "analysis/output/scored.csv", row.names = FALSE)
if (!is.null(within_df))  write.csv(within_df,  "analysis/output/within_person.csv", row.names = FALSE)
if (!is.null(between_df)) write.csv(between_df, "analysis/output/between_arms.csv", row.names = FALSE)

cat("── Written ─────────────────────────────────────────────\n")
cat("  analysis/output/scored.csv        one row per participant, plus difference columns\n")
cat("  analysis/output/within_person.csv  experimental − neutral, per arm\n")
cat("  analysis/output/between_arms.csv   pairwise Hedges' g with CIs\n\n")
