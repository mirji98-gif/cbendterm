/**
 * END-TO-END SMOKE TEST — the PRD's own definition of done.
 *
 * Drives a real participant through the real built app in a real browser, on a
 * phone-sized viewport, against the real generated Code.gs running locally.
 * Then reads the row back out of the sheet and asserts the thing that actually
 * matters: the timing fields are not null.
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
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  try {
    console.log('\n\x1b[1mEnd-to-end participant run\x1b[0m (real build, real Code.gs, Pixel 5)\n');

    console.log('1. Consent and assignment');
    // t5ya -> recruiter 3, arm 'strong' (src/data/groupCodes.ts). Real link
    // format post change_spec_group_codes.md; also makes the arm deterministic
    // for this run instead of whatever a random draw produced.
    await page.goto(`http://localhost:${APP_PORT}/?g=t5ya`, { waitUntil: 'networkidle' });
    check('no progress bar on the consent screen', (await page.locator('.bg-neutral-200.h-1').count()) === 0);
    await page.getByRole('button', { name: /I agree/i }).click();
    await page.getByRole('button', { name: /Start browsing/i }).waitFor({ timeout: 10000 });
    check('assignment resolved and instructions shown', true);

    // Two shopping blocks.
    for (const block of [1, 2]) {
      console.log(`\n${block + 1}. Shopping block ${block}`);
      // Block 1 is entered from the instructions screen; block 2 follows the
      // first questionnaire directly, with no intermediate screen.
      if (block === 1) await page.getByRole('button', { name: /Start browsing/i }).click();

      await page.locator('main button').first().waitFor();
      check('storefront shows product cards', (await page.locator('main button').count()) >= 8);
      check('no progress bar during shopping', (await page.locator('div.h-1.bg-neutral-200').count()) === 0);

      await page.locator('main button').nth(block === 1 ? 0 : 3).click();
      await page.getByRole('button', { name: /Add to bag/i }).click();

      const dialog = page.locator('[role="dialog"]');
      await dialog.waitFor({ timeout: 5000 });
      check('pop-up fired on add-to-bag', await dialog.isVisible());
      check(
        'pop-up headline is the invariant copy',
        (await dialog.locator('#offer-headline').innerText()).includes('15% off'),
      );

      const accept = dialog.locator('[data-control="accept"]');
      const decline = dialog.locator('[data-control="decline"]');
      const [ab, db] = [await accept.boundingBox(), await decline.boundingBox()];
      check('accept and decline have identical tap targets',
        ab.width === db.width && ab.height === db.height,
        `accept ${ab.width}x${ab.height} vs decline ${db.width}x${db.height}`);
      check('tap targets are at least 44px tall', ab.height >= 44, `${ab.height}px`);

      // A deliberate pause, so latency is a real measured interval.
      await page.waitForTimeout(900);
      if (block === 1) await decline.click();
      else await dialog.locator('[data-control="close"]').click();

      await page.getByRole('button', { name: /^Continue$/ }).waitFor();
      await page.waitForTimeout(600);
      await page.getByRole('button', { name: /^Continue$/ }).click();

      console.log(`   questionnaire block ${block}`);
      // v2: one screen per block — 4 rated items + 1 downstream choice (5
      // radiogroups total) + an optional textarea, one Continue.
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
    check('no slot column in the header (removed with the assign endpoint)', header.indexOf('slot') === -1);
    check("recruiter_id decoded from ?g=t5ya (recruiter 3)", get('recruiter_id') === '3');
    check("assignment_source is 'group_code'", get('assignment_source') === 'group_code');
    check("arm is 'strong', deterministically from the code (not random)", get('arm') === 'strong');

    for (const p of ['neutral', 'exp']) {
      const latency = Number(get(`${p}_latency_ms`));
      check(`${p}_latency_ms is non-null and plausible`,
        Number.isFinite(latency) && latency > 500 && latency < 60000, `got "${get(`${p}_latency_ms`)}"`);
      const touch = Number(get(`${p}_time_to_first_touch_ms`));
      check(`${p}_time_to_first_touch_ms is non-null`, Number.isFinite(touch), `got "${get(`${p}_time_to_first_touch_ms`)}"`);
      const gap = Number(get(`${p}_popup_render_gap_ms`));
      check(`${p}_popup_render_gap_ms is non-null and under the 2s exclusion`,
        Number.isFinite(gap) && gap < 2000, `got "${get(`${p}_popup_render_gap_ms`)}"`);
      check(`${p}_post_dismiss_dwell_ms is non-null`, Number.isFinite(Number(get(`${p}_post_dismiss_dwell_ms`))));
      check(`${p}_choice recorded`, get(`${p}_choice`).length > 0, `got "${get(`${p}_choice`)}"`);
      check(`${p}_decline_label recorded verbatim`, get(`${p}_decline_label`).length > 0);
    }

    check('block 1 was resolved by the decline button', get(`${get('order') === 'neutral_first' ? 'neutral' : 'exp'}_choice`) === 'decline_button');
    check('block 2 was resolved by the close X', get(`${get('order') === 'neutral_first' ? 'exp' : 'neutral'}_choice`) === 'close_x');

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
