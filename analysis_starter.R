# ═══════════════════════════════════════════════════════════════════════════
#  Confirmshaming Storefront Study — analysis starter
#
#  Reads the exported CSV, reverse-codes, builds scale scores with Cronbach's
#  alpha, computes within-person (experimental − neutral) difference scores,
#  and compares the three arms with effect sizes.
#
#  BASE R ONLY. No packages to install, nothing to configure beyond the path
#  below. Run:   Rscript analysis_starter.R  [path/to/export.csv]
#
#  Scale definitions and reverse-coding come from analysis/generated_scales.R,
#  which is generated from the item bank the app actually administered. Do not
#  hand-edit that file — change src/data/items.ts and run `npm run gen`.
# ═══════════════════════════════════════════════════════════════════════════

args <- commandArgs(trailingOnly = TRUE)
CSV_PATH <- if (length(args) >= 1) args[1] else "analysis/synthetic_sample.csv"

source("analysis/generated_scales.R")

cat("\n══ Confirmshaming Storefront Study ══\n")
cat("Reading:", CSV_PATH, "\n")
if (!file.exists(CSV_PATH)) stop("CSV not found. Pass the path as an argument.")

raw <- read.csv(CSV_PATH, stringsAsFactors = FALSE, check.names = FALSE,
                na.strings = c("", "NA"))
cat("Rows in file:", nrow(raw), "\n\n")

# ─────────────────────────────────────────────────────────────────────────────
# 1. Exclusions (see codebook §8). Each is reported, never silent.
# ─────────────────────────────────────────────────────────────────────────────
cat("── Exclusions ──────────────────────────────────────────\n")

is_true <- function(x) !is.na(x) & toupper(as.character(x)) == "TRUE"

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

n_fallback <- sum(d$assignment_source == "fallback", na.rm = TRUE)
if (n_fallback > 0) {
  cat(sprintf("  ⚠ fallback assignments kept:   %d — outside the balanced design.\n", n_fallback))
  cat("    Report this count as a limitation.\n")
}

