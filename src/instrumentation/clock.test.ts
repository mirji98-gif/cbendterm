/**
 * ENFORCEMENT TEST for non-negotiable #4 ("timing fields being null is a data
 * loss bug"). Timing must come from one place, so it cannot silently diverge:
 * a component reading Date.now() would produce durations that jump when the
 * phone syncs its clock, and the corruption would be invisible in the CSV.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Strips comments AND string literals before scanning. The rule is about
 * CODE: explanatory comments in popupTelemetry.ts and the codebook prose
 * stored as description strings in columns.ts both legitimately mention
 * performance.now() while calling nothing.
 */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
}

const SRC = join(process.cwd(), 'src');
const CLOCK = join(SRC, 'instrumentation', 'clock.ts');

describe('the clock is the only timer', () => {
  it('no source file outside clock.ts calls performance.now()', () => {
    const offenders = sourceFiles(SRC)
      .filter((f) => f !== CLOCK)
      .filter((f) => /\bperformance\s*\.\s*now\s*\(/.test(codeOnly(readFileSync(f, 'utf8'))))
      .map((f) => f.replace(SRC, 'src'));
    expect(offenders, 'import { now } from instrumentation/clock instead').toEqual([]);
  });

  it('no source file outside clock.ts calls Date.now()', () => {
    const offenders = sourceFiles(SRC)
      .filter((f) => f !== CLOCK)
      .filter((f) => /\bDate\s*\.\s*now\s*\(/.test(codeOnly(readFileSync(f, 'utf8'))))
      .map((f) => f.replace(SRC, 'src'));
    expect(
      offenders,
      'Date.now() is wall clock and jumps. Use now() for durations, nowIso() for timestamps.',
    ).toEqual([]);
  });
});
