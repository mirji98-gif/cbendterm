import { useState } from 'react';
import { Screen, PrimaryButton, Heading } from '../components/Screen';
import { CONSENT } from '../data/copy';
import { useSession } from '../machine/SessionContext';

export function Consent(): JSX.Element {
  const { acceptConsent, log } = useSession();
  const [declined, setDeclined] = useState(false);

  if (declined) {
    return (
      <Screen>
        <Heading>Thanks anyway</Heading>
        <p className="text-[15px] text-neutral-600">{CONSENT.declineNote}</p>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <div className="space-y-2">
          <PrimaryButton onClick={acceptConsent}>{CONSENT.accept}</PrimaryButton>
          <button
            type="button"
            onClick={() => {
              log('consent_declined');
              setDeclined(true);
            }}
            className="w-full min-h-[44px] text-[14px] text-neutral-500"
          >
            {CONSENT.decline}
          </button>
        </div>
      }
    >
      <Heading>{CONSENT.title}</Heading>
      <p className="text-[15px] leading-relaxed text-neutral-700 mb-4">{CONSENT.intro}</p>
      <ul className="space-y-2.5 mb-5">
        {CONSENT.bullets.map((b) => (
          <li key={b} className="flex gap-2.5 text-[14px] leading-relaxed text-neutral-700">
            <span aria-hidden="true" className="mt-[7px] w-1 h-1 rounded-full bg-neutral-400 shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-neutral-500 leading-relaxed">{CONSENT.contactNote}</p>
    </Screen>
  );
}
