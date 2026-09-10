/**
 * localStorage mirror.
 *
 * Every state change is mirrored so a refresh, a backgrounded tab, or Android
 * killing the WebView cannot lose a session. Restoring is deliberately
 * conservative: see `reducer`'s 'restored' action, which invalidates timing
 * for a block that was interrupted mid-measurement rather than re-measuring it.
 */
import { STORAGE_KEY } from '../data/config';
import { SCHEMA_VERSION } from './reducer';
import type { Session } from './types';

export function save(session: Session): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Private mode / quota. The session continues in memory; the checkpoint
    // POSTs are the real durability guarantee, not this.
  }
}

export function load(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    // A schema change makes an old session unmergeable; starting fresh is
    // safer than restoring a shape the reducer no longer understands.
    if (parsed.schema !== SCHEMA_VERSION) return null;
    if (!parsed.participantId || !parsed.step) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clear(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to do */
  }
}

/** Sessions that have already finished should not be resumed into. */
export function isResumable(session: Session): boolean {
  return session.step !== 'debrief' && session.step !== 'rescue';
}
