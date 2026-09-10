/**
 * ROUND-TRIP TEST — PRD §10 step 2, before any storefront UI exists.
 *
 * Proves, against the real generated apps-script/Code.gs:
 *   1. the health check responds
 *   2. assign hands out distinct, sequential slots from the balanced sequence
 *   3. a full participant row POSTs and lands
 *   4. verify confirms it landed
 *   5. a partial checkpoint row is UPSERTED (not duplicated) by the final submit
 *   6. the exported CSV header is byte-identical to the client's column list
 *   7. values survive the trip intact, including commas, quotes and the JSON log
 *   8. stats counts what it should and excludes debug rows
 *
 * Run: npm run roundtrip
 */
import { startServer } from './mock-apps-script.mjs';
import { COLUMN_NAMES } from '../src/data/columns';
import { ASSIGNMENT_SEQUENCE } from '../src/data/sequence';
import { serializeSession } from '../src/net/serialize';
import { fakeSession } from './fake-session';

const PORT = 8799;
const BASE = `http://localhost:${PORT}`;
const KEY = 'test-admin-key';

let failures = 0;
function check(label: string, cond: boolean, detail = ''): void {
  if (cond) {
    console.log(`  \x1b[32m✓\x1b[0m ${label}`);
  } else {
    failures++;
    console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? `\n      ${detail}` : ''}`);
  }
}

async function get(qs: string): Promise<Response> {
  return fetch(`${BASE}/?${qs}`);
}

async function postJson(body: unknown): Promise<{ ok: boolean; created?: boolean; row?: number; error?: string }> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { ok: boolean; created?: boolean; row?: number; error?: string };
}

/** Minimal RFC-4180 parser, enough to verify what we wrote comes back. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function main(): Promise<void> {
  const server = startServer(PORT, KEY);
  await new Promise((r) => setTimeout(r, 120));

  try {
    console.log('\n\x1b[1mApps Script round-trip\x1b[0m (against the real Code.gs)\n');

    // ── 1. health ──────────────────────────────────────────────────────────
    console.log('1. Health check');
    const ping = (await (await get('action=ping')).json()) as {
      ok: boolean; columns: number; slots: number;
    };
    check('responds ok', ping.ok === true);
    check(
      `sheet header has ${COLUMN_NAMES.length} columns`,
      ping.columns === COLUMN_NAMES.length,
      `server says ${ping.columns}, client expects ${COLUMN_NAMES.length}`,
    );
    check(`sequence has ${ASSIGNMENT_SEQUENCE.length} slots`, ping.slots === ASSIGNMENT_SEQUENCE.length);

    // ── 2. assignment ──────────────────────────────────────────────────────
    console.log('\n2. Assignment endpoint');
    const assigns: { ok: boolean; slot: number; arm: string; order: string; pairing: string }[] = [];
    for (let i = 0; i < 3; i++) {
      assigns.push((await (await get('action=assign')).json()) as (typeof assigns)[number]);
    }
    check('all three succeeded', assigns.every((a) => a.ok));
    check(
      'slots are distinct and sequential (0,1,2)',
      assigns.map((a) => a.slot).join(',') === '0,1,2',
      `got ${assigns.map((a) => a.slot).join(',')}`,
    );
    const matchesSequence = assigns.every((a, i) => {
      const s = ASSIGNMENT_SEQUENCE[i]!;
      return a.arm === s.arm && a.order === s.order && a.pairing === s.pairing;
    });
    check('slots match the pre-generated sequence', matchesSequence);

    // ── 3. full row ────────────────────────────────────────────────────────
    console.log('\n3. POST a complete participant row');
    const s1 = fakeSession({
      participantId: 'p-complete-001',
      arm: 'strong', order: 'exp_first', pairing: 'veloure_neutral',
      slot: 0, complete: true,
    });
    const row1 = serializeSession(s1, { status: 'complete', durationS: 402.7 });
    check(
      'serializer emits exactly the canonical columns',
      JSON.stringify(Object.keys(row1)) === JSON.stringify(COLUMN_NAMES),
    );
    const post1 = await postJson(row1);
    check('POST accepted', post1.ok === true, post1.error ?? '');
    check('row was created', post1.created === true);

    // ── 4. verify ──────────────────────────────────────────────────────────
    console.log('\n4. Verify the row landed');
    const v = (await (await get('action=verify&pid=p-complete-001')).json()) as {
      ok: boolean; found: boolean; status: string;
    };
    check('verify finds the participant', v.ok && v.found === true);
    check("status is 'complete'", v.status === 'complete');

    // ── 5. checkpoint upsert ───────────────────────────────────────────────
    console.log('\n5. Checkpoint row is upserted, not duplicated');
    const s2partial = fakeSession({
      participantId: 'p-upsert-002',
      arm: 'mild', order: 'neutral_first', pairing: 'aurevella_neutral',
      slot: 1, complete: false,
    });
    const partialRow = serializeSession(s2partial, { status: 'partial', durationS: 61.2 });
    const postPartial = await postJson(partialRow);
    check('partial checkpoint created', postPartial.ok && postPartial.created === true);
    check("partial row marked abandoned=TRUE", partialRow['abandoned'] === 'TRUE');

    const s2full = fakeSession({
      participantId: 'p-upsert-002',
      arm: 'mild', order: 'neutral_first', pairing: 'aurevella_neutral',
      slot: 1, complete: true,
    });
    const fullRow = serializeSession(s2full, { status: 'complete', durationS: 388.1 });
    const postFull = await postJson(fullRow);
    check('final submit accepted', postFull.ok === true);
    check('final submit UPDATED the existing row', postFull.created === false);
    check('same row number as the checkpoint', postFull.row === postPartial.row);

    // ── 6/7. export ────────────────────────────────────────────────────────
    console.log('\n6. Exported CSV');
    const csvText = await (await get(`action=export&key=${encodeURIComponent(KEY)}`)).text();
    const csv = parseCsv(csvText);
    const header = csv[0]!;
    check(
      'header is byte-identical to the client column list',
      JSON.stringify(header) === JSON.stringify(COLUMN_NAMES),
      `first mismatch: ${COLUMN_NAMES.find((n, i) => header[i] !== n) ?? '(length differs)'}`,
    );
    check('exactly 2 data rows (no duplicate from the upsert)', csv.length - 1 === 2, `got ${csv.length - 1}`);

    console.log('\n7. Values survive the trip');
    const idx = (name: string) => header.indexOf(name);
    const dataRow = csv.find((r) => r[0] === 'p-complete-001');
    if (!dataRow) {
      check('found the completed row in the export', false, 'no row with participant_id p-complete-001');
      throw new Error('export did not contain the completed row');
    }
    check('participant_id round-trips', dataRow[idx('participant_id')] === 'p-complete-001');
    check(
      'open_ended survives comma + embedded quotes',
      dataRow[idx('open_ended')] === s1.endMatter.openEnded,
      `got: ${dataRow[idx('open_ended')]}`,
    );
    check(
      'event_log_json parses back to the same events',
      JSON.parse(dataRow[idx('event_log_json')]!).length === s1.eventLog.length,
    );
    const latency = dataRow[idx('exp_latency_ms')];
    check(
      'exp_latency_ms is present and non-null',
      latency !== '' && latency !== undefined && Number.isFinite(Number(latency)),
      `got: "${latency}"`,
    );
    check(
      'decline label recorded verbatim',
      dataRow[idx('exp_decline_label')] === 'No thanks, I don’t need to save money',
      `got: "${dataRow[idx('exp_decline_label')]}"`,
    );
    check('received_at written server-side', (dataRow[idx('received_at')] ?? '').length > 10);
    check(
      'every reverse-coded column is present',
      ['neutral_imi_6', 'exp_imi_6', 'neutral_attrib_3', 'exp_attrib_3'].every(
        (c) => idx(c) >= 0 && dataRow[idx(c)] !== '',
      ),
    );

    // ── 8. stats + debug exclusion ─────────────────────────────────────────
    console.log('\n8. Stats and debug exclusion');
    const debugSession = fakeSession({
      participantId: 'p-debug-999',
      arm: 'autonomy', order: 'exp_first', pairing: 'aurevella_neutral',
      slot: 2, complete: true, isDebug: true,
    });
    await postJson(serializeSession(debugSession, { status: 'complete', durationS: 120 }));

    const stats = (await (await get(`action=stats&key=${encodeURIComponent(KEY)}`)).json()) as {
      ok: boolean; completed: number; partial: number; cursor: number;
      fallback_assignments: number; arms: Record<string, { completed: number }>;
    };
    check('stats responds', stats.ok === true);
    check('2 completed, debug row excluded', stats.completed === 2, `got ${stats.completed}`);
    check('0 partial (the checkpoint was superseded)', stats.partial === 0, `got ${stats.partial}`);
    check('assignment cursor advanced to 3', stats.cursor === 3, `got ${stats.cursor}`);

    const noKey = (await (await get('action=stats')).json()) as { ok: boolean; error?: string };
    check('stats without the key is refused', noKey.ok === false);
    const wrongKey = (await (await get('action=stats&key=nope')).json()) as { ok: boolean };
    check('stats with the wrong key is refused', wrongKey.ok === false);

    console.log(
      failures === 0
        ? '\n\x1b[32m\x1b[1mRound-trip PASSED\x1b[0m — the Apps Script contract holds end to end.\n'
        : `\n\x1b[31m\x1b[1m${failures} check(s) FAILED\x1b[0m\n`,
    );
  } finally {
    server.close();
  }
  process.exit(failures === 0 ? 0 : 1);
}

main();
