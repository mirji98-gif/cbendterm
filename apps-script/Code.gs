/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Confirmshaming Storefront Study — Google Apps Script Web App
 *  GENERATED FILE. Edit scripts/apps-script.template.gs, then `npm run gen`.
 *  100 columns · 52 assignment slots · sequence seed 20260910
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Deployment: see README.md → "Deploy the Apps Script". In short:
 *   Extensions → Apps Script, paste this file, set ADMIN_KEY below,
 *   Deploy → New deployment → Web app → Execute as: Me → Access: Anyone.
 *
 * ENDPOINTS
 *   GET  ?action=ping                    health check
 *   GET  ?action=assign                  next counterbalance slot (locked)
 *   GET  ?action=verify&pid=...          did this participant's row land?
 *   GET  ?action=stats&key=...           live cell counts for the admin view
 *   GET  ?action=export&key=...          full CSV
 *   POST (text/plain JSON body)          upsert a participant row
 *
 * WHY text/plain AND NOT no-cors
 * The PRD specifies mode:'no-cors'. An opaque response resolves successfully
 * even on a 500, so retry-then-rescue logic can never fire and a dropped row
 * looks identical to a saved one. Posting with Content-Type: text/plain is a
 * CORS-*simple* request (no preflight, which Apps Script cannot answer), and
 * the response body is readable — so the client can actually tell whether the
 * write succeeded. At N=40 one silently lost participant is 2.5% of the sample.
 */

// ── CONFIGURATION ──────────────────────────────────────────────────────────

/** Change this before deploying. Guards ?action=stats and ?action=export. */
var ADMIN_KEY = 'CHANGE_ME_BEFORE_DEPLOYING';

var SHEET_RESPONSES = 'Responses';
var SHEET_LOG = 'AssignLog';
var PROP_CURSOR = 'assign_cursor';
var LOCK_TIMEOUT_MS = 15000;

// ── GENERATED: canonical column order (matches src/data/columns.ts) ────────
var COLUMNS = [
  'participant_id',
  'recruiter_id',
  'status',
  'is_debug',
  'app_version',
  'assignment_source',
  'slot',
  'arm',
  'order',
  'pairing',
  'brand_neutral',
  'brand_experimental',
  'started_at',
  'submitted_at',
  'received_at',
  'duration_s',
  'device',
  'viewport',
  'dpr',
  'touch',
  'abandoned',
  'abandoned_at_step',
  'resumed_after_reload',
  'neutral_condition',
  'neutral_brand',
  'neutral_block_position',
  'neutral_decline_label',
  'neutral_choice',
  'neutral_response_code',
  'neutral_latency_ms',
  'neutral_time_to_first_touch_ms',
  'neutral_cancelled_taps',
  'neutral_pointer_cancels',
  'neutral_press_dwell_ms',
  'neutral_post_dismiss_dwell_ms',
  'neutral_continuation_auto_advanced',
  'neutral_scroll_events',
  'neutral_rage_taps',
  'neutral_popup_render_gap_ms',
  'neutral_product_viewed',
  'neutral_time_on_store_ms',
  'neutral_b1_guilt',
  'neutral_b2_irritation',
  'neutral_b3_manipulation',
  'neutral_b4_trust',
  'neutral_b5_raw',
  'neutral_b5_ord',
  'neutral_b6_open',
  'exp_condition',
  'exp_brand',
  'exp_block_position',
  'exp_decline_label',
  'exp_choice',
  'exp_response_code',
  'exp_latency_ms',
  'exp_time_to_first_touch_ms',
  'exp_cancelled_taps',
  'exp_pointer_cancels',
  'exp_press_dwell_ms',
  'exp_post_dismiss_dwell_ms',
  'exp_continuation_auto_advanced',
  'exp_scroll_events',
  'exp_rage_taps',
  'exp_popup_render_gap_ms',
  'exp_product_viewed',
  'exp_time_on_store_ms',
  'exp_b1_guilt',
  'exp_b2_irritation',
  'exp_b3_manipulation',
  'exp_b4_trust',
  'exp_b5_raw',
  'exp_b5_ord',
  'exp_b6_open',
  'diff_b1_guilt',
  'diff_b2_irritation',
  'diff_b3_manipulation',
  'diff_b4_trust',
  'diff_b5',
  'aware_brand1_raw',
  'aware_brand2_raw',
  'aware_neutral_correct',
  'aware_exp_correct',
  'c1_raw',
  'c2_raw',
  'c3_raw',
  'c4_raw',
  'c5_raw',
  'c6_open',
  'c1_exp_more_manipulative',
  'c2_trust_exp_more',
  'c3_recoded',
  'c4_choose_exp',
  'c5_recoded',
  'popup_freq',
  'dp_awareness',
  'shopping_freq',
  'age_band',
  'gender',
  'occupation',
  'event_log_json'
];

