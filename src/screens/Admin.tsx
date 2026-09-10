/**
 * Admin view — reachable at ?admin=1&key=<ADMIN_KEY>.
 *
 * On the same page rather than a route, because the app deliberately has no
 * router (PRD §7). The key check that matters happens in the Apps Script, not
 * here: a client-side gate is theatre, so the server refuses stats and export
 * without the key regardless of what this component renders.
 */
import { useEffect, useState } from 'react';
import { ARM_TARGETS, ARMS } from '../data/conditions';
import { CELL_LABELS } from '../data/sequence';
import { exportCsvUrl, fetchStats, isConfigured, type StatsResponse } from '../net/api';

export function Admin({ adminKey }: { adminKey: string }): JSX.Element {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const tick = async () => {
      const data = await fetchStats(adminKey);
      if (!live) return;
      if (data) { setStats(data); setError(null); }
      else setError('Could not load stats. Check the endpoint URL and the admin key.');
    };
    void tick();
    const id = window.setInterval(tick, 30_000);
    return () => { live = false; window.clearInterval(id); };
  }, [adminKey]);

  if (!isConfigured()) {
    return <Wrap><p className="text-[14px]">No endpoint configured. Set VITE_ENDPOINT_URL or ENDPOINT_URL in src/data/config.ts.</p></Wrap>;
  }
  if (error) return <Wrap><p className="text-[14px] text-red-700">{error}</p></Wrap>;
  if (!stats) return <Wrap><p className="text-[14px] text-neutral-500">Loading…</p></Wrap>;

  const total = Object.values(ARM_TARGETS).reduce((a, b) => a + b, 0);

  return (
    <Wrap>
      <h1 className="text-[18px] font-semibold mb-4">Fieldwork status</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Stat label="Completed" value={`${stats.completed} / ${total}`} />
        <Stat label="Abandoned" value={`${stats.partial} (${Math.round(stats.abandonment_rate * 100)}%)`} />
        <Stat label="Median duration" value={`${Math.round(stats.median_duration_s / 6) / 10} min`} />
        <Stat label="Slots used" value={`${stats.cursor} / ${stats.sequence_length}`} />
      </div>

      {stats.fallback_assignments > 0 && (
        <p className="text-[13px] bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
          <strong>{stats.fallback_assignments}</strong> participant(s) were assigned by client-side
          fallback because the assign endpoint failed. Those are not part of the balanced design —
          report the count as a limitation.
        </p>
      )}

      <h2 className="text-[14px] font-semibold mb-2">Completed per arm</h2>
      <table className="w-full text-[13px] mb-6 tabular-nums">
        <tbody>
          {ARMS.map((arm) => {
            const got = stats.arms[arm]?.completed ?? 0;
            const target = ARM_TARGETS[arm];
            return (
              <tr key={arm} className="border-b border-neutral-150">
                <td className="py-1.5">{arm}</td>
                <td className="py-1.5 text-right">{got} / {target}</td>
                <td className="py-1.5 pl-3 w-1/2">
                  <div className="h-1.5 bg-neutral-200 rounded">
                    <div
                      className={'h-full rounded ' + (got >= target ? 'bg-green-600' : 'bg-neutral-800')}
                      style={{ width: `${Math.min(100, (got / target) * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="text-[14px] font-semibold mb-2">Counterbalance cells (completed)</h2>
      <table className="w-full text-[12px] mb-6 tabular-nums">
        <thead>
          <tr className="text-neutral-500 text-left">
            <th className="font-normal py-1">arm</th>
            {CELL_LABELS.map((c) => (
              <th key={c} className="font-normal py-1 text-right">{c.replace('/', ' · ')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ARMS.map((arm) => (
            <tr key={arm} className="border-t border-neutral-150">
              <td className="py-1.5">{arm}</td>
              {CELL_LABELS.map((c) => {
                const [order, pairing] = c.split('/');
                const cell = stats.cells[`${arm}|${order}|${pairing}`];
                return <td key={c} className="py-1.5 text-right">{cell?.completed ?? 0}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <a
        href={exportCsvUrl(adminKey)}
        className="inline-flex items-center justify-center w-full min-h-[48px] rounded-lg bg-neutral-900 text-white text-[15px] font-medium"
        download="storefront_study.csv"
      >
        Download CSV
      </a>
      <p className="text-[12px] text-neutral-500 mt-2">
        Debug rows are excluded from the counts above but ARE included in the CSV — filter on
        <code className="mx-1 px-1 bg-neutral-100 rounded">is_debug</code>.
      </p>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="min-h-[100dvh] bg-white"><div className="max-w-[560px] mx-auto px-5 py-7">{children}</div></div>;
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <p className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-[17px] font-semibold mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}
