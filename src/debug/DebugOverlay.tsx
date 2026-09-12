/**
 * Live event-log overlay. Inert without ?debug=1 — App.tsx renders it only
 * when the flag is set, and it has no effect on measurement.
 *
 * Anchored to the TOP of the viewport. Every screen's primary action is a
 * bottom-sticky button, and a bottom-anchored overlay swallowed its taps —
 * which made debug mode unusable on the very screens you most want to debug.
 */
import { useState } from 'react';
import { useSession } from '../machine/SessionContext';

export function DebugOverlay(): JSX.Element {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const a = session.assignment;
  const recent = session.eventLog.slice(-14).reverse();

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
      <div className="max-w-[560px] mx-auto p-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="pointer-events-auto text-[10px] font-mono bg-black/85 text-lime-300 px-2 py-1 rounded shadow"
        >
          {a ? `${a.arm}/${a.order}/${a.pairing} · r${session.recruiterId || '—'} · ${a.source}` : 'unassigned'}
          {' · '}{session.step}{open ? ' ▾' : ' ▸'}
        </button>
        {open && (
          <div className="pointer-events-auto mt-1 max-h-[45dvh] overflow-y-auto bg-black/90 text-[10px] font-mono text-neutral-200 rounded p-2 space-y-0.5">
            {session.blocks && (
              <p className="text-amber-300 pb-1">
                neutral: {session.blocks.neutral.choice ?? '—'} @{' '}
                {session.blocks.neutral.latencyMs ?? '—'}ms · exp:{' '}
                {session.blocks.exp.choice ?? '—'} @ {session.blocks.exp.latencyMs ?? '—'}ms
              </p>
            )}
            {recent.map((e, i) => (
              <p key={i} className="whitespace-pre-wrap break-all">
                <span className="text-neutral-500">{e.t.toFixed(0).padStart(7)}</span>{' '}
                <span className="text-lime-300">{e.type}</span>
                {e.block ? <span className="text-sky-300"> [{e.block}]</span> : null}
                {e.payload ? <span className="text-neutral-400"> {JSON.stringify(e.payload)}</span> : null}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
