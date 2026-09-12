/**
 * END-TO-END SMOKE TEST — the PRD's own definition of done.
 *
 * Drives a real participant through the real built app in a real browser, on a
 * phone-sized viewport, against the real generated Code.gs running locally.
 * Then reads the row back out of the sheet and asserts the thing that actually
 * matters: the timing fields are not null.
 *
 * change_spec_v4_final.md Part 2/3: each store now shows TWO pop-ups — one at
 * checkout (fires on add-to-bag, as before) and one on a new order-confirmation
 * screen that follows it automatically, with no click needed to trigger it.
 *
 * Run: npm run e2e
 */
import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { startServer as startAppsScript } from './mock-apps-script.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, '../dist');
const GS_PORT = 8811;
const APP_PORT = 8812;
const KEY = 'e2e-key';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

function serveDist(port) {
  return createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let file = join(DIST, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!existsSync(file) || !extname(file)) file = join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  }).listen(port);
}

/**
 * Playwright's bundled revision may not match what this image pre-installed,
 * so resolve the binary from PLAYWRIGHT_BROWSERS_PATH rather than pinning a
 * path or triggering a download.
 */
function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  const dir = readdirSync(root)
    .filter((d) => d.startsWith('chromium-'))
    .sort()
    .pop();
  if (!dir) return undefined; // let Playwright resolve it itself
  return join(root, dir, 'chrome-linux', 'chrome');
}

