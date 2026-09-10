/**
 * Step → screen mapping. The single place the state machine becomes UI.
 *
 * There is no router: `session.step` is the only source of truth for what is
 * on screen, so a refresh or a back gesture cannot leave the session in a
 * state the machine does not know about (PRD §7).
 */
import { SessionProvider, useSession } from './machine/SessionContext';
import { parseUrl } from './machine/urlParams';
import { blockKeyForStep, showProgress, progressFraction } from './machine/steps';
import { ProgressBar } from './components/ProgressBar';
import { DebugOverlay } from './debug/DebugOverlay';

import { Consent } from './screens/Consent';
import { Assigning } from './screens/Assigning';
import { Instructions } from './screens/Instructions';
import { Storefront } from './screens/Storefront';
import { ProductPage } from './screens/ProductPage';
import { Popup } from './screens/Popup';
import { Continuation } from './screens/Continuation';
import { QuestionnaireBlock } from './screens/QuestionnaireBlock';
import { Recognition } from './screens/Recognition';
import { OpenEnded } from './screens/OpenEnded';
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
    case 'assigning':
      return <Assigning />;
    case 'instructions':
      return <Instructions />;

    case 'store_1':
    case 'store_2':
      return <Storefront blockKey={blockKey!} />;

    case 'product_1':
    case 'product_2':
      return <ProductPage blockKey={blockKey!} />;

    // The pop-up renders OVER the product page it interrupted, which is what
    // makes it read as a real interruption rather than a new screen.
    case 'popup_1':
    case 'popup_2':
      return (
        <>
          <ProductPage blockKey={blockKey!} />
          <Popup blockKey={blockKey!} />
        </>
      );

    case 'continuation_1':
    case 'continuation_2':
      return <Continuation blockKey={blockKey!} />;

    case 'block_1':
    case 'block_2':
      return <QuestionnaireBlock blockKey={blockKey!} />;

    case 'recognition':
      return <Recognition />;
    case 'open_ended':
      return <OpenEnded />;
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
