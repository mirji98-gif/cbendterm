/**
 * ROUND-TRIP TEST — PRD §10 step 2, before any storefront UI exists.
 *
 * Proves, against the real generated apps-script/Code.gs:
 *   1. the health check responds
 *   2. assign hands out distinct, sequential slots from the balanced sequence
 *      (VESTIGIAL as of change_spec_group_codes.md — the client no longer
 *      calls this endpoint, arm now comes from the recruiting link's group
 *      code. Kept here because the Apps Script itself is unchanged and still
 *      serves it; this proves that claim rather than assuming it.)
 *   3. a full participant row POSTs and lands, with no slot column and no
 *      recruiter_id column (change_spec_v4_final.md drops the recruiter
 *      dimension entirely)
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
      arm: 'strong', order: 'exp_first',
      complete: true,
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
      arm: 'mild', order: 'neutral_first',
      complete: false,
    });
    const partialRow = serializeSession(s2partial, { status: 'incomplete', durationS: 61.2 });
    const postPartial = await postJson(partialRow);
    check('partial checkpoint created', postPartial.ok && postPartial.created === true);
    check("partial row marked abandoned=TRUE", partialRow['abandoned'] === 'TRUE');

    const s2full = fakeSession({
      participantId: 'p-upsert-002',
      arm: 'mild', order: 'neutral_first',
      complete: true,
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
      'c6_open survives comma + embedded quotes',
      dataRow[idx('c6_open')] === s1.endMatter.c6Open,
      `got: ${dataRow[idx('c6_open')]}`,
    );
    check(
      'event_log_json parses back to the same events',
      JSON.parse(dataRow[idx('event_log_json')]!).length === s1.eventLog.length,
    );
    const latency = dataRow[idx('exp_p1_latency_ms')];
    check(
      'exp_p1_latency_ms is present and non-null',
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
      'diff scores and recoded comparative columns are present',
      ['diff_b1_guilt', 'diff_b4_trust', 'c3_recoded', 'c5_recoded', 'aware_exp_correct'].every(
        (c) => idx(c) >= 0 && dataRow[idx(c)] !== '',
      ),
    );

    // change_spec_v4_final.md §9, verification case 9: no slot, no
    // recruiter_id, and the source reflects the group code.
    check('no slot column in the sheet header', idx('slot') === -1, `found at index ${idx('slot')}`);
    check('no recruiter_id column in the sheet header (v4 drops the recruiter dimension)', idx('recruiter_id') === -1, `found at index ${idx('recruiter_id')}`);
    check(
      'assignment_source records group_code',
      dataRow[idx('assignment_source')] === 'group_code',
      `got: "${dataRow[idx('assignment_source')]}"`,
    );
    // change_spec_v4_2: every row must be self-describing.
    check(
      'pairing is the locked constant',
      dataRow[idx('pairing')] === 'locked_aurevella_neutral',
      `got: "${dataRow[idx('pairing')]}"`,
    );
    check(
      'brand_neutral is Aurevella and brand_experimental is Maison Veloure',
      dataRow[idx('brand_neutral')] === 'Aurevella' && dataRow[idx('brand_experimental')] === 'Maison Veloure',
      `got: "${dataRow[idx('brand_neutral')]}" / "${dataRow[idx('brand_experimental')]}"`,
    );
    check(
      'decline_text_neutral is the literal neutral string',
      dataRow[idx('decline_text_neutral')] === 'No thanks',
      `got: "${dataRow[idx('decline_text_neutral')]}"`,
    );
    check(
      "decline_text_experimental is the arm's literal string",
      dataRow[idx('decline_text_experimental')] === 'No thanks, I don’t need to save money',
      `got: "${dataRow[idx('decline_text_experimental')]}"`,
    );
    check('group_code logs the link that produced the row', dataRow[idx('group_code')] === 'p6hd', `got: "${dataRow[idx('group_code')]}"`);
    const positions = ['neutral_p1', 'neutral_p2', 'exp_p1', 'exp_p2'].map((p) => dataRow[idx(`${p}_position`)]);
    check(
      'the four pop-up positions are 1-4 with no duplicates',
      new Set(positions).size === 4 && [...positions].sort().join(',') === '1,2,3,4',
      `got: ${positions.join(',')}`,
    );
    check(
      'each pop-up records its own brand and ask',
      dataRow[idx('neutral_p1_brand')] === 'Aurevella' && dataRow[idx('exp_p1_brand')] === 'Maison Veloure'
        && dataRow[idx('neutral_p1_ask')] === 'email' && dataRow[idx('neutral_p2_ask')] === 'social_follow',
    );
    check(
      'the event log is the last column',
      header[header.length - 1] === 'event_log_json',
      `last column is "${header[header.length - 1]}"`,
    );
    check(
      'exp_p2 accepted -> exp_accepts is 1',
      dataRow[idx('exp_accepts')] === '1',
      `got: "${dataRow[idx('exp_accepts')]}"`,
    );
    check(
      'neutral block had no accepts -> neutral_accepts is 0',
      dataRow[idx('neutral_accepts')] === '0',
      `got: "${dataRow[idx('neutral_accepts')]}"`,
    );

    // ── 8. stats + debug exclusion ─────────────────────────────────────────
    console.log('\n8. Stats and debug exclusion');
    const debugSession = fakeSession({
      participantId: 'p-debug-999',
      arm: 'autonomy', order: 'exp_first',
      complete: true, isDebug: true, assignmentSource: 'debug',
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

    // ── 9. forward compatibility ──────────────────────────────────────────
    // change_spec_v4_2 Part 3 asks for this to be confirmed after a schema
    // change: a client running ahead of a stale pasted Code.gs must not lose
    // the new columns silently. The Apps Script widens the header instead.
    console.log('\n9. Unknown columns are appended, not dropped');
    {
      const s3 = fakeSession({
        participantId: 'p-future-003',
        arm: 'autonomy', order: 'neutral_first',
        complete: true,
      });
      const future = {
        ...serializeSession(s3, { status: 'complete', durationS: 311.0 }),
        a_column_from_the_future: 'kept',
      };
      const post3 = await postJson(future);
      check('POST with an unknown key accepted', post3.ok === true, post3.error ?? '');
      const csv3 = parseCsv(await (await get(`action=export&key=${encodeURIComponent(KEY)}`)).text());
      const head3 = csv3[0]!;
      check('the unknown column was appended to the header', head3.includes('a_column_from_the_future'));
      check(
        'it was appended at the far right, after event_log_json',
        head3[head3.length - 1] === 'a_column_from_the_future',
      );
      const future3 = csv3.find((r) => r[head3.indexOf('participant_id')] === 'p-future-003')!;
      check('its value survived rather than being dropped',
        future3[head3.indexOf('a_column_from_the_future')] === 'kept');
      check('the known columns are unaffected',
        future3[head3.indexOf('pairing')] === 'locked_aurevella_neutral'
        && future3[head3.indexOf('app_version')] === 'test');
    }

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
