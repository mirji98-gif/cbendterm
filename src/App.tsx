/**
 * Step → screen mapping. The single place the state machine becomes UI.
 *
 * There is no router: `session.step` is the only source of truth for what is
 * on screen, so a refresh or a back gesture cannot leave the session in a
 * state the machine does not know about (PRD §7).
 *
 * change_spec_v4_final.md Part 2/3: each brand block now shows two pop-ups.
 * 'checkout_N' composes ProductPage + pop-up 1 (as 'popup_N' used to);
 * 'confirm_N' composes the new OrderConfirmation screen + pop-up 2. Both
 * <Popup> elements carry an explicit `key` — without it, React would treat
 * the pop-up 1 → pop-up 2 transition as a prop update of the SAME component
 * instance (same position, same type, in both branches), leaving its
 * internal telemetry refs and `resolved` latch from pop-up 1 in place and
 * silently breaking pop-up 2's own measurement and resolution.
 */
import { SessionProvider, useSession } from './machine/SessionContext';
import { parseUrl } from './machine/urlParams';
import { blockKeyForStep, showProgress, progressFraction } from './machine/steps';
import { ProgressBar } from './components/ProgressBar';
import { DebugOverlay } from './debug/DebugOverlay';

import { Consent } from './screens/Consent';
import { Instructions } from './screens/Instructions';
import { Storefront } from './screens/Storefront';
import { ProductPage } from './screens/ProductPage';
import { Popup } from './screens/Popup';
import { OrderConfirmation } from './screens/OrderConfirmation';
import { Continuation } from './screens/Continuation';
import { QuestionnaireBlock } from './screens/QuestionnaireBlock';
import { Awareness } from './screens/Awareness';
import { Comparative } from './screens/Comparative';
import { Covariates, Demographics } from './screens/EndQuestions';
import { Submitting, Debrief, Rescue } from './screens/Finish';
import { Admin } from './screens/Admin';

function CurrentScreen(): JSX.Element {
  const { session } = useSession();
  const { step } = session;
  const blockKey = blockKeyForStep(session, step);

  switch (step) {
    case 'consent':
      return <Consent />;
    case 'instructions':
      return <Instructions />;

    case 'store_1':
    case 'store_2':
      return <Storefront blockKey={blockKey!} />;

    case 'product_1':
    case 'product_2':
      return <ProductPage blockKey={blockKey!} />;

    // Pop-up 1 renders OVER the product page it interrupted.
    case 'checkout_1':
    case 'checkout_2':
      return (
        <>
          <ProductPage blockKey={blockKey!} />
          <Popup key={`${blockKey}-p1`} blockKey={blockKey!} popup="p1" />
        </>
      );

    // Pop-up 2 renders OVER the order-confirmation screen it interrupts.
    case 'confirm_1':
    case 'confirm_2':
      return (
        <>
          <OrderConfirmation blockKey={blockKey!} />
          <Popup key={`${blockKey}-p2`} blockKey={blockKey!} popup="p2" />
        </>
      );

    case 'continuation_1':
    case 'continuation_2':
      return <Continuation blockKey={blockKey!} />;

    case 'block_1':
    case 'block_2':
      return <QuestionnaireBlock blockKey={blockKey!} />;

    case 'awareness':
      return <Awareness />;
    case 'comparative':
      return <Comparative />;
    case 'covariates':
      return <Covariates />;
    case 'demographics':
      return <Demographics />;

    case 'submitting':
      return <Submitting />;
    case 'debrief':
      return <Debrief />;
    case 'rescue':
      return <Rescue />;
  }
}

function Shell(): JSX.Element {
  const { session, url } = useSession();
  return (
    <>
      {/* Never during the shopping steps — see steps.ts `showProgress`. */}
      {showProgress(session.step) && <ProgressBar fraction={progressFraction(session)} />}
      <CurrentScreen />
      {url.isDebug && <DebugOverlay />}
    </>
  );
}

export function App(): JSX.Element {
  // Read the admin flag before mounting the provider: the admin view must not
  // create a participant session or consume an assignment slot.
  const url = parseUrl();
  if (url.isAdmin) return <Admin adminKey={url.adminKey} />;

  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  );
}
