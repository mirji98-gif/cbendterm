/**
 * Generates apps-script/Code.gs from the canonical column contract and the
 * pre-generated assignment sequence.
 *
 * Run: npm run gen:appsscript
 *
 * The sheet header and the client's row builder are then provably the same
 * list, in the same order, because both come from src/data/columns.ts.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLUMN_NAMES } from '../src/data/columns';
import { ASSIGNMENT_SEQUENCE, SEQUENCE_SEED } from '../src/data/sequence';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = resolve(HERE, 'apps-script.template.gs');
const OUT = resolve(HERE, '../apps-script/Code.gs');

const columns = COLUMN_NAMES.map((n) => `  '${n}'`).join(',\n');

const sequence = ASSIGNMENT_SEQUENCE.map(
  (s) => `  ['${s.arm}','${s.order}','${s.pairing}']`,
).join(',\n');

const template = readFileSync(TEMPLATE, 'utf8');
const out = template
  .replace('/*__COLUMNS__*/', `\n${columns}\n`)
  .replace('/*__SEQUENCE__*/', `\n${sequence}\n`)
  .replace(/__SEQUENCE_SEED__/g, String(SEQUENCE_SEED))
  .replace(/__COLUMN_COUNT__/g, String(COLUMN_NAMES.length))
  .replace(/__SLOT_COUNT__/g, String(ASSIGNMENT_SEQUENCE.length));

writeFileSync(OUT, out);
console.log(
  `Wrote apps-script/Code.gs — ${COLUMN_NAMES.length} columns, ${ASSIGNMENT_SEQUENCE.length} slots`,
);