// ── GENERATED: balanced assignment sequence [arm, order, pairing] ──────────
// Slots 0-39 are the N=40 design (arms exactly 13/13/14, marginal
// counterbalance cells exactly 10/10/10/10). Slots 40+ are insurance against
// participants who consent and then drop, which permanently burns a slot.
var SEQUENCE = [
  ['autonomy','neutral_first','veloure_neutral'],
  ['autonomy','neutral_first','veloure_neutral'],
  ['strong','neutral_first','veloure_neutral'],
  ['mild','neutral_first','veloure_neutral'],
  ['mild','exp_first','veloure_neutral'],
  ['autonomy','exp_first','aurevella_neutral'],
  ['autonomy','exp_first','veloure_neutral'],
  ['mild','exp_first','aurevella_neutral'],
  ['autonomy','exp_first','aurevella_neutral'],
  ['mild','neutral_first','veloure_neutral'],
  ['strong','neutral_first','veloure_neutral'],
  ['autonomy','exp_first','aurevella_neutral'],
  ['autonomy','exp_first','aurevella_neutral'],
  ['autonomy','neutral_first','aurevella_neutral'],
  ['strong','exp_first','veloure_neutral'],
  ['strong','neutral_first','veloure_neutral'],
  ['mild','exp_first','veloure_neutral'],
  ['mild','neutral_first','aurevella_neutral'],
  ['mild','neutral_first','veloure_neutral'],
  ['autonomy','exp_first','veloure_neutral'],
  ['mild','exp_first','aurevella_neutral'],
  ['strong','exp_first','aurevella_neutral'],
  ['mild','exp_first','aurevella_neutral'],
  ['strong','neutral_first','aurevella_neutral'],
  ['mild','neutral_first','aurevella_neutral'],
  ['mild','neutral_first','aurevella_neutral'],
  ['autonomy','neutral_first','aurevella_neutral'],
  ['autonomy','exp_first','veloure_neutral'],
  ['autonomy','neutral_first','aurevella_neutral'],
  ['strong','exp_first','aurevella_neutral'],
  ['strong','exp_first','veloure_neutral'],
  ['autonomy','neutral_first','veloure_neutral'],
  ['autonomy','exp_first','veloure_neutral'],
  ['strong','neutral_first','aurevella_neutral'],
  ['strong','neutral_first','veloure_neutral'],
  ['mild','neutral_first','aurevella_neutral'],
  ['strong','neutral_first','aurevella_neutral'],
  ['strong','exp_first','veloure_neutral'],
  ['strong','exp_first','aurevella_neutral'],
  ['mild','exp_first','veloure_neutral'],
  ['autonomy','exp_first','aurevella_neutral'],
  ['strong','exp_first','veloure_neutral'],
  ['strong','neutral_first','veloure_neutral'],
  ['mild','exp_first','veloure_neutral'],
  ['autonomy','neutral_first','veloure_neutral'],
  ['strong','exp_first','aurevella_neutral'],
  ['autonomy','exp_first','veloure_neutral'],
  ['mild','neutral_first','veloure_neutral'],
  ['autonomy','neutral_first','aurevella_neutral'],
  ['mild','exp_first','aurevella_neutral'],
  ['strong','neutral_first','aurevella_neutral'],
  ['mild','neutral_first','aurevella_neutral']
];

// ── ENTRY POINTS ───────────────────────────────────────────────────────────

function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'ping';
  try {
    switch (action) {
      case 'ping':
        return json_({ ok: true, columns: COLUMNS.length, slots: SEQUENCE.length });
      case 'assign':
        return json_(assign_());
      case 'verify':
        return json_(verify_(p.pid));
      case 'stats':
        requireKey_(p);
        return json_(stats_());
      case 'export':
        requireKey_(p);
        return csv_(exportCsv_());
      default:
        return json_({ ok: false, error: 'unknown action: ' + action });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: 'empty body' });
    }
    var payload = JSON.parse(e.postData.contents);
    if (!payload.participant_id) {
      return json_({ ok: false, error: 'participant_id is required' });
    }
    var result = upsert_(payload);
    return json_({ ok: true, participant_id: payload.participant_id, row: result.row, created: result.created });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// ── ASSIGNMENT ─────────────────────────────────────────────────────────────

