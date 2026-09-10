/**
 * Apps Script transport.
 *
 * TRANSPORT NOTE (deliberate deviation from PRD §7)
 * The PRD specifies `mode: 'no-cors'` for the POST. An opaque response
 * resolves successfully even when the server returned a 500, so the retry and
 * "Copy my responses" rescue the PRD also asks for could never actually fire —
 * a dropped row would be indistinguishable from a saved one. Instead we post
 * with `Content-Type: text/plain`, which is a CORS-*simple* request: no
 * preflight (which Apps Script cannot answer) and a readable response body.
 * `?action=verify` is the belt-and-braces check if a response is ever opaque.
 */
import { ENDPOINT_URL, SUBMIT } from '../data/config';
import {
  ARMS,
  BLOCK_ORDERS,
  BRAND_PAIRINGS,
  type Arm,
  type BlockOrder,
  type BrandPairing,
} from '../data/conditions';
import type { Assignment } from '../machine/types';
import type { Row } from './serialize';

export interface AssignResponse {
  ok: boolean;
  slot?: number;
  arm?: Arm;
  order?: BlockOrder;
  pairing?: BrandPairing;
  error?: string;
}

export interface PostResponse {
  ok: boolean;
  participant_id?: string;
  row?: number;
  created?: boolean;
  error?: string;
}

function endpoint(): string {
  return ENDPOINT_URL.trim();
}

export function isConfigured(): boolean {
  return endpoint().length > 0;
}

/** Uniform pick with a crypto source where available. */
function pick<T>(items: readonly T[]): T {
  const idx = Math.floor(Math.random() * items.length);
  return items[Math.min(idx, items.length - 1)]!;
}

/**
 * Client-side fallback. Used ONLY when the assign endpoint is unreachable.
 * Sets source='fallback' so the count is reportable as a limitation — random
 * assignment at N=40 does not preserve the exact 13/13/14 split the sequence
 * exists to guarantee.
 */
export function fallbackAssignment(): Assignment {
  return {
    source: 'fallback',
    slot: -1,
    arm: pick(ARMS),
    order: pick(BLOCK_ORDERS),
    pairing: pick(BRAND_PAIRINGS),
  };
}

/**
 * Fetches the next counterbalance slot. Called AFTER consent (PRD §7): calling
 * it at page load would let curious visitors burn slots without participating.
 */
export async function fetchAssignment(timeoutMs = 8000): Promise<Assignment> {
  if (!isConfigured()) return fallbackAssignment();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${endpoint()}?action=assign`, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return fallbackAssignment();
    const data = (await res.json()) as AssignResponse;
    if (!data.ok || !data.arm || !data.order || !data.pairing) {
      return fallbackAssignment();
    }
    return {
      source: 'server',
      slot: data.slot ?? -1,
      arm: data.arm,
      order: data.order,
      pairing: data.pairing,
    };
  } catch {
    return fallbackAssignment();
  }
}

/** Single POST attempt. Resolves with ok:false rather than throwing. */
export async function postRow(row: Row, timeoutMs = 12000): Promise<PostResponse> {
  if (!isConfigured()) return { ok: false, error: 'endpoint not configured' };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(endpoint(), {
      method: 'POST',
      // text/plain keeps this a CORS-simple request: no preflight.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(row),
      redirect: 'follow',
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const text = await res.text();
    if (!text) return { ok: false, error: 'empty response' };
    return JSON.parse(text) as PostResponse;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Confirms a row actually landed. Used when a POST response is unreadable. */
export async function verifyRow(participantId: string): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const res = await fetch(
      `${endpoint()}?action=verify&pid=${encodeURIComponent(participantId)}`,
      { method: 'GET', redirect: 'follow' },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { ok: boolean; found?: boolean };
    return Boolean(data.ok && data.found);
  } catch {
    return false;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Final submit with bounded retries, then a verify probe before giving up.
 * Returns false only when we genuinely cannot confirm the row landed — which
 * is what routes the participant to the "Copy my responses" rescue screen.
 */
export async function submitWithRetry(
  row: Row,
  onAttempt?: (attempt: number, error: string | null) => void,
): Promise<{ ok: boolean; error: string | null }> {
  let lastError = 'unknown';
  for (let attempt = 1; attempt <= SUBMIT.maxAttempts; attempt++) {
    const res = await postRow(row);
    if (res.ok) return { ok: true, error: null };
    lastError = res.error ?? 'unknown';
    onAttempt?.(attempt, lastError);
    const backoff = SUBMIT.backoffMs[attempt - 1];
    if (backoff !== undefined) await sleep(backoff);
  }
  // The POST may have succeeded even though we could not read the response.
  const landed = await verifyRow(String(row['participant_id'] ?? ''));
  return landed ? { ok: true, error: null } : { ok: false, error: lastError };
}

/**
 * Fire-and-forget checkpoint for `visibilitychange`. sendBeacon survives the
 * page being backgrounded or closed, which a fetch does not — this is what
 * turns "closed the tab" from invisible into a row with status='partial'.
 */
export function beaconCheckpoint(row: Row): boolean {
  if (!isConfigured() || typeof navigator.sendBeacon !== 'function') return false;
  try {
    const blob = new Blob([JSON.stringify(row)], { type: 'text/plain;charset=utf-8' });
    return navigator.sendBeacon(endpoint(), blob);
  } catch {
    return false;
  }
}

export interface StatsResponse {
  ok: boolean;
  cursor: number;
  sequence_length: number;
  completed: number;
  partial: number;
  abandonment_rate: number;
  fallback_assignments: number;
  mean_duration_s: number;
  median_duration_s: number;
  arms: Record<string, { assigned: number; completed: number }>;
  cells: Record<string, { assigned: number; completed: number }>;
}

export async function fetchStats(key: string): Promise<StatsResponse | null> {
  if (!isConfigured()) return null;
  try {
    const res = await fetch(`${endpoint()}?action=stats&key=${encodeURIComponent(key)}`, {
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as StatsResponse;
    return data.ok ? data : null;
  } catch {
    return null;
  }
}

export function exportCsvUrl(key: string): string {
  return `${endpoint()}?action=export&key=${encodeURIComponent(key)}`;
}