let failures = 0;
function check(label, cond, detail = '') {
  if (cond) console.log(`  \x1b[32m✓\x1b[0m ${label}`);
  else { failures++; console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? `\n      ${detail}` : ''}`); }
}

/**
 * Answers every visible radiogroup, then continues.
 *
 * Deliberately excludes the LAST option in each group: both single-select
 * lists that can produce a legitimate NA recode ('not_sure' in the downstream
 * choice, 'dont_remember' in C1) always place that sentinel last. Avoiding it
 * keeps this happy-path run deterministic about which columns should be
 * populated, without weakening any other assertion — every other radiogroup
 * (rated items, awareness, C2-C5) is fine no matter which option lands.
 */
async function answerGrid(page) {
  const groups = page.locator('[role="radiogroup"]');
  const n = await groups.count();
  for (let i = 0; i < n; i++) {
    const options = groups.nth(i).locator('[role="radio"]');
    const count = await options.count();
    const pickableCount = count > 1 ? count - 1 : count;
    await options.nth(Math.floor(Math.random() * pickableCount)).click();
  }
  const cont = page.getByRole('button', { name: /continue|finish/i });
  await cont.waitFor({ state: 'visible' });
  await cont.click();
}

async function main() {
  if (!existsSync(DIST)) throw new Error('No dist/. Run `npm run build` first.');

  const gs = startAppsScript(GS_PORT, KEY);
  const app = serveDist(APP_PORT);
  const browser = await chromium.launch({ executablePath: findChromium() });
  const context = await browser.newContext({ ...devices['Pixel 5'] });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // The Google Fonts request (change_spec_v4_final.md Part 7: Instrument
    // Sans) is the one deliberate external call in an otherwise offline-safe
    // app — and the only possible source of a bare resource-load failure
    // (Chromium's console message for these omits the URL). font-display:swap
    // means a blocked/unreachable network degrades to the system-ui fallback
    // with no functional break, so this is an anticipated degradation, not an
    // app bug — don't let it fail this check the way a genuine JS error should.
    if (/Failed to load resource/i.test(m.text())) return;
    errors.push(m.text());
  });

  try {
    console.log('\n\x1b[1mEnd-to-end participant run\x1b[0m (real build, real Code.gs, Pixel 5)\n');

    console.log('1. Consent and assignment');
    // p6hd -> arm 'strong' (src/data/groupCodes.ts, change_spec_v4_final.md).
    // Makes the arm deterministic for this run instead of whatever a random
    // draw produced. No recruiter dimension in v4 — three links, one per arm.
    await page.goto(`http://localhost:${APP_PORT}/?g=p6hd`, { waitUntil: 'networkidle' });
    check('no progress bar on the consent screen', (await page.locator('.bg-neutral-200.h-1').count()) === 0);
    await page.getByRole('button', { name: /I agree/i }).click();
    await page.getByRole('button', { name: /Start browsing/i }).waitFor({ timeout: 10000 });
    check('assignment resolved and instructions shown', true);

    // Two shopping blocks, each with TWO pop-ups now.
    // Block 1: p1=decline, p2=accept (tests the "you're now following" line).
    // Block 2: p1=accept (tests the "discount applied" line), p2=close_x.
    const plan = { 1: ['decline', 'accept'], 2: ['accept', 'close'] };

    for (const block of [1, 2]) {
      console.log(`\n${block + 1}. Shopping block ${block}`);
      // Block 1 is entered from the instructions screen; block 2 follows the
      // first questionnaire directly, with no intermediate screen.
      if (block === 1) await page.getByRole('button', { name: /Start browsing/i }).click();

      await page.locator('main button').first().waitFor();
      check('storefront shows product cards', (await page.locator('main button').count()) >= 6);
      check('no progress bar during shopping', (await page.locator('div.h-1.bg-neutral-200').count()) === 0);

      await page.locator('main button').nth(block === 1 ? 0 : 3).click();
      await page.getByRole('button', { name: /Add to bag/i }).click();

      // ── Pop-up 1 (checkout) ────────────────────────────────────────────
      const dialog1 = page.locator('[role="dialog"]');
      await dialog1.waitFor({ timeout: 5000 });
      check(`block ${block} pop-up 1 fired on add-to-bag`, await dialog1.isVisible());
      check(
        'pop-up 1 headline is the invariant copy',
        (await dialog1.locator('#offer-headline').innerText()).includes('15% off this order'),
      );
      const accept1 = dialog1.locator('[data-control="accept"]');
      const decline1 = dialog1.locator('[data-control="decline"]');
      const [ab, db] = [await accept1.boundingBox(), await decline1.boundingBox()];
      check('accept and decline have identical tap targets',
        ab.width === db.width && ab.height === db.height,
        `accept ${ab.width}x${ab.height} vs decline ${db.width}x${db.height}`);
      check('tap targets are at least 44px tall', ab.height >= 44, `${ab.height}px`);

      const [p1Action] = plan[block];
      await page.waitForTimeout(700);
      await dialog1.locator(`[data-control="${p1Action === 'decline' ? 'decline' : 'accept'}"]`).click();

      // ── Order-confirmation screen + pop-up 2 (automatic, no click) ──────
      const dialog2 = page.locator('[role="dialog"]');
      await dialog2.waitFor({ timeout: 5000 });
      check(`block ${block} pop-up 2 fired automatically on order confirmation`, await dialog2.isVisible());
      check(
        'pop-up 2 headline is the invariant copy (different from pop-up 1)',
        (await dialog2.locator('#offer-headline').innerText()).includes('15% off your next order'),
      );
      const bodyDuringPopup2 = await page.locator('body').innerText();
      check('order-confirmation screen is the surface underneath pop-up 2', /Order confirmed/i.test(bodyDuringPopup2));
      if (p1Action === 'accept') {
        check('accepting pop-up 1 shows the discount-applied confirmation, not an email field',
          /applied to this order/i.test(bodyDuringPopup2) && (await page.locator('input').count()) === 0);
      }

      const [, p2Action] = plan[block];
      const control2 = p2Action === 'close' ? 'close' : p2Action === 'accept' ? 'accept' : 'decline';
      await page.waitForTimeout(600);
      await dialog2.locator(`[data-control="${control2}"]`).click();

      // ── Continuation screen ──────────────────────────────────────────────
      await page.getByRole('button', { name: /^Continue$/ }).waitFor();
      if (p2Action === 'accept') {
        const contBody = await page.locator('body').innerText();
        check('accepting pop-up 2 shows the follow-confirmation, not a social-handle field',
          /now following/i.test(contBody) && (await page.locator('input').count()) === 0);
      }
      await page.waitForTimeout(600);
      await page.getByRole('button', { name: /^Continue$/ }).click();

      console.log(`   questionnaire block ${block}`);
      // v2: one screen per BRAND (not per pop-up) — 4 rated items + 1
      // downstream choice (5 radiogroups total) + an optional textarea.
      await page.locator('[role="radiogroup"]').first().waitFor();
      check(`block ${block} has 5 radiogroups (4 rated + downstream choice)`,
        (await page.locator('[role="radiogroup"]').count()) === 5);
      if (block === 1) {
        check('progress bar appears once the questionnaire starts',
          (await page.locator('div.h-1.bg-neutral-200').count()) > 0);
        // Prove the optional open-ended field round-trips when filled.
        await page.locator('textarea').fill('Felt a bit much, but I get why.');
      }
      await answerGrid(page);
    }

    console.log('\n4. Awareness (screen 10)');
    await page.locator('[role="radiogroup"]').first().waitFor();
    check('awareness has exactly 2 radiogroups (one per brand)',
      (await page.locator('[role="radiogroup"]').count()) === 2);
    const awarenessText = await page.locator('body').innerText();
    // The FULL literal decline strings, exactly as conditions.ts defines them
    // — a paraphrase sharing a stray word ("decide later" appears in both the
    // literal autonomy wording and its non-literal description) is fine; only
    // a verbatim quote of the actual button text is the failure this guards.
    const LITERAL_DECLINE_STRINGS = [
      'No thanks, I’ll pay full price',
      'No thanks, I don’t need to save money',
      'Not now — I’ll decide later',
      'No thanks', // the neutral condition's own full wording
    ];
    check(
      'awareness screen never quotes a literal decline wording verbatim',
      LITERAL_DECLINE_STRINGS.every((s) => !awarenessText.includes(s)),
      LITERAL_DECLINE_STRINGS.filter((s) => awarenessText.includes(s)).join(' | '),
    );
    await answerGrid(page);

    console.log('\n5. Comparative block (screen 11)');
    await page.locator('[role="radiogroup"]').first().waitFor();
    check('comparative has 5 radiogroups (C1,C2,C3,C4,C5)',
      (await page.locator('[role="radiogroup"]').count()) === 5);
    // Leave C6 blank, proving the optional field is truly skippable.
    await answerGrid(page);

    await page.locator('[role="radiogroup"]').first().waitFor();
    await answerGrid(page); // covariates
    await page.locator('[role="radiogroup"]').first().waitFor();
    await answerGrid(page); // demographics -> submit

    console.log('\n5. Submission');
    await page.getByText(/what this was actually about/i).waitFor({ timeout: 15000 });
    check('reached the debrief', true);
    const debrief = await page.locator('body').innerText();
    check('debrief discloses the deception', /fictitious|do not exist/i.test(debrief));
    check('debrief names the decline-wording manipulation', /decline button/i.test(debrief));
    check('debrief cites the CCPA dark-patterns guidelines', /Dark Patterns, 2023/i.test(debrief));
    check('debrief states no email or social account was collected',
      /no email address or social media account was ever collected/i.test(debrief));

    console.log('\n6. The row that landed');
    const csv = await (await fetch(`http://localhost:${GS_PORT}/?action=export&key=${KEY}`)).text();
    const lines = csv.split('\r\n').filter(Boolean);
    const header = lines[0].split(',');
    // The final complete row is the last one; checkpoints upsert into it.
    const cells = [];
    {
      const line = lines[lines.length - 1];
      let cur = '', q = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (q) {
          // RFC 4180: a doubled quote inside a quoted field is one literal
          // quote. event_log_json is full of them.
          if (ch === '"') {
            if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
          } else cur += ch;
          continue;
        }
        if (ch === '"') { q = true; continue; }
        if (ch === ',') { cells.push(cur); cur = ''; continue; }
        cur += ch;
      }
      cells.push(cur);
    }
    const get = (n) => cells[header.indexOf(n)];

    check('exactly one row (checkpoints upserted, not duplicated)', lines.length - 1 === 1, `${lines.length - 1} rows`);
    check('status is complete', get('status') === 'complete');
    check('no slot column in the header', header.indexOf('slot') === -1);
    check('no recruiter_id column in the header (v4 drops the recruiter dimension)', header.indexOf('recruiter_id') === -1);
    check("assignment_source is 'group_code'", get('assignment_source') === 'group_code');
    check("arm is 'strong', deterministically from the code (not random)", get('arm') === 'strong');

    // ---- change_spec_v4_2_locked_pairing.md -------------------------------
    // Every row must be readable cold: the design, the literal strings shown,
    // and where each pop-up sat in the session, without consulting the code.
    check('app_version is 4.2.0', get('app_version') === '4.2.0');
    check('group_code logs the raw ?g= value as received', get('group_code') === 'p6hd');
    check("pairing is the locked constant", get('pairing') === 'locked_aurevella_neutral');
    check('brand_neutral is Aurevella (pairing is locked, not drawn)', get('brand_neutral') === 'Aurevella');
    check('brand_experimental is Maison Veloure', get('brand_experimental') === 'Maison Veloure');
    check("decline_text_neutral is the literal 'No thanks'", get('decline_text_neutral') === 'No thanks');
    check('decline_text_experimental is the strong arm\'s literal string',
      get('decline_text_experimental') === 'No thanks, I don\u2019t need to save money',
      `got "${get('decline_text_experimental')}"`);
    check('decline_text_* match the per-block labels written by the pop-up',
      get('decline_text_neutral') === get('neutral_decline_label')
      && get('decline_text_experimental') === get('exp_decline_label'));

    {
      const positions = ['neutral_p1', 'neutral_p2', 'exp_p1', 'exp_p2'].map((c) => get(`${c}_position`));
      check('the four *_position values are 1-4 with no duplicates',
        [...positions].sort().join(',') === '1,2,3,4', `got ${positions.join(',')}`);
      for (const [col, ask] of [['neutral_p1', 'email'], ['neutral_p2', 'social_follow'],
                                ['exp_p1', 'email'], ['exp_p2', 'social_follow']]) {
        check(`${col}_ask is ${ask}`, get(`${col}_ask`) === ask, `got "${get(`${col}_ask`)}"`);
      }
      check('per-pop-up *_brand follows the locked pairing',
        get('neutral_p1_brand') === 'Aurevella' && get('neutral_p2_brand') === 'Aurevella'
        && get('exp_p1_brand') === 'Maison Veloure' && get('exp_p2_brand') === 'Maison Veloure');
    }

    {
      // "No null identifier fields" — a blank in any of these makes the row
      // uninterpretable on its own, which is the whole point of Part 2.
      const IDENTITY = [
        'participant_id', 'app_version', 'status', 'is_debug', 'started_at', 'submitted_at',
        'duration_s', 'device', 'viewport', 'group_code', 'arm', 'assignment_source', 'order',
        'pairing', 'brand_neutral', 'brand_experimental', 'decline_text_neutral',
        'decline_text_experimental',
      ];
      const missing = IDENTITY.filter((c) => header.indexOf(c) === -1);
      check('every identifier column exists in the header', missing.length === 0, `missing: ${missing.join(', ')}`);
      const empty = IDENTITY.filter((c) => !get(c));
      check('no identifier field is null on a complete row', empty.length === 0, `empty: ${empty.join(', ')}`);
    }

    check('event_log_json is the last column', header[header.length - 1] === 'event_log_json');

    for (const p of ['neutral', 'exp']) {
      for (const pop of ['p1', 'p2']) {
        const col = `${p}_${pop}`;
        const latency = Number(get(`${col}_latency_ms`));
        check(`${col}_latency_ms is non-null and plausible`,
          Number.isFinite(latency) && latency > 300 && latency < 60000, `got "${get(`${col}_latency_ms`)}"`);
        const touch = Number(get(`${col}_time_to_first_touch_ms`));
        check(`${col}_time_to_first_touch_ms is non-null`, Number.isFinite(touch), `got "${get(`${col}_time_to_first_touch_ms`)}"`);
        const gap = Number(get(`${col}_popup_render_gap_ms`));
        check(`${col}_popup_render_gap_ms is non-null and under the 2s exclusion`,
          Number.isFinite(gap) && gap < 2000, `got "${get(`${col}_popup_render_gap_ms`)}"`);
        check(`${col}_choice recorded`, get(`${col}_choice`).length > 0, `got "${get(`${col}_choice`)}"`);
        check(`${col}_abandoned is FALSE on a complete row`, get(`${col}_abandoned`) === 'FALSE');
      }
      check(`${p}_decline_label recorded verbatim`, get(`${p}_decline_label`).length > 0);
    }

    // order === 'neutral_first' means block 1 (visited first) is 'neutral';
    // otherwise block 1 is 'exp'. Plan: block 1 = [decline, accept] -> 1 accept;
    // block 2 = [accept, close] -> 1 accept.
    const block1Prefix = get('order') === 'neutral_first' ? 'neutral' : 'exp';
    const block2Prefix = block1Prefix === 'neutral' ? 'exp' : 'neutral';
    check(`${block1Prefix}_p1 was resolved by the decline button`, get(`${block1Prefix}_p1_choice`) === 'decline_button');
    check(`${block1Prefix}_p2 was resolved by accept`, get(`${block1Prefix}_p2_choice`) === 'accept');
    check(`${block2Prefix}_p1 was resolved by accept`, get(`${block2Prefix}_p1_choice`) === 'accept');
    check(`${block2Prefix}_p2 was resolved by the close X`, get(`${block2Prefix}_p2_choice`) === 'close_x');
    check(`${block1Prefix}_accepts is 1 (one of its two pop-ups accepted)`, get(`${block1Prefix}_accepts`) === '1');
    check(`${block2Prefix}_accepts is 1 (one of its two pop-ups accepted)`, get(`${block2Prefix}_accepts`) === '1');
    check('diff_accepts is 0 (both blocks had exactly one accept)', get('diff_accepts') === '0');

    const blanks = header.filter((h) => /_(b1_guilt|b2_irritation|b3_manipulation|b4_trust|b5_raw)$/.test(h) && !get(h));
    check('every rated item and downstream choice has an answer', blanks.length === 0, `blank: ${blanks.slice(0, 5).join(', ')}`);

    check('one block\'s optional open-ended was filled', get('neutral_b6_open').length > 0 || get('exp_b6_open').length > 0);
    check('difference scores are present for every rated item',
      ['diff_b1_guilt', 'diff_b2_irritation', 'diff_b3_manipulation', 'diff_b4_trust', 'diff_b5']
        .every((c) => get(c) !== '' && get(c) !== undefined));

    check('awareness answered for both brands', get('aware_brand1_raw').length > 0 && get('aware_brand2_raw').length > 0);
    check('awareness correctness recorded by condition', get('aware_neutral_correct').length > 0 && get('aware_exp_correct').length > 0);

    check('comparative raw answers present', ['c1_raw', 'c2_raw', 'c3_raw', 'c4_raw', 'c5_raw'].every((c) => get(c) !== ''));
    check('comparative recoded columns present', ['c1_exp_more_manipulative', 'c2_trust_exp_more', 'c3_recoded', 'c4_choose_exp', 'c5_recoded'].every((c) => get(c) !== ''));
    check('comparative c6_open left blank (optional field truly skippable)', get('c6_open') === '');

    const log = JSON.parse(get('event_log_json'));
    check('event log captured the session', log.length > 20, `${log.length} events`);
    check('every event has a timestamp', log.every((e) => typeof e.t === 'number' && Number.isFinite(e.t)));
    check('duration is plausible', Number(get('duration_s')) > 5);

    check('no uncaught page errors', errors.length === 0, errors.slice(0, 3).join(' | '));

    console.log(failures === 0
      ? '\n\x1b[32m\x1b[1mE2E PASSED\x1b[0m — a full participant run lands a row with non-null timing.\n'
      : `\n\x1b[31m\x1b[1m${failures} check(s) FAILED\x1b[0m\n`);
  } finally {
    await browser.close();
    gs.close();
    app.close();
  }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
