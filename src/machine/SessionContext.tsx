/**
 * Session provider: wires the pure reducer to persistence, checkpoint writes,
 * navigation guards and the submit flow.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef,
} from 'react';
import type { ReactNode } from 'react';
import { reducer, initialSession, type Action } from './reducer';
import { load, save, clear, isResumable } from './persist';
import { parseUrl, newParticipantId, type UrlConfig } from './urlParams';
import { makeEvent, now, nowIso, ms } from '../instrumentation/clock';
import { postRow, submitWithRetry, beaconCheckpoint } from '../net/api';
import { serializeSession } from '../net/serialize';
import { lookupGroupCode, randomArm, randomOrderAndPairing } from '../data/groupCodes';
import type { RatedItemId, DownstreamChoice } from '../data/items';
import type { Choice } from '../data/conditions';
import type { Assignment, BlockData, BlockKey, EndMatter, Session, Step } from './types';

/** Bumped for the group-code assignment change (change_spec_group_codes.md). */
const APP_VERSION = '3.0.0';

/**
 * Resolves arm, order, pairing and recruiter for a new session. Pure aside
 * from Math.random — no I/O, no network, so this runs synchronously the
 * moment consent is accepted. Debug overrides (?debug=1&arm=...) take
 * priority over a group code, exactly as before; a group code takes priority
 * over the random fallback; a missing or unrecognised code NEVER falls back
 * to a fixed arm (change_spec_group_codes.md §1) — it draws uniformly at
 * random, same as order and pairing always do.
 */
function resolveAssignment(url: UrlConfig): { assignment: Assignment; recruiterId: string } {
  const { order, pairing } = randomOrderAndPairing();

  if (url.forced) {
    return {
      assignment: {
        source: 'debug',
        arm: url.forced.arm ?? randomArm(),
        order: url.forced.order ?? order,
        pairing: url.forced.pairing ?? pairing,
      },
      recruiterId: '',
    };
  }

  const decoded = lookupGroupCode(url.groupCode);
  if (decoded) {
    return {
      assignment: { source: 'group_code', arm: decoded.arm, order, pairing },
      recruiterId: String(decoded.recruiter),
    };
  }

  return {
    assignment: { source: 'random', arm: randomArm(), order, pairing },
    recruiterId: '',
  };
}

interface SessionApi {
  session: Session;
  url: UrlConfig;
  acceptConsent: () => void;
  advance: (payload?: Record<string, unknown>) => void;
  storeEntered: (block: BlockKey) => void;
  productViewed: (block: BlockKey, sku: string) => void;
  productClosed: () => void;
  addToBag: (block: BlockKey, sku: string, timeOnStoreMs: number) => void;
  popupRendered: (block: BlockKey, renderGapMs: number) => void;
  popupTelemetry: (block: BlockKey, patch: Partial<BlockData>) => void;
  popupResolved: (block: BlockKey, choice: Choice, latencyMs: number | null) => void;
  continuationDone: (block: BlockKey, dwellMs: number, autoAdvanced: boolean) => void;
  rate: (block: BlockKey, itemId: RatedItemId, value: number) => void;
  setDownstreamChoice: (block: BlockKey, value: DownstreamChoice) => void;
  setBlockOpenEnded: (block: BlockKey, value: string) => void;
  setEndMatter: (patch: Partial<EndMatter>) => void;
  submit: () => void;
  log: (type: string, payload?: Record<string, unknown>, block?: BlockKey) => void;
  /** Elapsed seconds from the monotonic clock, never wall clock. */
  durationS: () => number;
}

const Ctx = createContext<SessionApi | null>(null);

export function useSession(): SessionApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

function bootstrap(url: UrlConfig): { session: Session; restoredFrom: Step | null } {
  const existing = load();
  if (existing && isResumable(existing)) {
    return { session: existing, restoredFrom: existing.step };
  }
  if (existing) clear();
  return {
    session: initialSession({
      participantId: newParticipantId(),
      isDebug: url.isDebug,
      startedAtIso: nowIso(),
      startedAtPerf: now(),
      device: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      dpr: window.devicePixelRatio || 1,
      touch: navigator.maxTouchPoints > 0 || 'ontouchstart' in window,
      appVersion: APP_VERSION,
    }),
    restoredFrom: null,
  };
}

