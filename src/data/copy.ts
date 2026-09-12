/**
 * Participant-facing prose for the non-storefront screens.
 *
 * NOTHING here may hint that this is a study before the debrief screen
 * (non-negotiable #5). The consent screen is the one exception — it must be
 * honest about participation — and it is deliberately vague about the topic,
 * which is standard practice for a design that requires temporary deception
 * and is disclosed in full at the end.
 */

/**
 * Stated duration on the consent screen.
 *
 * Instrument v2 cuts the rated-item load from 72 (v1) to 8 (4 rated items ×
 * 2 blocks) plus one downstream-choice question per block, two awareness
 * questions, five comparative questions, three covariates and three
 * demographics — call it ~23 items total, versus v1's ~80. Combined with the
 * storefront and pop-ups, the PRD's original 6-minute estimate is realistic
 * again. Confirm against actual pilot times and adjust if it drifts.
 */
export const STATED_DURATION = 'about 6 minutes';

export const CONSENT = {
  title: 'Before you start',
  intro:
    'This is a short research activity run by a student group at an Indian business school. ' +
    'You will browse two online stores and then answer some questions about them.',
  bullets: [
    `It takes ${STATED_DURATION}, and works best on your phone.`,
    'Taking part is entirely voluntary.',
    'Your responses are anonymous. We do not collect your name, email, phone number or any other personal detail.',
    'Results are reported only in aggregate, as part of a course project.',
    'You can withdraw at any time by simply closing this tab. Nothing is submitted until the final screen.',
  ],
  contactNote:
    'If you have any questions about this activity, ask the person who shared the link with you.',
  accept: 'I agree — start',
  decline: 'No thanks',
  declineNote: 'You can close this tab at any time.',
};

export const INSTRUCTIONS = {
  title: 'A quick browse',
  // The cover task. Gives a genuine reason to be there, makes the pop-up an
  // actual interruption, and makes abandonment meaningful (PRD §4).
  body:
    'You are trying out a couple of new online stores. ' +
    'Have a look around each one, pick one item you would genuinely consider buying, and add it to your bag.',
  hint: 'There are no right answers — just browse the way you normally would.',
  cta: 'Start browsing',
};

export const CONTINUATION = {
  title: 'Thanks for looking around.',
  body: 'You can carry on whenever you are ready.',
  cta: 'Continue',
};

export const BLOCK_INTRO = {
  title: 'A few questions',
  body: 'Now some quick questions about the store you just visited. There are no right answers.',
  cta: 'Continue',
};

export const SUBMITTING = {
  title: 'Saving your responses…',
  body: 'This takes a moment. Please keep this tab open.',
};

export const RESCUE = {
  title: 'We could not save your responses',
  body:
    'Your answers are safe on this device but did not reach us — most likely a network problem. ' +
    'Please tap the button below to copy them, then send the copied text to whoever shared this link with you.',
  cta: 'Copy my responses',
  copied: 'Copied. Please paste it into a message to the person who shared this link.',
  retry: 'Try sending again',
};

/**
 * DEBRIEF — the first and only screen that discloses the study (PRD §9).
 * Deception is named explicitly rather than softened.
 */
export const DEBRIEF = {
  title: 'Thank you — here is what this was actually about',
  paragraphs: [
    'This was a study about a design tactic called **confirmshaming**: wording the "no" option on a pop-up so that declining feels like admitting something unflattering about yourself.',
    'Both stores were fictitious. **Aurevella** and **Maison Veloure** do not exist, the products are illustrations, and nothing was ever for sale. No order was placed and no payment details were collected at any point.',
    'The two pop-ups you saw were identical in every respect — same offer, same headline, same buttons, same layout — **except for the wording of the decline button**. One store showed a plain "No thanks". The other showed a version worded to make declining feel like a small confession. Which wording you saw was assigned at random.',
    'We measured how you responded — which option you chose, and how long you took — along with your answers to the questions afterwards. That is the whole study.',
  ],
  watchFor: {
    title: 'One thing worth taking away',
    body:
      'If a "no" option ever seems written to make you feel small — "No thanks, I like paying full price", ' +
      '"No, I don\'t care about my future" — that wording is a deliberate design choice, not an accident. ' +
      'Noticing it is usually enough to take the sting out of it.',
  },
  legal:
    'In India this kind of wording is named as a dark pattern under the Central Consumer Protection Authority’s ' +
    '*Guidelines for Prevention and Regulation of Dark Patterns, 2023*, which lists "confirm shaming" among the ' +
    'practices it prohibits.',
  withdrawal:
    'If, now that you know what the study was about, you would rather your responses were not used, tell the person ' +
    'who shared this link and they will be removed.',
  close: 'You can close this tab now. Thank you for your time.',
};

/**
 * v2 replaces the v1 recognition check with an awareness check (see
 * src/data/awareness.ts and src/screens/Awareness.tsx). The stem and options
 * live there, since they interpolate the real brand name and must be built
 * per participant (option order is shuffled).
 */