# Render-gap exclusion is applied PER BLOCK, not per participant: a slow paint
# on one pop-up does not invalidate the other block's self-report.
for (p in BLOCK_PREFIXES) {
  gap <- suppressWarnings(as.numeric(d[[paste0(p, "_popup_render_gap_ms")]]))
  bad <- !is.na(gap) & gap > RENDER_GAP_EXCLUSION_MS
  if (any(bad)) {
    cat(sprintf("  %s block latency voided (>%dms paint): %d\n",
                p, RENDER_GAP_EXCLUSION_MS, sum(bad)))
    d[[paste0(p, "_latency_ms")]][bad] <- NA
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
cat("\nArm x brand pairing:\n"); print(table(d$arm, d$pairing))
shortfall <- ARM_TARGETS - table(factor(d$arm, levels = ARMS))
if (any(shortfall > 0)) {
  cat("\n  Still needed: ",
      paste(names(shortfall)[shortfall > 0], shortfall[shortfall > 0],
            sep = "=", collapse = ", "), "\n")
}
cat("\n")

# ─────────────────────────────────────────────────────────────────────────────
# 2. Reverse-coding
# ─────────────────────────────────────────────────────────────────────────────
# Reverse BEFORE scale scoring. The flags come from the generated file, so they
# match the instrument that was administered — including imi_6, which the PRD
# text leaves unmarked (see codebook §1).
reverse_code <- function(df) {
  n <- 0
  for (p in BLOCK_PREFIXES) {
    for (item in REVERSE_ITEMS) {
      col <- paste0(p, "_", item)
      if (col %in% names(df)) {
        df[[col]] <- 8 - suppressWarnings(as.numeric(df[[col]]))
        n <- n + 1
      }
    }
  }
  cat("── Reverse-coded", n, "columns:",
      paste(REVERSE_ITEMS, collapse = ", "), "(both blocks)\n\n")
  df
}
d <- reverse_code(d)

# ─────────────────────────────────────────────────────────────────────────────
# 3. Scale scores and Cronbach's alpha
# ─────────────────────────────────────────────────────────────────────────────
cronbach_alpha <- function(mat) {
  mat <- mat[stats::complete.cases(mat), , drop = FALSE]
  k <- ncol(mat)
  if (k < 2 || nrow(mat) < 3) return(NA_real_)
  total_var <- stats::var(rowSums(mat))
  if (!is.finite(total_var) || total_var == 0) return(NA_real_)
  item_var <- sum(apply(mat, 2, stats::var))
  (k / (k - 1)) * (1 - item_var / total_var)
}

cat("── Scale reliability (Cronbach's alpha) ────────────────\n")
cat(sprintf("%-28s %8s %8s %6s\n", "Scale", "neutral", "exp", "items"))

alphas <- list()
for (scale in names(SCALES)) {
  items <- SCALES[[scale]]
  row <- c()
  for (p in BLOCK_PREFIXES) {
    cols <- paste0(p, "_", items)
    cols <- cols[cols %in% names(d)]
    mat <- suppressWarnings(sapply(d[cols], as.numeric))
    a <- if (length(cols) >= 2) cronbach_alpha(as.matrix(mat)) else NA_real_
    row[p] <- a
    # Scale score: row mean, tolerating one missing item.
    score <- rowMeans(mat, na.rm = TRUE)
    score[rowSums(!is.na(mat)) < max(2, length(cols) - 1)] <- NA
    d[[paste0(p, "_", scale)]] <- score
  }
  alphas[[scale]] <- row
  flag <- if (!is.na(row["exp"]) && row["exp"] < 0.6) "  ← below .60" else ""
  cat(sprintf("%-28s %8.2f %8.2f %6d%s\n",
              SCALE_LABELS[[scale]], row["neutral"], row["exp"], length(items), flag))
}

# Single-item outcomes are carried through unchanged, never averaged.
for (p in BLOCK_PREFIXES) {
  for (item in SINGLE_ITEMS) {
    col <- paste0(p, "_", item)
    if (col %in% names(d)) d[[col]] <- suppressWarnings(as.numeric(d[[col]]))
  }
}
cat("\nAlphas below .60 at N=40 are common with 3-item scales. Report them\n")
cat("honestly rather than dropping items to chase a threshold.\n\n")

# ─────────────────────────────────────────────────────────────────────────────
# 4. Response-type coding, recomputed (codebook §7)
# ─────────────────────────────────────────────────────────────────────────────
# Recomputed here rather than trusted from the CSV, so the "Ignore" threshold
# can be re-tuned without re-collecting data.
recode_response <- function(choice, latency, recog_correct,
                            threshold = IGNORE_LATENCY_MS) {
  out <- rep(NA_character_, length(choice))
  fast_miss <- !is.na(latency) & latency < threshold & !is.na(recog_correct) & !recog_correct
  out[choice == "accept"] <- "comply"
  out[is.na(out) & fast_miss] <- "ignore"
  out[is.na(out) & choice == "decline_button"] <- "resist"
  out[is.na(out) & choice %in% c("close_x", "backdrop", "timeout")] <- "avoid"
  factor(out, levels = c("comply", "resist", "avoid", "ignore"))
}

for (p in BLOCK_PREFIXES) {
  d[[paste0(p, "_code")]] <- recode_response(
    d[[paste0(p, "_choice")]],
    suppressWarnings(as.numeric(d[[paste0(p, "_latency_ms")]])),
    is_true(d[[paste0("recognition_correct_", p)]])
  )
}

cat("── Behavioural response by arm ─────────────────────────\n")
cat("\nNeutral pop-up (within-person baseline, pooled across arms):\n")
print(table(d$neutral_code))
cat("\nExperimental pop-up, by arm:\n")
print(table(d$arm, d$exp_code))

cat("\nRecognition — got the experimental wording right:\n")
print(round(tapply(is_true(d$recognition_correct_exp), d$arm, mean), 2))
cat("\n")

# ─────────────────────────────────────────────────────────────────────────────
# 5. Within-person difference scores (experimental − neutral)
# ─────────────────────────────────────────────────────────────────────────────
# THE PRIMARY OUTCOME (PRD §3). Differencing within participant removes every
# stable individual difference — baseline grumpiness, scale-use style, how much
# they like fragrance — which is worth a great deal at N=40.
OUTCOMES <- c(names(SCALES), SINGLE_ITEMS)
for (o in OUTCOMES) {
  n_col <- paste0("neutral_", o); e_col <- paste0("exp_", o)
  if (all(c(n_col, e_col) %in% names(d))) d[[paste0("diff_", o)]] <- d[[e_col]] - d[[n_col]]
}
d$diff_latency_ms <- suppressWarnings(as.numeric(d$exp_latency_ms)) -
                     suppressWarnings(as.numeric(d$neutral_latency_ms))
d$diff_cancelled_taps <- suppressWarnings(as.numeric(d$exp_cancelled_taps)) -
                         suppressWarnings(as.numeric(d$neutral_cancelled_taps))

# ─────────────────────────────────────────────────────────────────────────────
# 6. Effect sizes
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
# 7. Within-person effect of the experimental pop-up, per arm
# ─────────────────────────────────────────────────────────────────────────────
cat("── Within-person: experimental − neutral, by arm ───────\n")
cat("   (paired t-test; dz uses the SD of the differences)\n\n")
cat(sprintf("%-26s %-10s %7s %7s %7s %9s\n",
            "Outcome", "Arm", "M diff", "SD", "dz", "p"))

within_rows <- list()
for (o in OUTCOMES) {
  col <- paste0("diff_", o)
  if (!col %in% names(d)) next
  printed_label <- FALSE
  for (arm in ARMS) {
    v <- d[[col]][d$arm == arm]
    v <- v[!is.na(v)]
    if (length(v) < 3) next
    tt <- tryCatch(t.test(v), error = function(e) NULL)
    dz <- cohen_dz(v)
    cat(sprintf("%-26s %-10s %7.2f %7.2f %7.2f %9.3f\n",
                if (printed_label) "" else SCALE_LABELS[[o]], arm,
                mean(v), sd(v), dz, if (is.null(tt)) NA else tt$p.value))
    printed_label <- TRUE
    within_rows[[length(within_rows) + 1]] <-
      data.frame(outcome = o, arm = arm, n = length(v), mean_diff = mean(v),
                 sd = sd(v), dz = dz,
                 p = if (is.null(tt)) NA else tt$p.value)
  }
  cat("\n")
}
within_df <- do.call(rbind, within_rows)

# ─────────────────────────────────────────────────────────────────────────────
# 8. Between-arm comparison on the difference scores
# ─────────────────────────────────────────────────────────────────────────────
cat("── Between arms, on the difference scores ──────────────\n")
cat("   Primary evidence at N=40 is DIRECTION and EFFECT SIZE.\n")
cat("   p-values are support, not the headline (PRD §11).\n\n")

between_rows <- list()
for (o in OUTCOMES) {
  col <- paste0("diff_", o)
  if (!col %in% names(d)) next
  sub <- d[!is.na(d[[col]]), ]
  if (nrow(sub) < 6 || length(unique(sub$arm)) < 2) next

  cat(sprintf("%s\n", SCALE_LABELS[[o]]))
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
    # eta-squared: between-group SS over total SS.
    eta2 <- aov_fit[["Sum Sq"]][1] / sum(aov_fit[["Sum Sq"]])
    cat(sprintf("   one-way ANOVA: F(%d,%d)=%.2f, p=%.3f, eta2=%.3f\n",
                df1, df2, F_val, p_val, eta2))
  }

  # Pairwise Hedges' g with 95% CI. Uncorrected: with three planned contrasts
  # at N=40, a Bonferroni correction buys nothing but a wider CI you would
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
# 9. The mediation claim, descriptively
# ─────────────────────────────────────────────────────────────────────────────
# Coulter & Pinto (1995): ANGER, not felt guilt, mediates the damage. At N=40 a
# formal mediation model is not credible, so this reports the three
# correlations the argument rests on and lets the write-up be honest about it.
cat("── Anger as the mediator (descriptive only) ────────────\n")
if (all(c("diff_anger", "diff_att_brand", "diff_imi") %in% names(d))) {
  paths <- list(
    "anger diff  ~ brand attitude diff" = c("diff_anger", "diff_att_brand"),
    "anger diff  ~ purchase intention diff" = c("diff_anger", "diff_pi"),
    "guilt diff  ~ brand attitude diff" = c("diff_guilt", "diff_att_brand"),
    "IMI diff    ~ brand attitude diff" = c("diff_imi", "diff_att_brand")
  )
  for (nm in names(paths)) {
    v <- paths[[nm]]
    if (!all(v %in% names(d))) next
    ok <- stats::complete.cases(d[, v])
    if (sum(ok) < 4) next
    r <- cor(d[[v[1]]][ok], d[[v[2]]][ok])
    cat(sprintf("   %-40s r = %6.2f  (n=%d)\n", nm, r, sum(ok)))
  }
  cat("\n   N=40 does not support a formal mediation model. Report these as\n")
  cat("   correlations consistent (or not) with Coulter & Pinto, not as a test.\n\n")
}

# ─────────────────────────────────────────────────────────────────────────────
# 10. Save
# ─────────────────────────────────────────────────────────────────────────────
dir.create("analysis/output", showWarnings = FALSE, recursive = TRUE)
write.csv(d, "analysis/output/scored.csv", row.names = FALSE)
if (!is.null(within_df))  write.csv(within_df,  "analysis/output/within_person.csv", row.names = FALSE)
if (!is.null(between_df)) write.csv(between_df, "analysis/output/between_arms.csv", row.names = FALSE)

cat("── Written ─────────────────────────────────────────────\n")
cat("  analysis/output/scored.csv        one row per participant, scored\n")
cat("  analysis/output/within_person.csv  experimental − neutral, per arm\n")
cat("  analysis/output/between_arms.csv   pairwise Hedges' g with CIs\n\n")