/**
 * Hands out the next slot in the pre-generated sequence and increments the
 * cursor, under a script lock.
 *
 * The lock is not optional: two participants tapping "I agree" in the same
 * second would otherwise read the same cursor value and receive the same slot,
 * silently breaking the balance the sequence exists to guarantee.
 *
 * Slots are consumed at consent, but balance is only meaningful over COMPLETED
 * sessions, so a participant who drops out burns a slot. ?action=stats reports
 * assigned vs completed per cell — watch the gap and use the insurance slots.
 */
function assign_() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    return { ok: false, error: 'busy' };
  }
  try {
    var props = PropertiesService.getScriptProperties();
    var cursor = parseInt(props.getProperty(PROP_CURSOR) || '0', 10);
    if (cursor >= SEQUENCE.length) {
      return { ok: false, error: 'sequence exhausted', slot: -1 };
    }
    var s = SEQUENCE[cursor];
    props.setProperty(PROP_CURSOR, String(cursor + 1));

    // Append-only audit of every slot handed out, so an assign that never
    // produced a row is visible even though the response row was never written.
    var log = sheet_(SHEET_LOG, ['issued_at', 'slot', 'arm', 'order', 'pairing']);
    log.appendRow([new Date().toISOString(), cursor, s[0], s[1], s[2]]);

    return { ok: true, slot: cursor, arm: s[0], order: s[1], pairing: s[2] };
  } finally {
    lock.releaseLock();
  }
}

// ── ROW UPSERT ─────────────────────────────────────────────────────────────

/**
 * Writes a participant row, replacing any existing row with the same
 * participant_id.
 *
 * Upsert (rather than append) is what makes checkpointing possible: the client
 * posts a partial row after consent and after each block, and the final submit
 * overwrites it. A participant who closes the tab therefore leaves a row with
 * status='partial' — which is the only way abandonment is observable at all,
 * since a closed tab sends nothing.
 */
function upsert_(payload) {
  var lock = LockService.getScriptLock();
  lock.waitLock(LOCK_TIMEOUT_MS);
  try {
    var sh = sheet_(SHEET_RESPONSES, COLUMNS);
    var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];

    // Safety net: if the client ever sends a key the generated header does not
    // know about, add a column rather than dropping the value on the floor.
    var unknown = [];
    for (var key in payload) {
      if (payload.hasOwnProperty(key) && header.indexOf(key) === -1) unknown.push(key);
    }
    if (unknown.length) {
      sh.insertColumnsAfter(header.length, unknown.length);
      sh.getRange(1, header.length + 1, 1, unknown.length).setValues([unknown]);
      header = header.concat(unknown);
    }

    payload.received_at = new Date().toISOString();

    var row = [];
    for (var i = 0; i < header.length; i++) {
      var v = payload[header[i]];
      row.push(v === undefined || v === null ? '' : v);
    }

    var existing = findRowByParticipant_(sh, payload.participant_id);
    if (existing > 0) {
      sh.getRange(existing, 1, 1, row.length).setValues([row]);
      return { row: existing, created: false };
    }
    sh.appendRow(row);
    return { row: sh.getLastRow(), created: true };
  } finally {
    lock.releaseLock();
  }
}

function findRowByParticipant_(sh, pid) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(pid)) return i + 2;
  }
  return -1;
}

function verify_(pid) {
  if (!pid) return { ok: false, error: 'pid required' };
  var sh = sheet_(SHEET_RESPONSES, COLUMNS);
  var row = findRowByParticipant_(sh, pid);
  if (row < 0) return { ok: true, found: false };
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var values = sh.getRange(row, 1, 1, header.length).getValues()[0];
  var statusIdx = header.indexOf('status');
  return { ok: true, found: true, row: row, status: statusIdx >= 0 ? values[statusIdx] : '' };
}

// ── ADMIN ──────────────────────────────────────────────────────────────────

