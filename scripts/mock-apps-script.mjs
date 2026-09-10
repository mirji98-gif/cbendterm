/**
 * Local mock of the Google Apps Script Web App.
 *
 * This does NOT reimplement the server. It loads the real, generated
 * apps-script/Code.gs into a VM with stub implementations of the Apps Script
 * globals (SpreadsheetApp, PropertiesService, LockService, ContentService) and
 * serves its doGet/doPost over HTTP. So the round-trip test exercises the exact
 * file you paste into the Apps Script editor, against the exact column
 * contract the client serializes to.
 *
 * Run: npm run mock:server   (listens on 8788, or PORT)
 */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const CODE_PATH = resolve(HERE, '../apps-script/Code.gs');
const PORT = Number(process.env.PORT || 8788);

// ── Apps Script stubs ──────────────────────────────────────────────────────

class FakeRange {
  constructor(sheet, row, col, numRows, numCols) {
    Object.assign(this, { sheet, row, col, numRows, numCols });
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const src = this.sheet.data[this.row - 1 + r] || [];
      const line = [];
      for (let c = 0; c < this.numCols; c++) {
        const v = src[this.col - 1 + c];
        line.push(v === undefined ? '' : v);
      }
      out.push(line);
    }
    return out;
  }
  getValue() {
    return this.getValues()[0][0];
  }
  setValues(values) {
    this.sheet._grow(this.row + this.numRows - 1, this.col + this.numCols - 1);
    for (let r = 0; r < values.length; r++) {
      for (let c = 0; c < values[r].length; c++) {
        this.sheet.data[this.row - 1 + r][this.col - 1 + c] = values[r][c];
      }
    }
    return this;
  }
  setValue(v) {
    return this.setValues([[v]]);
  }
}

class FakeSheet {
  constructor(name) {
    this.name = name;
    this.data = [];
  }
  _grow(rows, cols) {
    while (this.data.length < rows) this.data.push([]);
    for (const row of this.data) while (row.length < cols) row.push('');
  }
  getLastRow() {
    return this.data.length;
  }
  getLastColumn() {
    return this.data.reduce((m, r) => Math.max(m, r.length), 0);
  }
  getRange(row, col, numRows = 1, numCols = 1) {
    return new FakeRange(this, row, col, numRows, numCols);
  }
  appendRow(values) {
    this.data.push(values.slice());
    this._grow(this.data.length, values.length);
  }
  insertColumnsAfter(afterCol, howMany) {
    for (const row of this.data) {
      const pad = new Array(howMany).fill('');
      while (row.length < afterCol) row.push('');
      row.splice(afterCol, 0, ...pad);
    }
  }
  deleteRow(r) {
    this.data.splice(r - 1, 1);
  }
  clear() {
    this.data = [];
  }
  setFrozenRows() {}
}

class FakeSpreadsheet {
  constructor() {
    this.sheets = new Map();
  }
  getSheetByName(name) {
    return this.sheets.get(name) || null;
  }
  insertSheet(name) {
    const s = new FakeSheet(name);
    this.sheets.set(name, s);
    return s;
  }
}

export function createContext() {
  const spreadsheet = new FakeSpreadsheet();
  const props = new Map();

  const sandbox = {
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (props.has(k) ? props.get(k) : null),
        setProperty: (k, v) => props.set(k, String(v)),
      }),
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => true,
        waitLock: () => true,
        releaseLock: () => {},
      }),
    },
    ContentService: {
      MimeType: { JSON: 'application/json', CSV: 'text/csv' },
      createTextOutput: (text) => ({
        _text: text,
        _mime: 'text/plain',
        setMimeType(m) {
          this._mime = m;
          return this;
        },
        getContent() {
          return this._text;
        },
        getMimeType() {
          return this._mime;
        },
      }),
    },
    Logger: { log: (...a) => console.log('[gs]', ...a) },
    console,
    JSON,
    Date,
    Math,
    String,
    Number,
    parseInt,
    parseFloat,
    isNaN,
    Error,
    Array,
    Object,
    RegExp,
  };

  vm.createContext(sandbox);
  vm.runInContext(readFileSync(CODE_PATH, 'utf8'), sandbox, { filename: 'Code.gs' });
  return { sandbox, spreadsheet, props };
}

// ── HTTP shim ──────────────────────────────────────────────────────────────

function corsHeaders(mime) {
  return {
    'Content-Type': mime,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

export function startServer(port = PORT, adminKey = null) {
  const { sandbox } = createContext();
  // Lets the round-trip test exercise the key-guarded endpoints without
  // weakening the placeholder guard that protects a real deployment.
  if (adminKey) sandbox.ADMIN_KEY = adminKey;

  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const parameter = Object.fromEntries(url.searchParams.entries());

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders('text/plain'));
      return res.end();
    }

    if (req.method === 'GET') {
      const out = sandbox.doGet({ parameter });
      res.writeHead(200, corsHeaders(out.getMimeType()));
      return res.end(out.getContent());
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const out = sandbox.doPost({ parameter, postData: { contents: body } });
        res.writeHead(200, corsHeaders(out.getMimeType()));
        res.end(out.getContent());
      });
      return;
    }

    res.writeHead(405, corsHeaders('text/plain'));
    res.end('method not allowed');
  });

  server.listen(port);
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
  console.log(`Mock Apps Script listening on http://localhost:${PORT}`);
  console.log('  GET  /?action=ping');
  console.log('  GET  /?action=assign');
  console.log('  POST / with a text/plain JSON body');
}
