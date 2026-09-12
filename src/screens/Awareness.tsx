/**
 * Awareness check (Instrument_v2.md, screen 10) — asked TWICE, once per
 * brand, at the END of the session.
 *
 * Never immediately after a pop-up: an immediate check on pop-up A would
 * prime the participant for pop-up B and destroy the "Ignore" classification
 * for that brand. At this point it is a fair recognition test and
 * contaminates nothing.
 *
 * The stem interpolates the real brand name and asks about "the decline
 * option" generically — never the literal wording of any condition. All four
 * conditions are offered as options for BOTH questions (plus "don't
 * remember"), so the option set itself never reveals which two the
 * participant actually saw.
 */
import { useMemo } from 'react';
import { Screen, PrimaryButton, Heading } from '../components/Screen';
import { ChoiceList } from '../components/Scale';
import {
  AWARENESS_STEM, AWARENESS_DONT_REMEMBER, awarenessOptions, type AwarenessAnswer,
} from '../data/awareness';
import { BRANDS } from '../data/brands';
import { useSession } from '../machine/SessionContext';
import { blockAtPosition } from '../machine/types';

/** Shuffles the first four options; "don't remember" always stays last. */
function shuffledOptions(seed: string): { value: AwarenessAnswer; label: string }[] {
  const statements = awarenessOptions();
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  for (let i = statements.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [statements[i], statements[j]] = [statements[j]!, statements[i]!];
  }
  return [...statements, { value: 'dont_remember', label: AWARENESS_DONT_REMEMBER }];
}

export function Awareness(): JSX.Element {
  const api = useSession();
  const { session } = api;
  const order = session.assignment!.order;
  const brand1Key = blockAtPosition(order, 1);
  const brand2Key = blockAtPosition(order, 2);

  // Independent shuffles per question, so option position can't become a cue
  // for either brand, but each participant sees a stable order on re-render.
  const options1 = useMemo(
    () => shuffledOptions(`${session.participantId}:aware:1`),
    [session.participantId],
  );
  const options2 = useMemo(
    () => shuffledOptions(`${session.participantId}:aware:2`),
    [session.participantId],
  );

  const answerFor = (position: 1 | 2) =>
    position === 1 ? session.endMatter.awareBrand1Raw : session.endMatter.awareBrand2Raw;

  const setAnswer = (position: 1 | 2, value: string) =>
    api.setEndMatter(
      position === 1
        ? { awareBrand1Raw: value as AwarenessAnswer }
        : { awareBrand2Raw: value as AwarenessAnswer },
    );

  const complete = answerFor(1) !== null && answerFor(2) !== null;

  const brand1 = BRANDS[session.blocks![brand1Key]!.brandId];
  const brand2 = BRANDS[session.blocks![brand2Key]!.brandId];

  return (
    <Screen
      footer={
        <PrimaryButton onClick={() => api.advance()} disabled={!complete}>
          Continue
        </PrimaryButton>
      }
    >
      <Heading>One last thing about those two stores</Heading>

      {[
        { position: 1 as const, brand: brand1, options: options1 },
        { position: 2 as const, brand: brand2, options: options2 },
      ].map(({ position, brand, options }, i) => {
        const [before, after] = AWARENESS_STEM.split('{BRAND}');
        return (
          <section key={position} className={i === 0 ? 'mb-8' : ''}>
            <p className="text-[15px] font-medium mb-3">
              {before}
              <span style={{ color: brand.accent }}>{brand.name}</span>
              {after}
            </p>
            <ChoiceList
              name={`awareness-${position}`}
              options={options}
              value={answerFor(position)}
              onChange={(v) => setAnswer(position, v)}
            />
          </section>
        );
      })}
    </Screen>
  );
}