/**
 * Live counts per counterbalance cell, split by assigned vs completed. This is
 * how you know on day 3 whether you will actually hit 13/13/14.
 */
function stats_() {
  var sh = sheet_(SHEET_RESPONSES, COLUMNS);
  var last = sh.getLastRow();
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var idx = {};
  for (var i = 0; i < header.length; i++) idx[header[i]] = i;

  var cells = {};
  var arms = {};
  var completed = 0;
  var partial = 0;
  var fallback = 0;
  var durations = [];

  if (last >= 2) {
    var rows = sh.getRange(2, 1, last - 1, header.length).getValues();
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      if (String(row[idx['is_debug']]).toUpperCase() === 'TRUE') continue;
      var status = String(row[idx['status']]);
      var arm = String(row[idx['arm']]);
      var key = arm + '|' + row[idx['order']] + '|' + row[idx['pairing']];
      if (!cells[key]) cells[key] = { assigned: 0, completed: 0 };
      cells[key].assigned++;
      if (!arms[arm]) arms[arm] = { assigned: 0, completed: 0 };
      arms[arm].assigned++;
      if (status === 'complete') {
        completed++;
        cells[key].completed++;
        arms[arm].completed++;
        var d = parseFloat(row[idx['duration_s']]);
        if (!isNaN(d)) durations.push(d);
      } else {
        partial++;
      }
      if (String(row[idx['assignment_source']]) === 'fallback') fallback++;
    }
  }

  durations.sort(function (a, b) { return a - b; });
  var mean = 0;
  for (var k = 0; k < durations.length; k++) mean += durations[k];
  mean = durations.length ? mean / durations.length : 0;

  var props = PropertiesService.getScriptProperties();
  return {
    ok: true,
    cursor: parseInt(props.getProperty(PROP_CURSOR) || '0', 10),
    sequence_length: SEQUENCE.length,
    completed: completed,
    partial: partial,
    abandonment_rate: completed + partial ? partial / (completed + partial) : 0,
    fallback_assignments: fallback,
    mean_duration_s: Math.round(mean * 10) / 10,
    median_duration_s: durations.length ? durations[Math.floor(durations.length / 2)] : 0,
    arms: arms,
    cells: cells
  };
}

function exportCsv_() {
  var sh = sheet_(SHEET_RESPONSES, COLUMNS);
  var last = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  var values = sh.getRange(1, 1, Math.max(last, 1), lastCol).getValues();
  var out = [];
  for (var r = 0; r < values.length; r++) {
    var cells = [];
    for (var c = 0; c < values[r].length; c++) {
      cells.push(csvCell_(values[r][c]));
    }
    out.push(cells.join(','));
  }
  return out.join('\r\n');
}

function csvCell_(v) {
  var s = v === null || v === undefined ? '' : String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function requireKey_(p) {
  if (ADMIN_KEY === 'CHANGE_ME_BEFORE_DEPLOYING') {
    throw new Error('ADMIN_KEY has not been set in Code.gs');
  }
  if (!p.key || p.key !== ADMIN_KEY) throw new Error('forbidden');
}

// ── HELPERS ────────────────────────────────────────────────────────────────

function sheet_(name, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, header.length).setValues([header]);
    sh.setFrozenRows(1);
  } else if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, header.length).setValues([header]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function csv_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.CSV);
}

// ── MAINTENANCE ────────────────────────────────────────────────────────────

/**
 * Run from the Apps Script editor to reset the assignment cursor to 0.
 * Use after piloting, before real data collection begins.
 */
function resetAssignmentCursor() {
  PropertiesService.getScriptProperties().setProperty(PROP_CURSOR, '0');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = ss.getSheetByName(SHEET_LOG);
  if (log) log.clear();
  Logger.log('Assignment cursor reset to 0.');
}

/** Run from the editor to delete every row where is_debug is TRUE. */
function deleteDebugRows() {
  var sh = sheet_(SHEET_RESPONSES, COLUMNS);
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var col = header.indexOf('is_debug') + 1;
  if (col < 1) return;
  var last = sh.getLastRow();
  var removed = 0;
  for (var r = last; r >= 2; r--) {
    if (String(sh.getRange(r, col).getValue()).toUpperCase() === 'TRUE') {
      sh.deleteRow(r);
      removed++;
    }
  }
  Logger.log('Deleted ' + removed + ' debug rows.');
}
