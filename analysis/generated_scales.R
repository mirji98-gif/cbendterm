# GENERATED FILE — do not edit by hand.
# Source: src/data/items.ts via scripts/gen-codebook.ts. Regenerate: npm run gen:codebook
#
# Sourced by analysis_starter.R. Keeping these definitions generated is what
# guarantees the column list and the ordinal mapping used in analysis matches
# the instrument that was actually administered.

BLOCK_PREFIXES <- c("neutral", "exp")

# Instrument v2: single-item measures. No reverse-coding — none of the four
# rated items are worded opposite to their construct.
RATED_ITEMS <- c("b1_guilt", "b2_irritation", "b3_manipulation", "b4_trust")

RATED_ITEM_LABELS <- c(
  b1_guilt = "I felt guilty about declining the offer.",
  b2_irritation = "I felt irritated by the way this offer was presented.",
  b3_manipulation = "The way this offer was presented was intended to pressure me into accepting it.",
  b4_trust = "I would trust this brand."
)

# B5 downstream choice: ordinal mapping (not_sure = NA).
DOWNSTREAM_ORDINAL <- c(
  buy = 3,
  compare = 2,
  competitor = 1,
  avoid = 0,
  not_sure = NA
)

ARMS <- c("mild", "strong", "autonomy")
ARM_TARGETS <- c(mild = 13, strong = 13, autonomy = 14)

# PRD §11: a pop-up that took longer than this to paint makes that block's
# latency uninterpretable.
RENDER_GAP_EXCLUSION_MS <- 2000
# PRD §5.2: fast dismissal threshold for the provisional "Ignore" code.
IGNORE_LATENCY_MS <- 1500
