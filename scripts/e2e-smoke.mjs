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

/** Answers every visible 7-point row, then continues. */
async function answerGrid(page) {
  const groups = page.locator('[role="radiogroup"]');
  const n = await groups.count();
  for (let i = 0; i < n; i++) {
    const options = groups.nth(i).locator('[role="radio"]');
    const count = await options.count();
    await options.nth(Math.floor(Math.random() * count)).click();
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
    await page.goto(`http://localhost:${APP_PORT}/?r=3`, { waitUntil: 'networkidle' });
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
      for (let section = 0; section < 5; section++) {
        await page.locator('[role="radiogroup"]').first().waitFor();
        if (section === 0) {
          check('progress bar appears once the questionnaire starts',
            (await page.locator('div.h-1.bg-neutral-200').count()) > 0);
        }
        await answerGrid(page);
      }
    }

    console.log('\n4. End matter');
    await page.locator('[role="radiogroup"]').first().waitFor();
    await answerGrid(page); // recognition

    await page.locator('textarea').waitFor();
    await page.locator('textarea').fill('The second one felt pushy, so I closed it, honestly.');
    await page.getByRole('button', { name: /^Continue$/ }).click();

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
    check('recruiter_id captured from ?r=3', get('recruiter_id') === '3');
    check('assignment came from the server', get('assignment_source') === 'server');
    check('arm recorded', ['mild', 'strong', 'autonomy'].includes(get('arm')));

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

    const blanks = header.filter((h) => /_(guilt|anger|happy|imi|attrib|cred|trust|att_)\w*$/.test(h) && !get(h));
    check('every questionnaire item has an answer', blanks.length === 0, `blank: ${blanks.slice(0, 5).join(', ')}`);

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
