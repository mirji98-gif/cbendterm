/**
 * Retrospective recognition check (PRD §4, screen 10).
 *
 * Asked at the END, never immediately after a pop-up: an immediate check on
 * the first pop-up would prime the participant for the second and destroy the
 * "Ignore" classification for that brand. Recognition is a fair test of
 * whether the wording registered and can be asked retrospectively without
 * contaminating anything.
 *
 * All four wordings are offered for both brands, plus "I don't remember", so
 * the question does not reveal which two the participant actually saw.
 */
import { useMemo } from 'react';
import { Screen, PrimaryButton, Heading } from '../components/Screen';
import { ChoiceList } from '../components/Scale';
import { DECLINE_COPY, type PopupCondition } from '../data/conditions';
import { BRANDS } from '../data/brands';
import { RECOGNITION } from '../data/copy';
import { useSession } from '../machine/SessionContext';
import { blockAtPosition } from '../machine/types';

export function Recognition(): JSX.Element {
  const api = useSession();
  const { session } = api;
  const order = session.assignment!.order;
  const first = blockAtPosition(order, 1);
  const second = blockAtPosition(order, 2);

  // Option order is shuffled once per participant so position in the list
  // cannot become a cue, but is identical for both questions so the two are
  // directly comparable.
  const options = useMemo(() => {
    const entries = (Object.keys(DECLINE_COPY) as PopupCondition[]).map((k) => ({
      value: k,
      label: `“${DECLINE_COPY[k]}”`,
    }));
    let h = 0;
    for (const c of session.participantId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    for (let i = entries.length - 1; i > 0; i--) {
      h = (h * 1103515245 + 12345) >>> 0;
      const j = h % (i + 1);
      [entries[i], entries[j]] = [entries[j]!, entries[i]!];
    }
    return [...entries, { value: 'dont_remember', label: RECOGNITION.dontRemember }];
  }, [session.participantId]);

  const answerFor = (key: 'neutral' | 'exp') =>
    key === 'neutral' ? session.endMatter.recognitionNeutral : session.endMatter.recognitionExp;

  const setAnswer = (key: 'neutral' | 'exp', value: string) =>
    api.setEndMatter(key === 'neutral' ? { recognitionNeutral: value } : { recognitionExp: value });

  const complete = answerFor('neutral') !== null && answerFor('exp') !== null;

  return (
    <Screen
      footer={
        <PrimaryButton onClick={() => api.advance()} disabled={!complete}>
          Continue
        </PrimaryButton>
      }
    >
      <Heading>{RECOGNITION.title}</Heading>
      <p className="text-[14px] leading-relaxed text-neutral-600 mb-6">{RECOGNITION.stem}</p>

      {[first, second].map((key, i) => (
        <section key={key} className={i === 0 ? 'mb-8' : ''}>
          <p className="text-[15px] font-medium mb-3">
            At <span style={{ color: BRANDS[session.blocks![key]!.brandId].accent }}>
              {BRANDS[session.blocks![key]!.brandId].name}
            </span>
            , the other option said…
          </p>
          <ChoiceList
            name={`recognition-${key}`}
            options={options}
            value={answerFor(key)}
            onChange={(v) => setAnswer(key, v)}
          />
        </section>
      ))}
    </Screen>
  );
}
