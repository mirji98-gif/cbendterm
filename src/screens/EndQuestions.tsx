/**
 * Covariates and demographics (PRD §5.4). Both are simple single-select
 * screens driven by the same component so their option sets live in one place
 * and match the enum values declared in src/data/columns.ts.
 */
import { Screen, PrimaryButton, Heading } from '../components/Screen';
import { ChoiceList } from '../components/Scale';
import { useSession } from '../machine/SessionContext';
import type { EndMatter } from '../machine/types';

interface Question {
  key: keyof EndMatter;
  label: string;
  options: readonly { value: string; label: string }[];
}

const COVARIATES: Question[] = [
  {
    key: 'popupFreq',
    label: 'How often do you see discount pop-ups when shopping online?',
    options: [
      { value: '1', label: 'Never' },
      { value: '2', label: 'Rarely' },
      { value: '3', label: 'Sometimes' },
      { value: '4', label: 'Often' },
      { value: '5', label: 'Very often' },
    ],
  },
  {
    key: 'shoppingFreq',
    label: 'How often do you shop online?',
    options: [
      { value: '1', label: 'Rarely or never' },
      { value: '2', label: 'A few times a year' },
      { value: '3', label: 'About once a month' },
      { value: '4', label: 'A few times a month' },
      { value: '5', label: 'Several times a week' },
    ],
  },
  {
    key: 'dpAwareness',
    // Asked LAST among the covariates and only here, at the very end: the term
    // "dark patterns" is the study's own frame, and asking it any earlier
    // would prime everything after it.
    label: 'Before today, had you come across the term “dark patterns”?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'not_sure', label: 'Not sure' },
    ],
  },
];

const DEMOGRAPHICS: Question[] = [
  {
    key: 'ageBand',
    label: 'Your age',
    options: [
      { value: '18_24', label: '18–24' },
      { value: '25_34', label: '25–34' },
      { value: '35_44', label: '35–44' },
      { value: '45_plus', label: '45 or older' },
      { value: 'prefer_not', label: 'Prefer not to say' },
    ],
  },
  {
    key: 'gender',
    label: 'Your gender',
    options: [
      { value: 'woman', label: 'Woman' },
      { value: 'man', label: 'Man' },
      { value: 'non_binary', label: 'Non-binary' },
      { value: 'prefer_not', label: 'Prefer not to say' },
    ],
  },
  {
    key: 'occupation',
    label: 'Are you currently…',
    options: [
      { value: 'student', label: 'Studying' },
      { value: 'working', label: 'Working' },
      { value: 'both', label: 'Both' },
      { value: 'other', label: 'Neither' },
    ],
  },
];

function QuestionScreen({
  title,
  questions,
  cta,
  onDone,
}: {
  title: string;
  questions: Question[];
  cta: string;
  onDone: () => void;
}): JSX.Element {
  const api = useSession();
  const value = (k: keyof EndMatter) => api.session.endMatter[k] as string | null;
  const complete = questions.every((q) => value(q.key) !== null);

  return (
    <Screen
      footer={
        <PrimaryButton onClick={onDone} disabled={!complete}>
          {cta}
        </PrimaryButton>
      }
    >
      <Heading>{title}</Heading>
      <div className="space-y-8 mt-5">
        {questions.map((q) => (
          <section key={String(q.key)}>
            <p className="text-[15px] leading-snug mb-3">{q.label}</p>
            <ChoiceList
              name={String(q.key)}
              options={q.options}
              value={value(q.key)}
              onChange={(v) => api.setEndMatter({ [q.key]: v } as Partial<EndMatter>)}
            />
          </section>
        ))}
      </div>
    </Screen>
  );
}

export function Covariates(): JSX.Element {
  const api = useSession();
  return (
    <QuestionScreen
      title="A little about how you shop"
      questions={COVARIATES}
      cta="Continue"
      onDone={() => api.advance()}
    />
  );
}

export function Demographics(): JSX.Element {
  const api = useSession();
  return (
    <QuestionScreen
      title="Finally, about you"
      questions={DEMOGRAPHICS}
      cta="Finish"
      onDone={api.submit}
    />
  );
}
