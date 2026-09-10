/**
 * Submitting / Debrief / Rescue.
 *
 * The debrief is the FIRST screen that discloses the study (PRD §9 and
 * non-negotiable #5). It names the deception explicitly rather than softening
 * it: fictitious brands, manipulated decline wording, and what confirmshaming
 * is — plus the CCPA dark-patterns guidelines and a line worth taking away.
 */
import { useState } from 'react';
import { Screen, PrimaryButton, Heading } from '../components/Screen';
import { DEBRIEF, RESCUE, SUBMITTING } from '../data/copy';
import { useSession } from '../machine/SessionContext';
import { serializeSession } from '../net/serialize';

/** Minimal inline formatter for **bold** and *italic* in the debrief copy. */
function Rich({ text }: { text: string }): JSX.Element {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function Submitting(): JSX.Element {
  return (
    <Screen>
      <div className="min-h-[50dvh] flex flex-col items-center justify-center text-center">
        <div
          className="w-6 h-6 rounded-full border-2 border-neutral-300 border-t-neutral-800 animate-spin mb-5"
          role="status"
        />
        <p className="text-[16px] font-medium">{SUBMITTING.title}</p>
        <p className="text-[14px] text-neutral-500 mt-1">{SUBMITTING.body}</p>
      </div>
    </Screen>
  );
}

export function Debrief(): JSX.Element {
  return (
    <Screen>
      <Heading>{DEBRIEF.title}</Heading>
      <div className="space-y-4 mt-4">
        {DEBRIEF.paragraphs.map((p) => (
          <p key={p} className="text-[15px] leading-relaxed text-neutral-700">
            <Rich text={p} />
          </p>
        ))}
      </div>

      <div className="mt-6 rounded-xl bg-neutral-50 border border-neutral-200 p-4">
        <p className="text-[14px] font-semibold mb-1.5">{DEBRIEF.watchFor.title}</p>
        <p className="text-[14px] leading-relaxed text-neutral-700">{DEBRIEF.watchFor.body}</p>
      </div>

      <p className="text-[13px] leading-relaxed text-neutral-600 mt-5">
        <Rich text={DEBRIEF.legal} />
      </p>
      <p className="text-[13px] leading-relaxed text-neutral-600 mt-3">{DEBRIEF.withdrawal}</p>
      <p className="text-[14px] text-neutral-900 mt-6 pb-4">{DEBRIEF.close}</p>
    </Screen>
  );
}

export function Rescue(): JSX.Element {
  const api = useSession();
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const payload = () =>
    JSON.stringify(
      serializeSession(api.session, { status: 'complete', durationS: api.durationS() }),
      null,
      0,
    );

  const copy = async () => {
    const text = payload();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard API is blocked in some Android WebViews. Fall back to a
      // selectable textarea the participant can long-press and copy.
      const el = document.getElementById('rescue-payload') as HTMLTextAreaElement | null;
      if (el) {
        el.select();
        setCopied(document.execCommand('copy'));
      }
    }
    api.log('rescue_copy', { ok: true });
  };

  return (
    <Screen
      footer={
        <div className="space-y-2">
          <PrimaryButton onClick={copy}>{RESCUE.cta}</PrimaryButton>
          <button
            type="button"
            disabled={retrying}
            onClick={() => {
              setRetrying(true);
              api.submit();
            }}
            className="w-full min-h-[44px] text-[14px] text-neutral-500 disabled:opacity-50"
          >
            {RESCUE.retry}
          </button>
        </div>
      }
    >
      <Heading>{RESCUE.title}</Heading>
      <p className="text-[15px] leading-relaxed text-neutral-700">{RESCUE.body}</p>
      {copied && (
        <p className="text-[14px] leading-relaxed text-green-700 mt-4 font-medium">{RESCUE.copied}</p>
      )}
      <textarea
        id="rescue-payload"
        readOnly
        value={payload()}
        className="w-full h-28 mt-5 text-[11px] font-mono rounded-lg border border-neutral-300 p-2 text-neutral-500"
      />
      {api.session.submitError && (
        <p className="text-[12px] text-neutral-400 mt-2">Error: {api.session.submitError}</p>
      )}
    </Screen>
  );
}
