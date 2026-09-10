/**
 * URL parameter parsing.
 *
 * Recruiter link format:  https://<host>/?r=1        (r = 1..4)
 * Debug:                  ?debug=1&arm=strong&order=exp_first&pairing=veloure_neutral
 * Admin:                  ?admin=1&key=<ADMIN_KEY>
 *
 * Debug flags are inert without ?debug=1 — a participant who happens to have
 * ?arm= in their link gets a normal server assignment.
 */
import { ARMS, BLOCK_ORDERS, BRAND_PAIRINGS, type Arm, type BlockOrder, type BrandPairing } from '../data/conditions';

export interface UrlConfig {
  recruiterId: string;
  isDebug: boolean;
  isAdmin: boolean;
  adminKey: string;
  forced: { arm?: Arm; order?: BlockOrder; pairing?: BrandPairing } | null;
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function parseUrl(search: string = window.location.search): UrlConfig {
  const p = new URLSearchParams(search);
  const isDebug = p.get('debug') === '1';
  const r = p.get('r') ?? '';
  const recruiterId = /^[1-9]\d?$/.test(r) ? r : '';

  const forced = isDebug
    ? {
        ...(oneOf(p.get('arm'), ARMS) ? { arm: oneOf(p.get('arm'), ARMS)! } : {}),
        ...(oneOf(p.get('order'), BLOCK_ORDERS) ? { order: oneOf(p.get('order'), BLOCK_ORDERS)! } : {}),
        ...(oneOf(p.get('pairing'), BRAND_PAIRINGS) ? { pairing: oneOf(p.get('pairing'), BRAND_PAIRINGS)! } : {}),
      }
    : null;

  return {
    recruiterId,
    isDebug,
    isAdmin: p.get('admin') === '1',
    adminKey: p.get('key') ?? '',
    forced: forced && Object.keys(forced).length ? forced : null,
  };
}

/** UUID with a fallback for older Android WebViews / non-secure contexts. */
export function newParticipantId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  const rand = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${rand()}${rand()}-${rand()}-4${rand().slice(1)}-a${rand().slice(1)}-${rand()}${rand()}${rand()}`;
}
