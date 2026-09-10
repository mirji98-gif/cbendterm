# GENERATED FILE — do not edit by hand.
# Source: src/data/items.ts via scripts/gen-codebook.ts. Regenerate: npm run gen:codebook
#
# Sourced by analysis_starter.R. Keeping these definitions generated is what
# guarantees the reverse-coding used in analysis matches the instrument that
# was actually administered.

BLOCK_PREFIXES <- c("neutral", "exp")

# Item suffixes that must be flipped (8 - x) before scale scoring.
REVERSE_ITEMS <- c("imi_1", "imi_4", "imi_5", "imi_6", "attrib_3")

# Multi-item scales: mean score + Cronbach's alpha.
SCALES <- list(
  guilt = c("guilt_1", "guilt_2", "guilt_3", "guilt_4"),
  anger = c("anger_1", "anger_2", "anger_3"),
  happy = c("happy_1", "happy_2", "happy_3"),
  att_popup = c("att_popup_1", "att_popup_2", "att_popup_3"),
  att_brand = c("att_brand_1", "att_brand_2", "att_brand_3"),
  trust = c("trust_1", "trust_2", "trust_3"),
  imi = c("imi_1", "imi_2", "imi_3", "imi_4", "imi_5", "imi_6"),
  cred = c("cred_1", "cred_2", "cred_3"),
  attrib = c("attrib_1", "attrib_2", "attrib_3")
)

# Single-item outcomes: reported raw, never averaged together.
SINGLE_ITEMS <- c("pi", "ri", "si")

# Higher scores on these scales are WORSE for the brand. Used only for
# labelling output, never for scoring.
NEGATIVE_SCALES <- c("imi", "attrib", "anger", "guilt")

SCALE_LABELS <- c(
  guilt = "Felt guilt",
  anger = "Felt anger / irritation",
  happy = "Felt happy / amused",
  att_popup = "Attitude toward the pop-up",
  att_brand = "Attitude toward the brand",
  trust = "Brand trust",
  imi = "Perceived manipulative intent",
  cred = "Offer credibility",
  attrib = "Negative brand attribution",
  pi = "Purchase intention",
  ri = "Recommendation intention",
  si = "Switching intention"
)

ARMS <- c("mild", "strong", "autonomy")
ARM_TARGETS <- c(mild = 13, strong = 13, autonomy = 14)

# PRD §11: a pop-up that took longer than this to paint makes that block's
# latency uninterpretable.
RENDER_GAP_EXCLUSION_MS <- 2000
# PRD §5.2: fast dismissal threshold for the provisional "Ignore" code.
IGNORE_LATENCY_MS <- 1500