export function SessionProvider({ children }: { children: ReactNode }): JSX.Element {
  const url = useMemo(() => parseUrl(), []);
  const boot = useRef<{ session: Session; restoredFrom: Step | null } | null>(null);
  if (boot.current === null) boot.current = bootstrap(url);

  const [session, dispatch] = useReducer(reducer, boot.current.session);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // ── Announce a restore once, so the reducer can invalidate any timing that
  // a reload made unmeasurable.
  const announcedRestore = useRef(false);
  useEffect(() => {
    const from = boot.current?.restoredFrom;
    if (!from || announcedRestore.current) return;
    announcedRestore.current = true;
    dispatch({
      type: 'restored',
      step: from,
      event: makeEvent('session_restored', { step: from }),
    });
  }, []);

  // ── Mirror every change to localStorage (PRD §7 Resilience).
  useEffect(() => {
    save(session);
  }, [session]);

  const durationS = useCallback(
    () => ms(now() - sessionRef.current.meta.startedAtPerf) / 1000,
    [],
  );

  const send = useCallback((action: Action) => dispatch(action), []);

  // ── Checkpoint writes.
  // A closed tab sends nothing, so without these `abandoned` would be FALSE
  // for 100% of the data. Three natural checkpoints: assignment secured, block
  // one complete, block two complete.
  const checkpointed = useRef(new Set<Step>());
  useEffect(() => {
    const CHECKPOINTS: Step[] = ['instructions', 'store_2', 'awareness'];
    if (!CHECKPOINTS.includes(session.step)) return;
    if (checkpointed.current.has(session.step)) return;
    checkpointed.current.add(session.step);
    const row = serializeSession(sessionRef.current, {
      status: 'partial',
      durationS: durationS(),
    });
    void postRow(row);
  }, [session.step, durationS]);

  // ── Beacon on background/close, so a mid-session drop still leaves a row.
  useEffect(() => {
    const onHide = () => {
      const s = sessionRef.current;
      if (s.step === 'debrief' || s.step === 'rescue' || s.step === 'consent') return;
      if (document.visibilityState !== 'hidden') return;
      beaconCheckpoint(
        serializeSession(s, { status: 'partial', durationS: durationS() }),
      );
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [durationS]);

  // ── Back-navigation guard. The questionnaire is forward-only (PRD §2.2);
  // a back gesture must not step behind a measurement that has been taken.
  useEffect(() => {
    history.pushState({ guard: true }, '');
    const onPop = () => {
      const s = sessionRef.current;
      send({ type: 'log', event: makeEvent('back_blocked', { step: s.step }) });
      history.pushState({ guard: true }, '');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [send]);

  // ── Submit.
  const submitting = useRef(false);
  const submit = useCallback(() => {
    if (submitting.current) return;
    submitting.current = true;
    send({ type: 'submit_started', submittedAtIso: nowIso(), event: makeEvent('submit_started') });

    void (async () => {
      // Read AFTER the dispatch above has flushed submitted_at into state.
      await Promise.resolve();
      const s = sessionRef.current;
      const row = serializeSession(
        { ...s, meta: { ...s.meta, submittedAtIso: s.meta.submittedAtIso ?? nowIso() } },
        { status: 'complete', durationS: durationS() },
      );
      const result = await submitWithRetry(row, (attempt, error) => {
        send({ type: 'log', event: makeEvent('submit_attempt_failed', { attempt, error }) });
      });
      submitting.current = false;
      if (result.ok) {
        send({ type: 'submit_succeeded', event: makeEvent('submit_succeeded') });
      } else {
        send({
          type: 'submit_failed',
          error: result.error ?? 'unknown',
          event: makeEvent('submit_failed', { error: result.error }),
        });
      }
    })();
  }, [send, durationS]);

  const api = useMemo<SessionApi>(
    () => ({
      session,
      url,
      durationS,
      acceptConsent: () => {
        const { assignment, recruiterId } = resolveAssignment(url);
        // Log the DECODED arm and recruiter, never the raw ?g= code — the
        // code is the one thing that must never reach the data or the UI.
        send({
          type: 'consent_accepted',
          assignment,
          recruiterId,
          event: makeEvent('consent_accepted', { ...assignment, recruiter_id: recruiterId }),
        });
      },
      advance: (payload) => send({ type: 'advance', event: makeEvent('advance', payload) }),
      storeEntered: (block) =>
        send({ type: 'store_entered', block, at: now(), event: makeEvent('store_entered', {}, block) }),
      productViewed: (block, sku) =>
        send({ type: 'product_viewed', block, sku, event: makeEvent('product_viewed', { sku }, block) }),
      productClosed: () => send({ type: 'product_closed', event: makeEvent('product_closed') }),
      addToBag: (block, sku, timeOnStoreMs) =>
        send({
          type: 'add_to_bag', block, sku, timeOnStoreMs,
          event: makeEvent('add_to_bag', { sku, time_on_store_ms: ms(timeOnStoreMs) }, block),
        }),
      popupRendered: (block, renderGapMs) =>
        send({
          type: 'popup_rendered', block, renderGapMs,
          event: makeEvent('popup_rendered', { render_gap_ms: ms(renderGapMs) }, block),
        }),
      popupTelemetry: (block, patch) => send({ type: 'popup_telemetry', block, patch }),
      popupResolved: (block, choice, latencyMs) =>
        send({
          type: 'popup_resolved', block, choice, latencyMs,
          event: makeEvent('popup_resolved', { choice, latency_ms: latencyMs === null ? null : ms(latencyMs) }, block),
        }),
      continuationDone: (block, dwellMs, autoAdvanced) =>
        send({
          type: 'continuation_done', block, dwellMs, autoAdvanced,
          event: makeEvent('continuation_done', { dwell_ms: ms(dwellMs), auto: autoAdvanced }, block),
        }),
      rate: (block, itemId, value) =>
        send({ type: 'rate', block, itemId, value, event: makeEvent('rate', { item: itemId, value }, block) }),
      setDownstreamChoice: (block, value) =>
        send({
          type: 'downstream_choice', block, value,
          event: makeEvent('downstream_choice', { value }, block),
        }),
      setBlockOpenEnded: (block, value) => send({ type: 'block_open_ended', block, value }),
      setEndMatter: (patch) =>
        send({ type: 'end_matter', patch, event: makeEvent('end_matter', { keys: Object.keys(patch) }) }),
      submit,
      log: (type, payload, block) => send({ type: 'log', event: makeEvent(type, payload, block) }),
    }),
    [session, url, send, submit, durationS],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
