import { useEffect, useState } from 'react';
import { Screen, PrimaryButton, Heading } from '../components/Screen';
import { OPEN_ENDED } from '../data/copy';
import { TIMING } from '../data/config';
import { useSession } from '../machine/SessionContext';

export function OpenEnded(): JSX.Element {
  const api = useSession();
  const [text, setText] = useState(api.session.endMatter.openEnded);
  const [canSkip, setCanSkip] = useState(false);

  // Skippable after 10s (PRD §5.4). Forcing free text on a phone is the single
  // biggest drop-out risk in the instrument.
  useEffect(() => {
    const id = window.setTimeout(() => setCanSkip(true), TIMING.openEndedSkipAfterMs);
    return () => window.clearTimeout(id);
  }, []);

  const longEnough = text.trim().length >= TIMING.openEndedMinChars;

  return (
    <Screen
      footer={
        <div className="space-y-2">
          <PrimaryButton
            onClick={() => {
              api.setEndMatter({ openEnded: text.trim(), openEndedSkipped: false });
              api.advance();
            }}
            disabled={!longEnough}
          >
            Continue
          </PrimaryButton>
          {canSkip && !longEnough && (
            <button
              type="button"
              onClick={() => {
                api.setEndMatter({ openEnded: '', openEndedSkipped: true });
                api.advance();
              }}
              className="w-full min-h-[44px] text-[14px] text-neutral-500"
            >
              {OPEN_ENDED.skip}
            </button>
          )}
        </div>
      }
    >
      <Heading>{OPEN_ENDED.title}</Heading>
      <p className="text-[15px] leading-relaxed text-neutral-700 mb-4">{OPEN_ENDED.stem}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={OPEN_ENDED.placeholder}
        rows={5}
        className="w-full rounded-lg border border-neutral-300 p-3 text-[15px] leading-relaxed
                   focus:outline-none focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-400"
      />
    </Screen>
  );
}
