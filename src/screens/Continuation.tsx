/**
 * Continuation screen — measures post-dismissal dwell for pop-up 2 only
 * (change_spec_v4_final.md Part 2/3: pop-up 1's "dwell" is the automatic,
 * un-timed transition to the order-confirmation screen, which has no
 * continuation screen of its own).
 *
 * The button is live from t=0 (no artificial floor) and the screen
 * auto-advances at 8s. PRD §4 says "6s or until action", which is ambiguous
 * between a floor and a ceiling — and the two produce completely different
 * dwell distributions. `continuation_auto_advanced` records which happened, so
 * ceiling-censored values are flaggable rather than indistinguishable from a
 * genuine 8-second dwell.
 */
import { useEffect, useRef } from 'react';
import { Screen, PrimaryButton, Heading } from '../components/Screen';
import { CONTINUATION, FOLLOW_CONFIRMED } from '../data/copy';
import { TIMING } from '../data/config';
import { now } from '../instrumentation/clock';
import { useSession } from '../machine/SessionContext';
import type { BlockKey } from '../machine/types';

export function Continuation({ blockKey }: { blockKey: BlockKey }): JSX.Element {
  const api = useSession();
  const block = api.session.blocks![blockKey]!;
  const shownAt = useRef(now());
  const done = useRef(false);

  const finish = (auto: boolean) => {
    if (done.current) return;
    done.current = true;
    api.continuationDone(blockKey, now() - shownAt.current, auto);
  };

  useEffect(() => {
    const id = window.setTimeout(() => finish(true), TIMING.continuationAutoAdvanceMs);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen footer={<PrimaryButton onClick={() => finish(false)}>{CONTINUATION.cta}</PrimaryButton>}>
      <div className="pt-10">
        <Heading>{CONTINUATION.title}</Heading>
        <p className="text-[15px] text-neutral-600 leading-relaxed">{CONTINUATION.body}</p>
        {block.p2.choice === 'accept' && (
          <p className="text-[14px] text-neutral-900 font-medium leading-relaxed mt-3">
            {FOLLOW_CONFIRMED}
          </p>
        )}
      </div>
    </Screen>
  );
}
